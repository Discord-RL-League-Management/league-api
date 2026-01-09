# CORS Configuration

This document describes the Cross-Origin Resource Sharing (CORS) configuration for the League Management API, including security policies for requests without origin headers.

## Overview

The API implements a restrictive CORS policy to prevent unauthorized cross-origin requests while supporting legitimate use cases such as:
- Health check endpoints for monitoring tools
- Mobile applications that may not send origin headers
- Authenticated API requests (bot API keys, JWT tokens)
- Development environment testing

## Allowed Origins

The API allows requests from the following origins:

- **Frontend URL**: Configured via `FRONTEND_URL` environment variable
- **Local Development**: `http://localhost:5173` and `http://localhost:3000`

All other origins are blocked by default.

## No-Origin Request Policy

Requests without an `Origin` header are restricted based on the following criteria:

### 1. Health Check Endpoints

**Allowed**: Requests to `/health*` endpoints (e.g., `/health`, `/health/detailed`)

**Rationale**: Health check endpoints are used by monitoring tools, load balancers, and infrastructure systems that may not send origin headers. These endpoints are public and do not expose sensitive data.

**Configuration**: Controlled by `CORS_ALLOW_NO_ORIGIN_HEALTH` (default: `true`)

### 2. Authenticated Requests

**Allowed**: Requests with valid `Authorization` header (API key or JWT token)

**Rationale**: Mobile applications and API clients may not send origin headers, but authentication provides sufficient security. Authenticated requests are validated independently of CORS.

**Configuration**: Controlled by `CORS_ALLOW_NO_ORIGIN_AUTHENTICATED` (default: `true`)

### 3. Development Environment

**Allowed**: All no-origin requests in development environment

**Rationale**: Development environment allows testing with tools like Postman that may not send origin headers. This is disabled in production for security.

**Configuration**: Controlled by `CORS_ALLOW_NO_ORIGIN_DEVELOPMENT` (default: `true`)

### 4. Production Restrictions

In production environment, no-origin requests are blocked for all endpoints except:
- Health check endpoints (if enabled)
- Authenticated requests (if enabled)

All blocked no-origin requests are logged for security monitoring.

## Environment Variables

The following environment variables control CORS behavior:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `CORS_ALLOW_NO_ORIGIN_HEALTH` | boolean | `true` | Allow no-origin requests for health check endpoints |
| `CORS_ALLOW_NO_ORIGIN_AUTHENTICATED` | boolean | `true` | Allow no-origin requests with valid Authorization header |
| `CORS_ALLOW_NO_ORIGIN_DEVELOPMENT` | boolean | `true` | Allow all no-origin requests in development environment |

### Configuration Examples

**Strict Production Configuration:**
```bash
NODE_ENV=production
CORS_ALLOW_NO_ORIGIN_HEALTH=true
CORS_ALLOW_NO_ORIGIN_AUTHENTICATED=true
CORS_ALLOW_NO_ORIGIN_DEVELOPMENT=false
```

**Development Configuration:**
```bash
NODE_ENV=development
CORS_ALLOW_NO_ORIGIN_HEALTH=true
CORS_ALLOW_NO_ORIGIN_AUTHENTICATED=true
CORS_ALLOW_NO_ORIGIN_DEVELOPMENT=true
```

## CORS Headers

The API returns the following CORS headers for allowed requests:

- `Access-Control-Allow-Origin`: Set to the requesting origin or `*` for no-origin requests
- `Access-Control-Allow-Methods`: `GET, POST, PUT, PATCH, DELETE`
- `Access-Control-Allow-Headers`: `Origin, X-Requested-With, Content-Type, Accept, Authorization`
- `Access-Control-Allow-Credentials`: `true`
- `Access-Control-Max-Age`: `86400` (24 hours)

## Security Considerations

### Why Restrict No-Origin Requests?

Requests without origin headers can bypass CORS protection, as the browser cannot verify the request source. This creates a security risk if:
- Tools or scripts that don't send origin headers can access protected endpoints
- Malicious clients can bypass CORS restrictions

### Security Measures

1. **Endpoint-Based Restrictions**: Health check endpoints are public and safe, so no-origin requests are allowed
2. **Authentication-Based Allowance**: Authenticated requests (API key/JWT) are allowed as authentication provides security independent of CORS
3. **Environment-Based Policy**: Development allows all no-origin requests for testing, while production enforces restrictions
4. **Logging**: All no-origin requests (allowed and blocked) are logged for security monitoring

### Best Practices

- **Production**: Enable health check and authenticated allowances, disable development allowance
- **Development**: Enable all allowances for testing convenience
- **Monitoring**: Review logs for blocked no-origin requests to identify potential security issues

## Logging

All no-origin requests are logged for security monitoring:

**Allowed Requests:**
```
CORS: Allowed no-origin request - path: /health, reason: health endpoint, hasAuth: false
```

**Blocked Requests:**
```
CORS: Blocked no-origin request - path: /api/users, hasAuth: false, environment: production
```

## Testing

CORS configuration is tested in `tests/unit/main.cors.spec.ts` following TQA requirements:

- Tests verify health endpoint allowance
- Tests verify authenticated request allowance
- Tests verify development environment allowance
- Tests verify production restrictions
- Tests verify configuration-driven behavior
- Tests verify logging behavior

## Related Documentation

- [NestJS CORS Documentation](https://docs.nestjs.com/security/cors)
- [NestJS Configuration Documentation](https://docs.nestjs.com/techniques/configuration)
- [API Endpoints](./API_ENDPOINTS.md)
- [Security Audit Report](./NESTJS_AUDIT_REPORT.md)

## References

- [OAuth 2.0 Security Best Practices](https://oauth.net/2/oauth-best-practice/)
- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [CORS Security Guide](https://portswigger.net/web-security/cors)
