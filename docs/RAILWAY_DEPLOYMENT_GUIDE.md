# Railway Deployment Guide for league-api

This guide provides step-by-step instructions for deploying the league-api application to Railway using Docker containers with continuous deployment from GitHub.

**Last Updated**: December 2025  
**Railway Documentation Reference**: [docs.railway.app](https://docs.railway.app)

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Domain Setup](#domain-setup)
4. [Infrastructure Setup](#infrastructure-setup)
5. [Docker Configuration](#docker-configuration)
6. [Railway Project Setup](#railway-project-setup)
7. [Environment Variables](#environment-variables)
8. [Database Migrations](#database-migrations)
9. [Deployment Process](#deployment-process)
10. [Verification](#verification)
11. [Troubleshooting](#troubleshooting)
12. [Post-Deployment](#post-deployment)

---

## Overview

This deployment guide enables you to:
- Deploy league-api to Railway as a containerized application
- Set up PostgreSQL and Redis databases using Railway's managed services
- Deploy FlareSolverr as a separate service
- Configure continuous deployment from GitHub
- Set up custom domains with automatic SSL certificates
- Configure all required environment variables
- Run database migrations automatically

**Key Technologies:**
- Railway: Platform-as-a-Service for hosting
- Docker: Containerization
- PostgreSQL 14+: Database (managed by Railway)
- Redis 7+: Cache and queue management (managed by Railway)
- Node.js 24.x: Runtime environment
- NestJS: Application framework
- Prisma: Database ORM

---

## Prerequisites

Before beginning deployment, ensure you have:

1. **Railway Account**
   - Sign up at [railway.app](https://railway.app)
   - Verify your email address
   - Have a payment method on file
   - **Note**: Verify current pricing at [railway.app/pricing](https://railway.app/pricing) as plans may have changed

2. **GitHub Repository**
   - Your league-api code in a GitHub repository
   - Repository must be accessible (public or private with Railway integration)

3. **External Service Accounts**
   - **Discord Application**: 
     - Client ID and Secret from [Discord Developer Portal](https://discord.com/developers/applications)
     - Bot token for Discord bot integration
   - **Decodo API**: 
     - API key and proxy credentials from Decodo service
   - **Domain Name** (optional, see Domain Setup section)

4. **Local Development Tools**
   - Git installed and configured
   - Docker Desktop (for local testing, optional)

5. **Required Secrets**
   - Generate the following secrets before deployment:
     - `JWT_SECRET`: Secure random string for JWT token signing
     - `BOT_API_KEY`: API key for bot authentication
     - `API_KEY_SALT`: Salt for API key hashing
     - `ENCRYPTION_KEY`: Key for data encryption (must be exactly the right length for your encryption algorithm)

---

## Domain Setup

### Railway Domain Options

Railway provides two domain options:

1. **Railway Subdomain (Free)**
   - Format: `your-project.up.railway.app`
   - Automatically provisioned
   - SSL certificate automatically managed
   - Suitable for development/testing

2. **Custom Domain (Recommended for Production)**
   - Use your own domain (e.g., `api.yourdomain.com`)
   - Automatic SSL via Let's Encrypt
   - Configured through Railway dashboard

### Acquiring a Custom Domain (If Needed)

If Railway doesn't provide domain registration, purchase from a registrar:

**Recommended Registrars:**
- **Cloudflare**: Free DNS, competitive pricing (~$8-15/year), excellent DNS management
- **Namecheap**: User-friendly, good support (~$10-15/year)
- **Google Domains**: Simple interface (if still available)
- **Hover**: Clean interface, good support

**Domain Strategy Recommendations:**

For league-api, you'll need:
- **API Domain**: `api.yourdomain.com` (or `api-league.yourdomain.com`)
- **Frontend Domain**: `app.yourdomain.com` (configured separately, not covered here)

**Recommended**: Single domain with subdomains is most cost-effective and easier to manage.

### Configuring Custom Domain on Railway

1. Purchase domain from registrar
2. In Railway project settings, navigate to "Domains"
3. Click "Add Domain"
4. Enter your domain (e.g., `api.yourdomain.com`)
5. Railway will provide DNS configuration:
   - **CNAME record**: Point to Railway's provided CNAME target
   - **A record** (alternative): Point to Railway's IP address
6. Configure DNS at your registrar:
   - Log into registrar's DNS management
   - Add CNAME record: `api` → Railway's CNAME target
   - Wait for DNS propagation (5 minutes to 48 hours)
7. Railway automatically provisions SSL certificate once DNS is verified

**DNS Configuration Example:**
```
Type: CNAME
Name: api
Value: your-project.up.railway.app
TTL: 3600
```

---

## Infrastructure Setup

### PostgreSQL Database

Railway provides managed PostgreSQL databases with zero configuration:

1. **Provision PostgreSQL**:
   - In Railway project, click `+ New` or press `Ctrl/Cmd + K`
   - Select "Database" → "PostgreSQL"
   - Railway automatically provisions the database

2. **Connection Details**:
   Railway automatically provides these environment variables to connected services:
   - `DATABASE_URL`: Full connection string (use this for Prisma)
   - `PGHOST`: Database host
   - `PGPORT`: Database port (typically 5432)
   - `PGUSER`: Database user
   - `PGPASSWORD`: Database password
   - `PGDATABASE`: Database name

3. **PostgreSQL Version**:
   - Railway uses the latest stable PostgreSQL version (currently 14+)
   - Compatible with Prisma and your application requirements

4. **Backups**:
   - Railway provides automated backups
   - Access backups through Railway dashboard
   - For additional security, implement regular `pg_dump` exports

**Important**: The `DATABASE_URL` is automatically injected into services in the same Railway project. You don't need to manually configure it.

### Redis Database

Railway provides managed Redis databases:

1. **Provision Redis**:
   - In Railway project, click `+ New` or press `Ctrl/Cmd + K`
   - Select "Database" → "Redis"
   - Railway automatically provisions the Redis instance

2. **Connection Details**:
   Railway provides these environment variables:
   - `REDIS_URL`: Full connection string (if using connection string format)
   - `REDISHOST`: Redis hostname
   - `REDISPORT`: Redis port (typically 6379)
   - `REDISUSER`: Redis username (if authentication enabled)
   - `REDISPASSWORD`: Redis password
   - `REDISDB`: Redis database number (default: 0)

3. **Configuration Mapping**:
   Your application expects these variables (from `src/config/configuration.ts`):
   - `REDIS_HOST`: Map to `REDISHOST`
   - `REDIS_PORT`: Map to `REDISPORT`
   - `REDIS_PASSWORD`: Map to `REDISPASSWORD`
   - `REDIS_DB`: Map to `REDISDB` or use default `0`

4. **Redis Persistence**:
   - Railway's Redis includes persistence configuration
   - No additional setup required

**Note**: Your application reads Redis config from individual environment variables, not a connection string. You'll need to map Railway's variables to your app's expected names (see Environment Variables section).

### FlareSolverr Service

FlareSolverr is a web scraper that requires special container configurations:

1. **Deploy FlareSolverr**:
   - In Railway project, click `+ New` → "GitHub Repo" or "Docker Image"
   - Select "Docker Image" deployment
   - Image: `ghcr.io/flaresolverr/flaresolverr:latest`

2. **Special Requirements**:
   - FlareSolverr requires `shm_size: 2gb` and `seccomp=unconfined`
   - Railway may not support these directly in UI
   - **Workaround Options**:
     - Use Railway's Nixpacks or Dockerfile with appropriate settings
     - Consider deploying FlareSolverr externally (separate VPS) if Railway limitations apply
     - Use Railway's service variables to pass configuration

3. **Environment Variables for FlareSolverr**:
   - `LOG_LEVEL`: `info`
   - `PROXY_URL`: Your Decodo proxy URL
   - `PROXY_USERNAME`: Decodo proxy username
   - `PROXY_PASSWORD`: Decodo proxy password

4. **Service Discovery**:
   - FlareSolverr will be accessible via Railway's internal networking
   - Use Railway's service reference variable for `FLARESOLVERR_URL`
   - Format: `http://flaresolverr-service-name.railway.internal:8191` or use Railway's provided URL

**Alternative**: If FlareSolverr deployment on Railway is problematic, deploy it on a separate service (e.g., DigitalOcean, AWS EC2) and use its public URL.

---

## Docker Configuration

### Dockerfile Creation

Create a `Dockerfile` in the project root:

```dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Production
FROM node:24-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy Prisma files and generate client for production
COPY prisma ./prisma/
RUN npx prisma generate

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

# Expose port (Railway sets PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT:-3000}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/main"]
```

### .dockerignore Creation

Create a `.dockerignore` file to exclude unnecessary files:

```
node_modules
dist
.git
.gitignore
.env
.env.local
.env.*.local
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
coverage
.nyc_output
.vscode
.idea
*.swp
*.swo
*~
.DS_Store
README.md
docs
tests
playwright-report
compose.yml
```

### Railway Build Configuration

Railway automatically detects Dockerfiles. However, you can customize build settings:

1. **Build Command**: Railway detects `Dockerfile` automatically
2. **Start Command**: Defined in Dockerfile `CMD`
3. **Build Context**: Root directory by default

### Port Configuration

Your application already reads the `PORT` environment variable (see `src/main.ts:139`):
```typescript
const port = configService.get<number>('app.port') || 3000;
```

Railway automatically sets the `PORT` environment variable. Your application will use it correctly.

**Important**: Railway assigns ports dynamically. Always use the `PORT` environment variable, never hardcode port numbers.

---

## Railway Project Setup

### Creating a Railway Project

1. **New Project**:
   - Log into Railway dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"

2. **Connect GitHub**:
   - Authorize Railway to access your GitHub account
   - Select your `league-api` repository
   - Choose the branch (typically `main` for production)

3. **Service Detection**:
   - Railway will detect your Dockerfile
   - It will create a service for your application

### Service Configuration

1. **Application Service**:
   - Name: `league-api` (or your preferred name)
   - Source: GitHub repository (auto-connected)
   - Branch: `main` (or your production branch)
   - Root Directory: `/` (default)

2. **Auto-Deploy Settings**:
   - Enable "Auto Deploy" for automatic deployments on push
   - Configure branch-based deployments if needed

3. **Resource Allocation**:
   - Start with Railway's default resources
   - Monitor usage and scale as needed
   - Railway supports vertical auto-scaling (automatic) and horizontal scaling (multiple replicas)
   - **Note**: Verify current resource limits in Railway's pricing documentation

4. **Regional Deployments** (Optional):
   - Railway supports regional deployments for performance optimization
   - Configure deployment regions in service settings
   - Useful for serving users in different geographical locations

5. **Health Check Configuration**:
   - Configure health checks in service settings
   - Set custom health check path (e.g., `/health`)
   - Railway uses this to determine deployment readiness

### GitHub Integration Configuration

1. **Repository Settings**:
   - Railway automatically creates a GitHub webhook
   - Deployments trigger on push to connected branch

2. **Branch-Based Environments** (Optional):
   - Create separate services for `main` (production) and `develop` (staging)
   - Each service can have different environment variables

3. **Pull Request Previews** (Optional):
   - Railway can create preview deployments for PRs
   - Useful for testing before merging

---

## Environment Variables

### Complete Environment Variables List

Based on `src/config/configuration.schema.ts`, here are all required variables:

#### Critical (Required)

**Database:**
- `DATABASE_URL`: Automatically provided by Railway PostgreSQL service (shared across services)

**Redis:**
- `REDIS_HOST`: Map from Railway's `REDISHOST` variable
- `REDIS_PORT`: Map from Railway's `REDISPORT` variable (typically `6379`)
- `REDIS_PASSWORD`: Map from Railway's `REDISPASSWORD` variable
- `REDIS_DB`: Use `0` or map from Railway's `REDISDB`

**Discord OAuth:**
- `DISCORD_CLIENT_ID`: Your Discord application client ID
- `DISCORD_CLIENT_SECRET`: Your Discord application client secret
- `DISCORD_CALLBACK_URL`: Your Railway service URL (e.g., `https://api.yourdomain.com/auth/discord/callback`)
- `DISCORD_BOT_TOKEN`: Your Discord bot token

**Authentication:**
- `JWT_SECRET`: Secure random string (generate with: `openssl rand -base64 32`)
- `BOT_API_KEY`: API key for bot authentication
- `API_KEY_SALT`: Salt for API key hashing (generate with: `openssl rand -base64 32`)
- `ENCRYPTION_KEY`: Encryption key (must match your encryption algorithm requirements)

**Frontend:**
- `FRONTEND_URL`: Your frontend application URL (e.g., `https://app.yourdomain.com`)

**Decodo Scraper:**
- `DECODO_API_KEY`: Your Decodo API key
- `DECODO_PROXY_URL`: Decodo proxy URL (e.g., `http://gate.decodo.com:7000`)
- `DECODO_PROXY_USERNAME`: Decodo proxy username
- `DECODO_PROXY_PASSWORD`: Decodo proxy password

**FlareSolverr:**
- `FLARESOLVERR_URL`: FlareSolverr service URL (internal Railway networking or external URL)

**Application:**
- `NODE_ENV`: Set to `production`
- `PORT`: Automatically set by Railway (don't override)

#### Optional (Have Defaults)

**New Relic:**
- `NEW_RELIC_LICENSE_KEY`: New Relic license key (leave empty to disable)
- `NEW_RELIC_ENABLED`: Set to `false` to disable (default: `true`)

**System Admin:**
- `SYSTEM_ADMIN_USER_IDS`: Comma-separated Discord user IDs (e.g., `123456789,987654321`)

**Configuration Tuning:**
- `THROTTLE_TTL`: Rate limiting time window in ms (default: `60000`)
- `THROTTLE_LIMIT`: Requests per time window (default: `100`)
- `QUEUE_CONCURRENCY`: BullMQ queue concurrency (default: `5`)
- `OUTBOX_POLL_INTERVAL_MS`: Outbox processor interval (default: `5000`)
- `CIRCUIT_BREAKER_THRESHOLD`: Circuit breaker failure threshold (default: `5`)
- `CIRCUIT_BREAKER_TIMEOUT`: Circuit breaker timeout in ms (default: `60000`)
- `TRACKER_REFRESH_INTERVAL_HOURS`: Tracker refresh interval (default: `24`)
- `TRACKER_REFRESH_CRON`: Cron expression for tracker refresh (default: `0 2 * * *`)
- Various other tuning parameters with sensible defaults

### Setting Environment Variables in Railway

1. **Navigate to Service Settings**:
   - Open your service in Railway dashboard
   - Go to "Variables" tab

2. **Add Variables**:
   - Click "New Variable"
   - Enter variable name and value
   - Mark sensitive variables as "Secret" (they'll be hidden)

3. **Reference Other Services**:
   - Railway allows referencing variables from other services
   - For `DATABASE_URL`, Railway automatically shares it
   - For Redis, you may need to manually reference `REDISHOST`, etc.

4. **Environment-Specific Variables**:
   - Variables can be scoped to specific environments
   - Production and staging can have different values

### Variable Mapping for Redis

Railway provides Redis variables with different names than your app expects. Options:

**Option 1: Use Railway's Variable References**
In Railway, set:
- `REDIS_HOST` = Reference from Redis service → `REDISHOST`
- `REDIS_PORT` = Reference from Redis service → `REDISPORT`
- `REDIS_PASSWORD` = Reference from Redis service → `REDISPASSWORD`
- `REDIS_DB` = `0` (or reference `REDISDB`)

**Option 2: Modify Application Configuration**
Alternatively, update `src/config/configuration.ts` to read Railway's variable names directly.

### Discord OAuth Callback URL

The `DISCORD_CALLBACK_URL` must match your Railway service URL:

1. **Determine Your Service URL**:
   - Railway subdomain: `https://your-project.up.railway.app/auth/discord/callback`
   - Custom domain: `https://api.yourdomain.com/auth/discord/callback`

2. **Update Discord Application**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Select your application
   - Navigate to "OAuth2" → "Redirects"
   - Add your callback URL
   - Save changes

3. **Set Environment Variable**:
   - In Railway, set `DISCORD_CALLBACK_URL` to match the URL added in Discord

---

## Database Migrations

### Migration Strategy

Railway supports running migrations in several ways:

**Recommended Approach: Run migrations as part of deployment**

### Option 1: Migrations in Dockerfile (Recommended)

Modify your Dockerfile to run migrations before starting the app:

```dockerfile
# In the production stage, before CMD
# Run migrations
RUN npx prisma migrate deploy

# Start application
CMD ["node", "dist/main"]
```

**Pros**:
- Migrations run automatically on every deployment
- Failures prevent app from starting (fail-fast)
- Simple to implement

**Cons**:
- Migrations run even if database is already up-to-date (minor overhead)
- Requires database to be accessible during build (Railway handles this)

### Option 2: Migrations as Separate Service

Create a separate "migrate" service that runs migrations:

1. Create a migration script: `scripts/migrate.sh`
```bash
#!/bin/sh
npx prisma migrate deploy
```

2. In Railway, create a new service that runs:
   - Command: `npm run migrate:prod`
   - Only runs when triggered manually or on deploy

**Pros**:
- Separation of concerns
- Can run migrations independently

**Cons**:
- More complex setup
- Requires coordination between services

### Option 3: Manual Migration Execution

Run migrations manually using Railway CLI or dashboard:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migrations
railway run npm run migrate:prod
```

### Migration Best Practices

1. **Always test migrations locally** before deploying
2. **Backup database** before running migrations in production
3. **Use `prisma migrate deploy`** (not `prisma migrate dev`) in production
4. **Monitor migration logs** in Railway dashboard
5. **Have rollback plan** ready for failed migrations

### Current Migration Command

Your `package.json` already includes:
```json
"migrate:prod": "NODE_ENV=production npx prisma migrate deploy"
```

This is the correct command for production migrations.

---

## Deployment Process

### Initial Deployment

1. **Prepare Repository**:
   - Ensure `Dockerfile` and `.dockerignore` are committed
   - Verify all code is pushed to GitHub
   - Ensure migrations are up-to-date

2. **Configure Railway Project**:
   - Create project and connect GitHub repo
   - Provision PostgreSQL and Redis services
   - Set up FlareSolverr service (if applicable)

3. **Configure Environment Variables**:
   - Add all required environment variables
   - Mark sensitive variables as secrets
   - Verify variable names match application expectations

4. **Deploy**:
   - Railway will automatically start building and deploying
   - Monitor build logs in Railway dashboard
   - Wait for deployment to complete

5. **Run Initial Migrations**:
   - If not automated, run migrations manually
   - Verify migration success in logs

6. **Verify Deployment**:
   - Check health endpoint: `https://your-domain.com/health`
   - Test API endpoints
   - Verify database connectivity

### Continuous Deployment Workflow

Once set up, Railway automatically:

1. **Detects GitHub Push**:
   - Webhook triggers on push to connected branch

2. **Builds Docker Image**:
   - Pulls latest code from GitHub
   - Builds Docker image using Dockerfile
   - Runs Prisma generate and application build

3. **Deploys Service**:
   - Stops old container
   - Starts new container
   - Routes traffic to new container

4. **Health Checks**:
   - Railway monitors service health
   - Unhealthy services trigger alerts

### Rollback Procedures

Railway maintains deployment history:

1. **Via Dashboard**:
   - Go to service → "Deployments"
   - Find previous successful deployment
   - Click "Redeploy"

2. **Via CLI**:
   ```bash
   railway rollback
   ```

3. **Via Git**:
   - Revert commit in GitHub
   - Push revert commit
   - Railway will deploy previous version

### Deployment Best Practices

1. **Use Feature Branches**:
   - Develop features in branches
   - Merge to `main` triggers production deploy
   - Test in staging environment first

2. **Monitor Deployments**:
   - Watch deployment logs for errors
   - Verify health checks pass
   - Test critical endpoints after deploy

3. **Database Migrations**:
   - Always run migrations before deploying app changes
   - Test migrations in staging first
   - Have rollback plan ready

---

## Verification

### Health Check Configuration in Railway

Railway allows configuring health checks for services:

1. **Configure Health Checks**:
   - Navigate to service settings → "Health Checks"
   - Set health check path: `/health` or `/health/detailed`
   - Configure intervals and timeouts
   - Railway uses health checks to determine when deployments are ready

2. **Application Health Endpoints**:

Your application provides health check endpoints:

1. **Basic Health Check**:
   ```
   GET https://your-domain.com/health
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-01-01T00:00:00.000Z",
     "uptime": 123.456,
     "environment": "production",
     "version": "0.0.1"
   }
   ```

2. **Detailed Health Check**:
   ```
   GET https://your-domain.com/health/detailed
   ```
   Checks:
   - Database connectivity
   - Memory usage
   - Disk storage
   - Discord API connectivity

### Service Connectivity Testing

1. **Database Connection**:
   - Check application logs for database connection messages
   - Verify Prisma Client generated successfully
   - Test a simple database query via API

2. **Redis Connection**:
   - Check application logs for Redis connection
   - Verify BullMQ queues are working
   - Test rate limiting functionality

3. **FlareSolverr Connection**:
   - Check FlareSolverr health: `http://flaresolverr-url/`
   - Verify tracker scraping jobs can connect
   - Monitor scraping job logs

### OAuth Flow Testing

1. **Discord OAuth**:
   - Navigate to: `https://your-domain.com/auth/discord`
   - Should redirect to Discord authorization
   - After authorization, should redirect back to callback URL
   - Verify JWT token is issued

2. **Callback URL Verification**:
   - Ensure callback URL matches `DISCORD_CALLBACK_URL` environment variable
   - Check Discord Developer Portal redirect URI configuration

### API Endpoint Testing

Test critical endpoints:
- `GET /health` - Health check
- `GET /health/detailed` - Detailed health
- `GET /auth/me` - User authentication (requires JWT)
- Other API endpoints as needed

### Monitoring Verification

1. **Railway Dashboard**:
   - Check service metrics (CPU, memory, network)
   - Review application logs
   - Verify no error patterns

2. **Application Logs**:
   - Access logs via Railway dashboard
   - Verify application started successfully
   - Check for any startup warnings

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: Build Fails - Prisma Client Not Generated

**Symptoms**: Build fails with Prisma-related errors

**Solution**:
1. Ensure `prisma generate` runs in Dockerfile build stage
2. Verify Prisma schema is copied to Docker image
3. Check that `DATABASE_URL` is available during build (for migrations)

#### Issue: Application Won't Start - Port Binding Error

**Symptoms**: Container exits immediately, port binding errors

**Solution**:
1. Verify application reads `PORT` environment variable (your app already does this)
2. Check Railway sets `PORT` automatically
3. Ensure application binds to `0.0.0.0`, not `localhost`

#### Issue: Database Connection Failed

**Symptoms**: Application can't connect to PostgreSQL

**Solution**:
1. Verify `DATABASE_URL` is set (Railway auto-injects this)
2. Ensure PostgreSQL service is running
3. Check service is in same Railway project
4. Verify connection string format is correct

#### Issue: Redis Connection Failed

**Symptoms**: Redis connection errors, BullMQ failures

**Solution**:
1. Verify Redis service is provisioned and running
2. Check environment variable mapping (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`)
3. Ensure Redis password is correctly set
4. Verify Redis service is in same Railway project

#### Issue: Discord OAuth Callback Mismatch

**Symptoms**: OAuth redirect fails, callback URL error

**Solution**:
1. Verify `DISCORD_CALLBACK_URL` matches Railway service URL exactly
2. Update Discord Developer Portal redirect URI
3. Ensure URL uses HTTPS (Railway provides SSL automatically)
4. Check for trailing slashes or URL encoding issues

#### Issue: FlareSolverr Connection Failed

**Symptoms**: Tracker scraping jobs fail, can't reach FlareSolverr

**Solution**:
1. Verify FlareSolverr service is deployed and running
2. Check `FLARESOLVERR_URL` environment variable is correct
3. Ensure FlareSolverr is accessible via Railway's internal networking
4. Check FlareSolverr logs for startup errors
5. Consider deploying FlareSolverr externally if Railway limitations apply

#### Issue: Migrations Fail on Deploy

**Symptoms**: Deployment fails during migration step

**Solution**:
1. Test migrations locally first: `npm run migrate:prod`
2. Verify `DATABASE_URL` is accessible during build
3. Check migration files are included in Docker image
4. Review migration logs in Railway dashboard
5. Consider running migrations manually if needed

#### Issue: Health Checks Failing

**Symptoms**: Railway marks service as unhealthy

**Solution**:
1. Verify health check endpoint is accessible: `/health`
2. Check health check configuration in Railway
3. Ensure application starts within health check timeout
4. Review application logs for startup errors

#### Issue: Environment Variables Not Loading

**Symptoms**: Application uses default values, configuration errors

**Solution**:
1. Verify all required environment variables are set in Railway
2. Check variable names match exactly (case-sensitive)
3. Ensure variables are not marked as "Secret" if app needs them
4. Restart service after adding new variables

### Accessing Logs

**Railway Dashboard**:
1. Open service in Railway dashboard
2. Click "Logs" tab
3. View real-time or historical logs
4. Filter by log level if needed

**Railway CLI**:
```bash
railway logs
```

### Debugging Tips

1. **Enable Verbose Logging**:
   - Set `NODE_ENV=development` temporarily (not recommended for production)
   - Check application logs for detailed error messages

2. **Test Locally with Railway Variables**:
   - Export Railway environment variables locally
   - Test application with same configuration

3. **Check Service Dependencies**:
   - Verify all services (PostgreSQL, Redis, FlareSolverr) are running
   - Check service status in Railway dashboard

4. **Network Connectivity**:
   - Verify services can reach each other via Railway's internal network
   - Check firewall or network policies

---

## Post-Deployment

### Monitoring Setup

1. **Railway Metrics**:
   - Monitor CPU, memory, and network usage
   - Set up alerts for resource limits
   - Track deployment frequency and success rates

2. **Application Monitoring**:
   - New Relic integration (if `NEW_RELIC_LICENSE_KEY` is set)
   - Monitor application performance
   - Track error rates and response times

3. **Database Monitoring**:
   - Monitor PostgreSQL connection counts
   - Track query performance
   - Set up alerts for slow queries

### Backup Verification

1. **PostgreSQL Backups**:
   - Verify Railway's automated backups are working
   - Test backup restoration process
   - Document backup retention policy

2. **Application Data**:
   - Identify any data stored outside database
   - Implement backup strategy for critical data
   - Test data recovery procedures

### Performance Considerations

1. **Resource Usage**:
   - Monitor CPU and memory usage
   - Scale resources if needed
   - Optimize application code if usage is high

2. **Database Performance**:
   - Monitor query performance
   - Add indexes as needed
   - Optimize slow queries

3. **Cache Performance**:
   - Monitor Redis usage
   - Optimize cache strategies
   - Tune cache expiration times

### Security Hardening

1. **Environment Variables**:
   - Review all secrets are marked as "Secret" in Railway
   - Rotate secrets periodically
   - Remove unused variables

2. **Access Control**:
   - Limit Railway project access to authorized team members
   - Use role-based access control
   - Review access logs regularly

3. **SSL/TLS**:
   - Verify SSL certificates are valid and auto-renewing
   - Use HTTPS for all external communications
   - Check certificate expiration dates

### Scaling Considerations (Future)

While scaling isn't critical now, note these for future:

1. **Horizontal Scaling**:
   - Railway supports multiple instances
   - Consider load balancing if traffic increases
   - Ensure stateless application design

2. **Database Scaling**:
   - Monitor database performance
   - Consider read replicas if needed
   - Optimize queries before scaling

3. **Queue Processing**:
   - BullMQ workers run in same process currently
   - Consider separate worker services if needed
   - Monitor queue depth and processing times

### Maintenance Tasks

1. **Regular Updates**:
   - Keep dependencies updated
   - Apply security patches promptly
   - Test updates in staging first

2. **Database Maintenance**:
   - Run `VACUUM` and `ANALYZE` regularly
   - Monitor database size
   - Archive old data if needed

3. **Log Management**:
   - Review logs regularly
   - Archive old logs
   - Set up log retention policies

---

## Additional Resources

### Railway Documentation
- [Railway Docs](https://docs.railway.app) - **Always check for latest updates**
- [Quick Start Tutorial](https://docs.railway.app/quick-start)
- [Deployments Guide](https://docs.railway.app/guides/deployments)
- [PostgreSQL Guide](https://docs.railway.app/guides/postgresql)
- [Redis Guide](https://docs.railway.app/guides/redis)
- [Docker Deployment](https://docs.railway.app/guides/dockerfile)
- [Custom Domains](https://docs.railway.app/guides/custom-domains)
- [Environment Variables](https://docs.railway.app/develop/variables)
- [Health Checks](https://docs.railway.app/guides/deployments#health-checks)
- [Scaling](https://docs.railway.app/guides/deployments#scaling)

### Application Documentation
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

### Support
- Railway Support: Available through dashboard
- Railway Community: [Discord](https://discord.gg/railway)

---

## Conclusion

This guide provides a complete roadmap for deploying league-api to Railway. Follow each section sequentially, and refer to troubleshooting if issues arise. The deployment process is designed to be straightforward with Railway's managed services and automatic deployments from GitHub.

**Important**: Railway's platform and features are actively developed. Always refer to the [official Railway documentation](https://docs.railway.app) for the most current information, especially regarding:
- Pricing plans and resource limits
- New features and capabilities
- API changes or deprecations
- Best practices and recommendations

For questions or updates to this guide, refer to the project repository or Railway's official documentation.

