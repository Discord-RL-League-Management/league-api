# API Endpoints

This document provides a comprehensive reference of all available API endpoints in the League Management System.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

## Authentication Types

- **Bot Authentication**: Bearer token with API key (`Authorization: Bearer <BOT_API_KEY>`)
- **User Authentication**: JWT token from Discord OAuth (`Authorization: Bearer <JWT_TOKEN>`)
- **Public**: No authentication required

---

## Public Endpoints

### Health Check

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/health` | Check API status and uptime | ❌ No |

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "development",
  "version": "1.0.0"
}
```

---

## Authentication Endpoints

### Discord OAuth

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/auth/discord` | Initiate Discord OAuth flow | ❌ No |
| `GET` | `/auth/discord/callback` | OAuth callback handler | ❌ No |
| `GET` | `/auth/me` | Get current authenticated user (user data only, no guilds) | ✅ JWT |
| `GET` | `/auth/guilds` | Get user's available guilds | ✅ JWT |

**OAuth Flow:**
1. User visits `/auth/discord`
2. Redirected to Discord for authorization
3. Discord redirects to `/auth/discord/callback` with code
4. API exchanges code for JWT token
5. User redirected to frontend with token

**Note**: `/auth/me` returns user profile data only. User guilds are available via `/auth/guilds` endpoint.

---

## Bot Endpoints (API Key Required)

### Internal Health

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/internal/health` | Bot-specific health check | ✅ API Key |

### User Management (Bot)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/internal/users` | List all users | ✅ API Key |
| `GET` | `/internal/users/:id` | Get user by ID | ✅ API Key |
| `POST` | `/internal/users` | Create new user | ✅ API Key |
| `PATCH` | `/internal/users/:id` | Update user | ✅ API Key |
| `DELETE` | `/internal/users/:id` | Delete user | ✅ API Key |

**Example Bot Request:**
```bash
curl -H "Authorization: Bearer BOT_API_KEY" \
  http://localhost:3000/internal/users
```

---

## User Endpoints (JWT Required)

### Profile Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/profile` | Get own profile | ✅ JWT |
| `GET` | `/api/profile/stats` | Get own stats | ✅ JWT |
| `PATCH` | `/api/profile/settings` | Update settings | ✅ JWT |

### User Data

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/users/me` | Get own user data | ✅ JWT |
| `PATCH` | `/api/users/me` | Update own user data | ✅ JWT |
| `GET` | `/api/users/:id` | Get user (only if :id matches JWT user) | ✅ JWT |

**Example User Request:**
```bash
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://localhost:3000/api/profile
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/users/me",
  "method": "GET",
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

- **Bot endpoints**: No rate limiting (trusted internal service)
- **User endpoints**: Standard rate limiting applied
- **Public endpoints**: Light rate limiting

---

## CORS Configuration

- **Allowed Origins**: 
  - `http://localhost:5173` (Development frontend)
  - `http://localhost:3000` (Development API)
  - Production frontend URL
- **Methods**: GET, POST, PUT, PATCH, DELETE
- **Headers**: Origin, X-Requested-With, Content-Type, Accept, Authorization
- **Credentials**: Supported

---

## Security Headers

All responses include security headers via Helmet:
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security (HSTS)
- And more...

---

## Data Models

### User Model

```typescript
interface User {
  id: string;                    // Discord user ID
  username: string;              // Discord username
  discriminator?: string;        // Discord discriminator (deprecated)
  globalName?: string;           // Discord global display name
  avatar?: string;               // Discord avatar hash
  email?: string;                // User email
  accessToken?: string;          // Discord OAuth access token
  refreshToken?: string;         // Discord OAuth refresh token
  createdAt: Date;               // Account creation date
  updatedAt: Date;               // Last update date
  lastLoginAt: Date;             // Last login date
}
```

### User Profile (Public)

```typescript
interface UserProfile {
  id: string;
  username: string;
  globalName?: string;
  avatar?: string;
  email?: string;
  createdAt: Date;
  lastLoginAt: Date;
}
```

### User Stats

```typescript
interface UserStats {
  userId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
}
```

---

## Testing

### Health Check Test

```bash
# Test public health endpoint
curl http://localhost:3000/health

# Test bot health endpoint
curl -H "Authorization: Bearer BOT_API_KEY" \
  http://localhost:3000/internal/health
```

### Authentication Test

```bash
# Test bot authentication
curl -H "Authorization: Bearer BOT_API_KEY" \
  http://localhost:3000/internal/users

# Test user authentication (requires valid JWT)
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://localhost:3000/api/profile
```

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- User IDs are Discord snowflakes (strings)
- Bot has full access to all user data via internal endpoints
- Users can only access their own data via user endpoints
- All endpoints support JSON request/response format
- API versioning will be added in future releases
