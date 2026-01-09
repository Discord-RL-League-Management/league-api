# Stage 1: Dependencies - Install all dependencies including devDependencies
FROM node:24-alpine AS dependencies

WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Stage 2: Build - Build application with Prisma Client generation
FROM node:24-alpine AS build

WORKDIR /app

# Copy package files and installed dependencies from dependencies stage
COPY package.json package-lock.json ./
COPY --from=dependencies /app/node_modules ./node_modules

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma Client before building (required for TypeScript compilation)
RUN npx prisma generate

# Copy source files and configuration
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

# Build the application
RUN npm run build

# Stage 3: Runtime - Production runtime with minimal dependencies
FROM node:24-alpine AS runtime

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files for production dependency installation
COPY package.json package-lock.json ./

# Install only production dependencies
# Skip prepare script (husky) since we don't need git hooks in production
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# Copy Prisma schema and generated Prisma Client from build stage
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Copy necessary configuration files
COPY tsconfig.json ./

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose application port (configurable via PORT environment variable)
EXPOSE 3000

# Health check using node (more reliable than busybox wget)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Set production environment variable
ENV NODE_ENV=production

# Default command to start the application
CMD ["npm", "run", "start:prod"]
