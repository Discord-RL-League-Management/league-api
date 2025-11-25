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

### League Management (Bot)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/internal/leagues/:id` | Get league by ID | ✅ API Key |
| `POST` | `/internal/leagues` | Create new league | ✅ API Key |
| `PATCH` | `/internal/leagues/:id` | Update league | ✅ API Key |
| `DELETE` | `/internal/leagues/:id` | Delete league | ✅ API Key |
| `GET` | `/internal/leagues/:id/settings` | Get league settings | ✅ API Key |
| `PATCH` | `/internal/leagues/:id/settings` | Update league settings | ✅ API Key |

**Example Bot Request:**
```bash
curl -H "Authorization: Bearer BOT_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"name":"Diamond League","guildId":"123456789012345678","game":"ROCKET_LEAGUE","createdBy":"bot"}' \
  http://localhost:3000/internal/leagues
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

### League Management (User)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/leagues/guild/:guildId` | List leagues in guild | ✅ JWT |
| `GET` | `/api/leagues/:id` | Get league details | ✅ JWT |
| `POST` | `/api/leagues` | Create league (requires admin) | ✅ JWT |
| `PATCH` | `/api/leagues/:id` | Update league (requires admin/league admin) | ✅ JWT |
| `PATCH` | `/api/leagues/:id/status` | Update league status (requires admin) | ✅ JWT |
| `DELETE` | `/api/leagues/:id` | Delete league (requires admin) | ✅ JWT |
| `GET` | `/api/leagues/:leagueId/settings` | Get league settings (requires admin) | ✅ JWT |
| `PATCH` | `/api/leagues/:leagueId/settings` | Update league settings (requires admin) | ✅ JWT |

**Query Parameters for `/api/leagues/guild/:guildId`:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `status` (optional): Filter by status (ACTIVE, PAUSED, ARCHIVED, CANCELLED)
- `game` (optional): Filter by game (ROCKET_LEAGUE, DOTA_2)

**Example User Request:**
```bash
# List leagues in guild
curl -H "Authorization: Bearer JWT_TOKEN" \
  "http://localhost:3000/api/leagues/guild/123456789012345678?status=ACTIVE&page=1&limit=10"

# Get league details
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://localhost:3000/api/leagues/clxyz1234567890

# Create league
curl -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"name":"Diamond League","guildId":"123456789012345678","game":"ROCKET_LEAGUE"}' \
  http://localhost:3000/api/leagues
```

### Organization Management (User)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/leagues/:leagueId/organizations` | List organizations in league | ✅ JWT |
| `GET` | `/api/organizations/:id` | Get organization details | ✅ JWT |
| `GET` | `/api/organizations/:id/teams` | List teams in organization | ✅ JWT |
| `GET` | `/api/organizations/:id/stats` | Get organization statistics | ✅ JWT |
| `POST` | `/api/leagues/:leagueId/organizations` | Create organization (creator becomes GM) | ✅ JWT |
| `PATCH` | `/api/organizations/:id` | Update organization (GM only) | ✅ JWT |
| `DELETE` | `/api/organizations/:id` | Delete organization (GM only, must have no teams) | ✅ JWT |
| `POST` | `/api/organizations/:id/teams/:teamId/transfer` | Transfer team to different organization (GM of source or target org) | ✅ JWT |
| `GET` | `/api/organizations/:id/members` | List organization members | ✅ JWT |
| `POST` | `/api/organizations/:id/members` | Add member to organization (GM only) | ✅ JWT |
| `PATCH` | `/api/organizations/:id/members/:memberId` | Update member role/status (GM only) | ✅ JWT |
| `DELETE` | `/api/organizations/:id/members/:memberId` | Remove member from organization (GM only, cannot remove last GM) | ✅ JWT |

**Example User Request:**
```bash
# List organizations in league
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://localhost:3000/api/leagues/clxyz1234567890/organizations

# Create organization
curl -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"name":"Alpha Organization","tag":"ALPHA","description":"A competitive organization"}' \
  http://localhost:3000/api/leagues/clxyz1234567890/organizations

# Transfer team
curl -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"targetOrganizationId":"clxorg1234567890"}' \
  http://localhost:3000/api/organizations/clxorg1234567890/teams/clxteam1234567890/transfer
```

### Organization Management (Bot)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/internal/organizations/:id` | Get organization (Bot only) | ✅ API Key |
| `POST` | `/internal/organizations` | Create organization (Bot only) | ✅ API Key |
| `PATCH` | `/internal/organizations/:id` | Update organization (Bot only) | ✅ API Key |
| `DELETE` | `/internal/organizations/:id` | Delete organization (Bot only) | ✅ API Key |
| `GET` | `/internal/organizations/:id/members` | List organization members (Bot only) | ✅ API Key |
| `POST` | `/internal/organizations/:id/members` | Add member to organization (Bot only) | ✅ API Key |
| `PATCH` | `/internal/organizations/:id/members/:memberId` | Update organization member (Bot only) | ✅ API Key |
| `DELETE` | `/internal/organizations/:id/members/:memberId` | Remove organization member (Bot only) | ✅ API Key |

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

### League Model

```typescript
interface League {
  id: string;                    // League ID (cuid)
  guildId: string;               // Discord guild ID
  name: string;                  // League name (max 200 chars)
  description?: string;          // League description
  status: LeagueStatus;          // League status (ACTIVE, PAUSED, ARCHIVED, CANCELLED)
  game?: Game;                   // Game type (ROCKET_LEAGUE, DOTA_2, or null for game-agnostic)
  createdBy: string;             // Discord user ID who created the league
  createdAt: Date;               // League creation date
  updatedAt: Date;               // Last update date
  guild?: Guild;                 // Related guild (if included)
}

enum LeagueStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
  CANCELLED = 'CANCELLED',
}

enum Game {
  ROCKET_LEAGUE = 'ROCKET_LEAGUE',
  DOTA_2 = 'DOTA_2',
}
```

### League Configuration

```typescript
interface LeagueConfiguration {
  _metadata?: ConfigMetadata;
  membership: MembershipConfig;
  game: GameConfig;
  skill: SkillConfig;
  visibility: VisibilityConfig;
  administration: AdministrationConfig;
}

interface MembershipConfig {
  joinMethod: 'OPEN' | 'INVITE_ONLY' | 'APPLICATION';
  requiresApproval: boolean;
  allowSelfRegistration: boolean;
  maxPlayers?: number | null;
  minPlayers?: number | null;
  maxTeams?: number | null;
  registrationOpen: boolean;
  registrationStartDate?: Date | null;
  registrationEndDate?: Date | null;
  autoCloseOnFull: boolean;
  requireGuildMembership: boolean;
  requirePlayerStatus: boolean;
  skillRequirements?: {
    minSkill?: number;
    maxSkill?: number;
    skillMetric: 'MMR' | 'RANK' | 'ELO' | 'CUSTOM';
  } | null;
  allowMultipleLeagues: boolean;
  cooldownAfterLeave?: number | null;
}

interface GameConfig {
  gameType?: 'ROCKET_LEAGUE' | 'DOTA_2' | null;
  platform?: Array<'STEAM' | 'EPIC' | 'XBL' | 'PSN' | 'SWITCH'> | null;
}

interface SkillConfig {
  isSkillBased: boolean;
  skillMetric?: 'MMR' | 'RANK' | 'ELO' | 'CUSTOM' | null;
  minSkillLevel?: number | null;
  maxSkillLevel?: number | null;
  requireTracker: boolean;
  trackerPlatforms?: Array<string> | null;
}

interface VisibilityConfig {
  isPublic: boolean;
  showInDirectory: boolean;
  allowSpectators: boolean;
}

interface AdministrationConfig {
  adminRoles?: Array<string>;
  allowPlayerReports: boolean;
  allowSuspensions: boolean;
  allowBans: boolean;
}
```

### League List Response

```typescript
interface LeagueListResponse {
  leagues: League[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
```

### Organization Model

```typescript
interface Organization {
  id: string;                    // Organization ID (cuid)
  leagueId: string;              // League ID (cuid)
  name: string;                  // Organization name (max 200 chars)
  tag?: string;                  // Organization tag (max 20 chars)
  description?: string;           // Organization description
  createdAt: Date;               // Organization creation date
  updatedAt: Date;               // Last update date
  league?: League;               // Related league (if included)
  members?: OrganizationMember[]; // Organization members (if included)
  teams?: Team[];                // Organization teams (if included)
}
```

### OrganizationMember Model

```typescript
interface OrganizationMember {
  id: string;                    // Member ID (cuid)
  organizationId: string;        // Organization ID (cuid)
  playerId: string;             // Player ID (cuid)
  leagueId: string;             // League ID (cuid)
  status: OrganizationMemberStatus; // Member status
  role: OrganizationMemberRole;   // Member role
  joinedAt: Date;               // Join date
  leftAt?: Date;                // Leave date (if removed)
  approvedBy?: string;          // User ID who approved (Discord user ID)
  approvedAt?: Date;             // Approval date
  notes?: string;                // Notes about the member
  createdAt: Date;               // Member creation date
  updatedAt: Date;               // Last update date
  organization?: Organization;   // Related organization (if included)
  player?: Player;               // Related player (if included)
  league?: League;               // Related league (if included)
}

enum OrganizationMemberRole {
  GENERAL_MANAGER = 'GENERAL_MANAGER',
  MEMBER = 'MEMBER',
}

enum OrganizationMemberStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  REMOVED = 'REMOVED',
}
```

### Organization Stats Response

```typescript
interface OrganizationStats {
  organizationId: string;
  name: string;
  teamCount: number;
  memberCount: number;
  generalManagerCount: number;
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
