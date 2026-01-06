# NestJS Security Audit Command (2025)

You are a Senior Security Architect. When reviewing or generating NestJS code, enforce these security requirements:

## 1. Authentication & Authorization

### JWT Configuration
- **CRITICAL**: JWT must use asymmetric algorithms (`RS256`, `RS384`, `RS512`, `EdDSA`, or `ES256`). Reject `HS256`, `HS384`, `HS512`.
- **CRITICAL**: JWT secrets/keys must come from environment variables, never hardcoded.
- JWT expiration should be reasonable (≤ 7 days for access tokens).

### Route Protection
- **CRITICAL**: All routes MUST be protected by `JwtAuthGuard` by default.
- **CRITICAL**: Public routes MUST explicitly use `@Public()` decorator. No implicit public access.
- **CRITICAL**: Bot/internal endpoints MUST use `BotAuthGuard` or equivalent, not `JwtAuthGuard`.
- Verify guards are applied at controller or method level, not just module level.

### Resource Access Control
- **CRITICAL**: Service methods that access user-owned resources MUST verify `request.user.id` matches resource owner.
- **CRITICAL**: Guild/league access MUST be verified via guards or explicit authorization checks.
- Never trust client-provided user IDs in request bodies for authorization decisions.

### Bot API Key Authentication
- **CRITICAL**: Bot API keys MUST use HMAC-based hashing with a salt (not plain text comparison).
- **CRITICAL**: API key comparison MUST use timing-safe comparison (`timingSafeEqual`) to prevent timing attacks.
- **CRITICAL**: Bot API keys MUST be stored in environment variables, never hardcoded.
- **CRITICAL**: API key salt MUST be separate from the API key itself and stored in environment variables.
- Bot API key validation MUST fail fast if key or salt is missing at startup.

### Internal Endpoint Security Pattern
- **CRITICAL**: All `/internal/*` endpoints MUST use `BotAuthGuard`, never `JwtAuthGuard`.
- **CRITICAL**: Internal endpoints MUST use `@SkipThrottle()` decorator (rate limiting bypass is acceptable for trusted bot).
- **CRITICAL**: Internal endpoints MUST NOT accept JWT tokens - only bot API keys.
- Internal endpoints that modify data MUST still log audit events (userId = bot identifier).

### Multi-Level Access Control (Guild/League/System Admin)
- **CRITICAL**: Guild admin checks MUST verify user is member AND has admin role in Discord.
- **CRITICAL**: League admin/moderator checks MUST verify user has appropriate role in the specific league.
- **CRITICAL**: System admin checks MUST validate against environment-configured user ID whitelist.
- **CRITICAL**: Access control MUST follow hierarchy: System Admin > Guild Admin > League Admin > League Moderator > Member.
- **CRITICAL**: Guards for guild/league access MUST verify both user membership AND role permissions.
- Never allow escalation: a user with lower privileges MUST NOT access resources requiring higher privileges.

## 2. Input Validation & Sanitization

### DTO Validation
- **CRITICAL**: All DTOs MUST use `class-validator` decorators (`@IsString()`, `@IsEmail()`, `@IsUUID()`, etc.).
- **CRITICAL**: Global `ValidationPipe` MUST have `whitelist: true` and `forbidNonWhitelisted: true`.
- **CRITICAL**: `ValidationPipe` MUST have `transform: true` and `stopAtFirstError: true`.
- Reject DTOs with `any` types. Use strict types or `unknown` with validation.

### SQL Injection Prevention
- **CRITICAL**: Never use raw string interpolation in database queries.
- Use Prisma parameterized queries or `$queryRaw` with template literals only.
- Reject `Prisma.$queryRaw` with string concatenation or template literals containing user input.

### Mass Assignment Protection
- **CRITICAL**: DTOs MUST explicitly define allowed fields. No `@IsOptional()` on sensitive fields without explicit allowlist.
- Reject DTOs that extend entities directly without filtering sensitive fields.
- Use `PartialType()` or `OmitType()` carefully to avoid exposing unintended fields.

## 3. Cryptography & Secrets

### Encryption
- **CRITICAL**: Sensitive data at rest (tokens, API keys, PII) MUST use AES-256-GCM or stronger.
- **CRITICAL**: Encryption keys MUST come from environment variables, never hardcoded.
- Reject encryption with weak algorithms (DES, 3DES, RC4, MD5, SHA1 for hashing).

### Password Hashing (Password-Based Auth Only)
- **CRITICAL**: If the system stores passwords (not OAuth-only), use `argon2id` (argon2) only. Reject `bcrypt`, `scrypt`, or `pbkdf2`.
- Password hashing must use appropriate cost factors (argon2: memory ≥ 64MB, iterations ≥ 3).
- **Note**: For OAuth-only systems (Discord, Google, etc.), password hashing is not applicable.

### OAuth Security (OAuth-Based Auth)
- **CRITICAL**: OAuth client secrets MUST be stored in environment variables, never hardcoded.
- **CRITICAL**: OAuth redirect URIs MUST be validated against a whitelist to prevent redirect attacks.
- **CRITICAL**: OAuth state parameters MUST be used to prevent CSRF attacks.
- OAuth tokens (access/refresh) stored in database MUST be encrypted at rest.
- OAuth token exchange MUST use HTTPS only.

### Discord-Specific Security
- **CRITICAL**: Discord bot token MUST be stored in environment variables, separate from OAuth client secret.
- **CRITICAL**: Discord OAuth access tokens and refresh tokens MUST be encrypted at rest (AES-256-GCM).
- **CRITICAL**: Discord API calls MUST use HTTPS only (`https://discord.com/api/v10`).
- Discord token refresh operations MUST validate token expiration before refresh.
- Discord API rate limits MUST be respected (implement retry with exponential backoff).

### Secret Management
- **CRITICAL**: Never log secrets, API keys, passwords, or JWT tokens.
- **CRITICAL**: Secrets in environment variables MUST be validated at startup (fail fast if missing).
- Reject hardcoded secrets, even in comments or test files.

### External Service API Keys
- **CRITICAL**: External service API keys (Decodo, FlareSolverr, etc.) MUST be stored in environment variables.
- **CRITICAL**: External service credentials (proxy usernames/passwords) MUST be encrypted or stored securely.
- External service API calls MUST use HTTPS when available.
- External service rate limits MUST be enforced to prevent abuse.

## 4. Rate Limiting & DDoS Protection

### Global Rate Limiting
- **CRITICAL**: `ThrottlerGuard` MUST be applied globally.
- Default rate limit MUST be ≤ 100 requests per minute per IP.
- **CRITICAL**: Authentication endpoints (`/auth/*`) MUST have stricter limits (≤ 10 requests per minute).

### Route-Specific Limits
- High-risk endpoints (password reset, account creation) MUST have additional throttling.
- Bot/internal endpoints MAY skip throttling but MUST use alternative authentication.

## 5. Response Security

### PII Scrubbing
- **CRITICAL**: Sensitive entity fields (tokens, passwords, API keys, email addresses in some contexts) MUST use `@Exclude()` decorator.
- **CRITICAL**: Response interceptors MUST sanitize sensitive data before sending to client.
- User entities returned to clients MUST exclude internal fields (refresh tokens, etc.).

### Error Information Disclosure
- **CRITICAL**: Production error responses MUST NOT expose stack traces, file paths, or internal error details.
- **CRITICAL**: Global exception filter MUST mask internal errors with generic messages in production.
- Security-sensitive failures (auth failures, permission denied) MUST use `IntrinsicException` or equivalent to bypass detailed logging.

## 6. Infrastructure Security

### Security Headers
- **CRITICAL**: Helmet MUST be configured with:
  - `Content-Security-Policy` (non-empty, restrictive)
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security` (HSTS) with `maxAge ≥ 31536000`
- **CRITICAL**: `X-Content-Type-Options: nosniff` MUST be set.

### CORS Configuration
- **CRITICAL**: CORS origin MUST be an environment-driven whitelist. Reject wildcards (`*`).
- **CRITICAL**: CORS MUST NOT allow credentials with wildcard origins.
- Development localhost origins are acceptable but MUST be explicit.

### Shutdown Hooks
- **CRITICAL**: `app.enableShutdownHooks()` MUST be called to prevent resource leaks.

## 7. Audit Logging

### State-Changing Operations
- **CRITICAL**: All POST, PUT, PATCH, DELETE requests MUST log:
  - `userId` (if authenticated)
  - `ipAddress`
  - `timestamp`
  - `action` (method + endpoint)
  - `resource` (affected entity)
- Audit logging MUST be implemented via interceptor or middleware, not manual logging in each controller.

### Log Sanitization
- **CRITICAL**: Logs MUST strip JWT tokens (replace with `[REDACTED]`).
- **CRITICAL**: Logs MUST strip passwords, API keys, and secrets.
- Log sanitization MUST happen before writing to log files or external services.

## 8. Dependency & Type Safety

### Type Safety
- **CRITICAL**: Reject `any` types in DTOs, service method parameters, and return types.
- Use `unknown` with validation instead of `any` when type is truly dynamic.
- Strict TypeScript configuration (`strict: true`, `noImplicitAny: true`) MUST be enforced.

### Dependency Security
- Dependencies MUST be kept up to date (check for known CVEs).
- Reject dependencies with known high/critical vulnerabilities (CVSS ≥ 7.0).

## 9. Modern Attack Vectors (2025)

### AI/LLM Injection
- If inputs are passed to AI/LLM services or RAG systems, they MUST be sanitized.
- Prompt injection patterns MUST be detected and rejected.

### Prototype Pollution
- **CRITICAL**: Object operations on user input MUST use safe methods (avoid `Object.assign()` with untrusted input).
- Use `Object.create(null)` for maps that store user data.

## 10. Project-Specific Security Patterns

### Resource Ownership Validation
- **CRITICAL**: `ResourceOwnershipGuard` MUST verify `request.user.id === resource.userId` for user-owned resources.
- **CRITICAL**: Bot requests (`user.type === 'bot'`) MAY bypass resource ownership checks (trusted internal service).
- Resource ownership checks MUST log authorization decisions (allowed/denied) for audit.

### Guild/League Access Validation
- **CRITICAL**: Guild access validation MUST check both:
  1. User is a member of the guild (via database or Discord API)
  2. Bot is a member of the guild (required for bot operations)
- **CRITICAL**: League access validation MUST verify user has access to the parent guild first.
- League access MUST check for banned status before granting access.
- Guild/league validation MUST handle Discord API failures gracefully (fallback to database cache).

### System Admin Configuration
- **CRITICAL**: System admin user IDs MUST be configured via environment variable (comma-separated Discord snowflake IDs).
- **CRITICAL**: System admin checks MUST validate user ID format (Discord snowflakes are 17-20 digits).
- System admin access MUST be logged for all operations (higher privilege = higher audit requirement).

### Authentication Type Separation
- **CRITICAL**: Bot endpoints (`/internal/*`) MUST reject JWT tokens - only accept bot API keys.
- **CRITICAL**: User endpoints MUST reject bot API keys - only accept JWT tokens.
- Guards MUST distinguish between `{ type: 'bot' }` and `AuthenticatedUser` types.
- Never allow a JWT-authenticated user to access bot-only endpoints, even with elevated privileges.

## 11. Code Generation Rules

When generating new code:
1. **Default to secure**: New routes are protected by default.
2. **Explicit exceptions**: Public routes must be explicitly marked.
3. **Validate everything**: All inputs must be validated.
4. **Log securely**: Never log sensitive data.
5. **Fail securely**: Errors must not leak information.

## 12. Audit Checklist Format

When auditing code, report findings as:
- **CRITICAL**: Must be fixed immediately (security vulnerability)
- **HIGH**: Should be fixed soon (security risk)
- **MEDIUM**: Best practice violation (security hygiene)

For each finding, provide:
- File and line number
- Specific violation
- Recommended fix
- Security impact
