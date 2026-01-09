<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Docker

### Building the Docker Image

Build the Docker image locally:

```bash
npm run docker:build
```

Or manually:

```bash
docker build -t league-api .
```

**Note**: The `.env` file is **NOT** copied into the Docker image for security reasons. Environment variables must be provided at runtime.

### Running Locally with Docker

Environment variables are passed to the container at runtime, not baked into the image. There are several ways to provide them:

#### Option 1: Using `.env` file (Recommended for local testing)

Run the container with environment variables from a local `.env` file:

```bash
npm run docker:run
```

Or manually:

```bash
docker run --rm --env-file .env -p 3000:3000 league-api
```

The `--env-file .env` flag reads environment variables from your local `.env` file and passes them to the container at runtime.

#### Option 2: Using individual environment variables

```bash
docker run --rm \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://... \
  -e JWT_PRIVATE_KEY="..." \
  # ... other required variables ...
  -p 3000:3000 \
  league-api
```

#### Option 3: Using Docker Compose

If using Docker Compose, environment variables can be provided via:
- `env_file: .env` in `docker-compose.yml`
- `environment:` section in `docker-compose.yml`
- External `.env` file (automatically loaded by Docker Compose)

**Important**: Never commit `.env` files or include them in the Docker image. Always provide environment variables at runtime.

### Testing Docker Build and Health Check

Build and test the Docker image with health check verification:

```bash
npm run docker:test
```

Or test manually:

```bash
# Build the image
docker build -t league-api .

# Run with environment variables and health check
docker run --rm --env-file .env -p 3000:3000 \
  --health-cmd='node -e "require(\"http\").get(\"http://localhost:3000/health\", (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"' \
  --health-interval=10s \
  --health-timeout=5s \
  --health-retries=3 \
  league-api

# Verify health endpoint
curl http://localhost:3000/health
```

## Deployment

### Railway Deployment

The application is containerized using Docker and ready for deployment on Railway.

**Environment Variables in Railway**: Unlike local Docker runs where you use `--env-file .env`, Railway manages environment variables through its platform. Variables are set in Railway's dashboard or CLI and are injected into the container at runtime. They are **never** baked into the Docker image, ensuring security and flexibility.

#### Prerequisites

1. Railway account
2. PostgreSQL database (Railway PostgreSQL service)
3. Redis instance (Railway Redis service)
4. All required environment variables configured

#### Railway CLI Installation (Optional but Recommended)

The Railway CLI allows you to manage deployments, environment variables, and run commands from the terminal.

**Installation:**

```bash
# macOS (Homebrew)
brew install railway

# All platforms (npm)
npm i -g @railway/cli

# Or using install script
bash <(curl -fsSL cli.new)
```

**Authentication:**

```bash
railway login
```

This opens a browser window for authentication.

**Common Railway CLI Commands:**

```bash
# Link to an existing Railway project
railway link

# Deploy the current directory
railway up

# View logs in real-time
railway logs
# Follow logs continuously
railway logs --follow

# Open project in browser
railway open

# Manage environment variables
railway variables
# View all variables
railway variables
# Set a variable (syntax may vary - check CLI help)
railway variables set KEY=value

# Run commands in Railway environment (useful for migrations)
railway run npx prisma migrate deploy

# Get help for any command
railway help
railway <command> --help
```

**Note**: For the most up-to-date command syntax and options, always check:
- `railway help` for general help
- `railway <command> --help` for specific command help
- [Railway CLI Reference](https://docs.railway.com/reference/cli-api) for complete documentation

#### Deployment Steps

1. **Connect Repository to Railway**
   
   **Using Railway Dashboard:**
   - Create a new project in Railway
   - Connect your GitHub repository
   - Railway will automatically detect the Dockerfile
   
   **Using Railway CLI:**
   ```bash
   # Login to Railway
   railway login
   
   # Initialize a new project (or link to existing)
   railway init
   # OR link to existing project
   railway link
   ```

2. **Configure Services**
   - Add a PostgreSQL service and note the connection string
   - Add a Redis service and note connection details

3. **Set Environment Variables**
   
   **Using Railway Dashboard:**
   - In Railway project settings → Variables tab, add all required environment variables (see complete list below)
   - Set `DATABASE_URL` to the PostgreSQL connection string from Railway
   - Configure `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` from Railway Redis service
   - You can set variables per-service or at the project level
   
   **Using Railway CLI:**
   ```bash
   # Set individual variables (check exact syntax with: railway variables --help)
   railway variables set DATABASE_URL=postgresql://...
   railway variables set REDIS_HOST=...
   railway variables set REDIS_PASSWORD=...
   
   # View all variables
   railway variables
   
   # Note: Some CLI versions may support bulk operations
   # Check `railway variables --help` for available options
   ```
   
   **Important**: Environment variables are set through Railway's dashboard or CLI, NOT from a `.env` file uploaded to the repository. Railway will inject these variables at container runtime (they are NOT baked into the Docker image).

4. **Configure Build Settings**
   - Build Command: Leave empty (uses Dockerfile)
   - Start Command: Leave empty (uses Dockerfile CMD)
   - Port: Railway will automatically detect from EXPOSE in Dockerfile

5. **Configure Pre-Deploy Command**
   - Set Pre-Deploy Command: `npx prisma migrate deploy`
   - **Important**: Migrations run as a pre-deploy step, not inside the container
   - This ensures migrations run before each deployment and can be tracked/logged separately
   
   **Alternative: Run Migrations Manually via CLI:**
   ```bash
   # Run migrations manually when needed
   railway run npx prisma migrate deploy
   ```

6. **Configure Health Check**
   - Health Check Path: `/health`
   - Railway will automatically use the Docker HEALTHCHECK instruction

7. **Deploy**
   
   **Using Railway Dashboard:**
   - Railway will automatically build the Docker image and deploy when you push to the connected branch
   - Monitor the deployment logs in the dashboard to ensure successful startup
   
   **Using Railway CLI:**
   ```bash
   # Deploy from current directory
   railway up
   
   # View deployment logs in real-time
   railway logs
   
   # Watch logs with follow mode
   railway logs --follow
   
   # Open the deployed application in browser
   railway open
   ```

#### Required Environment Variables

The following environment variables must be configured in Railway:

##### Application
- `NODE_ENV` - Environment (default: `development`, use `production` for Railway)
- `PORT` - Server port (default: `3000`, Railway may override)

##### Database
- `DATABASE_URL` - PostgreSQL connection string (provided by Railway PostgreSQL service)

##### Authentication
- `BOT_API_KEY` - API key for bot authentication
- `API_KEY_SALT` - Salt for API key hashing
- `JWT_PRIVATE_KEY` - RSA private key in PEM format for signing JWT tokens
- `JWT_PUBLIC_KEY` - RSA public key in PEM format for verifying JWT tokens
- `JWT_EXPIRES_IN` - JWT expiration time (default: `7d`)

##### Encryption
- `ENCRYPTION_KEY` - Encryption key for sensitive data

##### Discord OAuth
- `DISCORD_CLIENT_ID` - Discord OAuth client ID
- `DISCORD_CLIENT_SECRET` - Discord OAuth client secret
- `DISCORD_CALLBACK_URL` - Discord OAuth callback URL
- `DISCORD_BOT_TOKEN` - Discord bot token
- `DISCORD_TIMEOUT` - Discord API timeout in ms (default: `10000`)
- `DISCORD_RETRY_ATTEMPTS` - Discord API retry attempts (default: `3`)
- `DISCORD_API_URL` - Discord API base URL (default: `https://discord.com/api/v10`)

##### Cookie Settings
- `COOKIE_SAME_SITE` - Cookie SameSite attribute (default: `lax`, options: `strict`, `lax`, `none`)

##### Frontend
- `FRONTEND_URL` - Frontend application URL

##### OAuth Redirect URIs
- `OAUTH_REDIRECT_URIS` - Comma-separated list of allowed OAuth redirect URIs (optional)

##### Rate Limiting
- `THROTTLE_TTL` - Throttle time-to-live in ms (default: `60000`)
- `THROTTLE_LIMIT` - Maximum requests per TTL (default: `100`)

##### New Relic (Optional)
- `NEW_RELIC_LICENSE_KEY` - New Relic license key (optional)
- `NEW_RELIC_ENABLED` - Enable New Relic logging (default: `true`)

##### Redis
- `REDIS_HOST` - Redis hostname (provided by Railway Redis service)
- `REDIS_PORT` - Redis port (default: `6379`, provided by Railway)
- `REDIS_PASSWORD` - Redis password (provided by Railway Redis service)
- `REDIS_DB` - Redis database number (default: `0`)

##### BullMQ Queue
- `QUEUE_CONCURRENCY` - Queue concurrency (default: `5`)
- `QUEUE_DEFAULT_JOB_OPTIONS` - Default job options as JSON string (optional)

##### Outbox Pattern
- `OUTBOX_POLL_INTERVAL_MS` - Outbox polling interval in ms (default: `5000`)

##### Circuit Breaker
- `CIRCUIT_BREAKER_THRESHOLD` - Circuit breaker failure threshold (default: `5`)
- `CIRCUIT_BREAKER_TIMEOUT` - Circuit breaker timeout in ms (default: `60000`)

##### Decodo Scraper API
- `DECODO_API_KEY` - Decodo API key
- `DECODO_API_URL` - Decodo API URL (default: `https://scraper-api.decodo.com/v2/scrape`)
- `DECODO_PROXY_URL` - Decodo proxy URL (default: `http://gate.decodo.com:7000`)
- `DECODO_PROXY_USERNAME` - Decodo proxy username
- `DECODO_PROXY_PASSWORD` - Decodo proxy password
- `DECODO_RATE_LIMIT_PER_MINUTE` - Rate limit per minute (default: `60`)
- `DECODO_TIMEOUT_MS` - Request timeout in ms (default: `30000`)
- `DECODO_RETRY_ATTEMPTS` - Retry attempts (default: `3`)
- `DECODO_RETRY_DELAY_MS` - Retry delay in ms (default: `1000`)

##### FlareSolverr
- `FLARESOLVERR_URL` - FlareSolverr URL (default: `http://flaresolverr:8191`)
- `FLARESOLVERR_TIMEOUT_MS` - Request timeout in ms (default: `60000`)
- `FLARESOLVERR_RETRY_ATTEMPTS` - Retry attempts (default: `3`)
- `FLARESOLVERR_RETRY_DELAY_MS` - Retry delay in ms (default: `1000`)
- `FLARESOLVERR_RATE_LIMIT_PER_MINUTE` - Rate limit per minute (default: `60`)

##### Tracker Refresh
- `TRACKER_REFRESH_INTERVAL_HOURS` - Refresh interval in hours (default: `24`)
- `TRACKER_BATCH_SIZE` - Batch size for processing (default: `100`)
- `TRACKER_REFRESH_CRON` - Cron expression for refresh (default: `0 2 * * *`)
- `TRACKER_MAX_SCRAPING_ATTEMPTS` - Maximum scraping attempts (default: `3`)

##### System Admin
- `SYSTEM_ADMIN_USER_IDS` - Comma-separated Discord user IDs for admin access (optional)

##### CORS
- `CORS_ALLOW_NO_ORIGIN_HEALTH` - Allow requests with no origin for health checks (default: `true`)
- `CORS_ALLOW_NO_ORIGIN_AUTHENTICATED` - Allow requests with no origin for authenticated requests (default: `true`)
- `CORS_ALLOW_NO_ORIGIN_DEVELOPMENT` - Allow requests with no origin in development (default: `true`)

#### Prisma Migration Strategy

**Important**: Database migrations are configured to run as a Railway pre-deploy command, not inside the Docker container. This ensures:

- Migrations run before each deployment
- Migration execution is tracked and logged separately
- Easier troubleshooting of migration failures
- Better integration with Railway's deployment pipeline

The pre-deploy command runs: `npx prisma migrate deploy`

This requires Prisma CLI to be available in the build environment. Railway automatically includes `node_modules` from the build, which contains Prisma CLI as a dependency.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
