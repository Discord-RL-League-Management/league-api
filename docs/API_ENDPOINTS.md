# API Endpoints

This document provides a comprehensive reference of all available API endpoints in the League Management System.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

## CORS Configuration

The API implements a restrictive CORS policy. Requests without origin headers are only allowed for:
- Health check endpoints (`/health*`)
- Authenticated requests (with valid `Authorization` header)
- Development environment (all requests)

For detailed CORS configuration, see [CORS Configuration](./CORS_CONFIGURATION.md).

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

### Players

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/players/me` | Get current user's players | ✅ JWT |
| `GET` | `/api/players/guild/:guildId` | List players in guild | ✅ JWT |
| `GET` | `/api/players/:id` | Get player details | ✅ JWT |
| `PATCH` | `/api/players/:id` | Update player | ✅ JWT |

**Query Parameters for `/api/players/me` and `/api/players/guild/:guildId`:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by status

**Example User Request:**
```bash
# Get my players
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://localhost:3000/api/players/me

# List players in guild
curl -H "Authorization: Bearer JWT_TOKEN" \
  "http://localhost:3000/api/players/guild/123456789012345678?page=1&limit=10"
```

### Trackers

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/trackers/register` | Register 1-4 tracker URLs (for new users) | ✅ JWT |
| `GET` | `/api/trackers/me` | Get current user's trackers | ✅ JWT |
| `GET` | `/api/trackers` | Get current user's trackers with query options | ✅ JWT |
| `GET` | `/api/trackers/:id` | Get tracker details | ✅ JWT |
| `GET` | `/api/trackers/:id/detail` | Get tracker details with all seasons | ✅ JWT |
| `GET` | `/api/trackers/:id/status` | Get scraping status for a tracker | ✅ JWT |
| `GET` | `/api/trackers/:id/seasons` | Get all seasons for a tracker | ✅ JWT |
| `GET` | `/api/trackers/:id/snapshots` | Get snapshots for a tracker | ✅ JWT |
| `POST` | `/api/trackers/:id/snapshots` | Create a new snapshot for a tracker | ✅ JWT |
| `PUT` | `/api/trackers/:id` | Update tracker metadata | ✅ JWT |
| `DELETE` | `/api/trackers/:id` | Soft delete a tracker | ✅ JWT |
| `POST` | `/api/trackers/add` | Add an additional tracker (up to 4 total) | ✅ JWT |

**Query Parameters for `/api/trackers/me` and `/api/trackers`:**
- `platform` (optional): Filter by platform (STEAM, EPIC, etc.) - single value or comma-separated array
- `status` (optional): Filter by scraping status (PENDING, IN_PROGRESS, COMPLETED, FAILED) - single value or comma-separated array
- `isActive` (optional): Filter by active status (true/false)
- `page` (optional): Page number (1-based, default: 1)
- `limit` (optional): Items per page (max 100, default: 50)
- `sortBy` (optional): Field to sort by (createdAt, updatedAt, lastScrapedAt)
- `sortOrder` (optional): Sort order (asc, desc, default: desc)

**Response Format:**
Both endpoints return a paginated response:
```json
{
  "data": [/* tracker objects */],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 10,
    "pages": 1
  }
}
```

**Query Parameters for `/api/trackers/:id/snapshots`:**
- `season` (optional): Filter by season number

**Example User Request:**
```bash
# Register trackers
curl -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"urls":["https://tracker.network/profile/steam/123"]}' \
  http://localhost:3000/api/trackers/register

# Get my trackers
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://localhost:3000/api/trackers/me
```

### Guilds

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/guilds/:id` | Get guild details | ✅ JWT |
| `GET` | `/api/guilds/:id/settings` | Get guild settings (admin only) | ✅ JWT |
| `GET` | `/api/guilds/:id/channels` | Get Discord channels for guild (admin only) | ✅ JWT |
| `GET` | `/api/guilds/:id/roles` | Get Discord roles for guild (admin only) | ✅ JWT |

**Example User Request:**
```bash
# Get guild details
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://localhost:3000/api/guilds/123456789012345678

# Get guild settings (admin only)
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://localhost:3000/api/guilds/123456789012345678/settings
```

### Guild Members

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/guilds/:guildId/members` | Get guild members with pagination | ✅ JWT |
| `GET` | `/api/guilds/:guildId/members/search` | Search guild members | ✅ JWT |
| `GET` | `/api/guilds/:guildId/members/stats` | Get guild member statistics | ✅ JWT |
| `GET` | `/api/guilds/:guildId/members/:userId` | Get specific guild member | ✅ JWT |
| `POST` | `/api/guilds/:guildId/members` | Create guild member (admin only) | ✅ JWT |
| `PATCH` | `/api/guilds/:guildId/members/:userId` | Update guild member (admin only) | ✅ JWT |
| `DELETE` | `/api/guilds/:guildId/members/:userId` | Remove guild member (admin only) | ✅ JWT |
| `POST` | `/api/guilds/:guildId/members/sync` | Sync all guild members (admin only) | ✅ JWT |

**Query Parameters for `/api/guilds/:guildId/members`:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)

**Query Parameters for `/api/guilds/:guildId/members/search`:**
- `q` (required): Search query
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Example User Request:**
```bash
# Get guild members
curl -H "Authorization: Bearer JWT_TOKEN" \
  "http://localhost:3000/api/guilds/123456789012345678/members?page=1&limit=50"

# Search guild members
curl -H "Authorization: Bearer JWT_TOKEN" \
  "http://localhost:3000/api/guilds/123456789012345678/members/search?q=john&page=1"
```

### Guild Settings

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/guilds/:guildId/settings` | Get guild settings (admin only) | ✅ JWT |
| `PATCH` | `/api/guilds/:guildId/settings` | Update guild settings (admin only) | ✅ JWT |
| `POST` | `/api/guilds/:guildId/settings/reset` | Reset guild settings to defaults (admin only) | ✅ JWT |
| `GET` | `/api/guilds/:guildId/settings/history` | Get guild settings history (admin only) | ✅ JWT |

**Query Parameters for `/api/guilds/:guildId/settings/history`:**
- `limit` (optional): Maximum number of history entries (default: 50)

**Example User Request:**
```bash
# Get guild settings
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://localhost:3000/api/guilds/123456789012345678/settings

# Update guild settings
curl -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -X PATCH \
  -d '{"mmrCalculation":{"algorithm":"WEIGHTED_AVERAGE"}}' \
  http://localhost:3000/api/guilds/123456789012345678/settings
```

### Permissions

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/guilds/:guildId/permissions/me` | Get current user's permissions in a guild | ✅ JWT |

**Example User Request:**
```bash
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://localhost:3000/api/guilds/123456789012345678/permissions/me
```

### Audit Logs

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/guilds/:guildId/audit-logs` | Get audit logs for a guild (admin only) | ✅ JWT |

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `action` (optional): Filter by action type
- `startDate` (optional): Start date for filter
- `endDate` (optional): End date for filter
- `limit` (optional): Number of results (max 100)
- `offset` (optional): Offset for pagination

**Example User Request:**
```bash
curl -H "Authorization: Bearer JWT_TOKEN" \
  "http://localhost:3000/api/guilds/123456789012345678/audit-logs?limit=50&offset=0"
```

### League Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/leagues/guild/:guildId` | List leagues in guild | ✅ JWT |
| `GET` | `/api/leagues/:id` | Get league details | ✅ JWT |
| `POST` | `/api/leagues` | Create league (requires admin) | ✅ JWT |
| `PATCH` | `/api/leagues/:id` | Update league (requires admin/league admin) | ✅ JWT |
| `PATCH` | `/api/leagues/:id/status` | Update league status (requires admin) | ✅ JWT |
| `DELETE` | `/api/leagues/:id` | Delete league (requires admin) | ✅ JWT |

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

### League Members

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/leagues/:leagueId/members` | List league members | ✅ JWT |
| `POST` | `/api/leagues/:leagueId/members` | Join a league | ✅ JWT |
| `DELETE` | `/api/leagues/:leagueId/members/:playerId` | Leave a league | ✅ JWT |
| `PATCH` | `/api/leagues/:leagueId/members/:playerId` | Update league member | ✅ JWT |

**Query Parameters for `/api/leagues/:leagueId/members`:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by status

**Example User Request:**
```bash
# Join league
curl -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"playerId":"clxyz1234567890"}' \
  http://localhost:3000/api/leagues/clxyz1234567890/members

# List league members
curl -H "Authorization: Bearer JWT_TOKEN" \
  "http://localhost:3000/api/leagues/clxyz1234567890/members?page=1&limit=50"
```

### League Settings

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/leagues/:leagueId/settings` | Get league settings (requires admin/moderator) | ✅ JWT |
| `PATCH` | `/api/leagues/:leagueId/settings` | Update league settings (requires admin) | ✅ JWT |

**Example User Request:**
```bash
# Get league settings
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://localhost:3000/api/leagues/clxyz1234567890/settings

# Update league settings
curl -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -X PATCH \
  -d '{"membership":{"joinMethod":"OPEN"}}' \
  http://localhost:3000/api/leagues/clxyz1234567890/settings
```

### Teams

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/leagues/:leagueId/teams` | List teams in league | ✅ JWT |
| `GET` | `/api/leagues/:leagueId/teams/:id` | Get team details | ✅ JWT |
| `POST` | `/api/leagues/:leagueId/teams` | Create team | ✅ JWT |
| `PATCH` | `/api/leagues/:leagueId/teams/:id` | Update team | ✅ JWT |
| `DELETE` | `/api/leagues/:leagueId/teams/:id` | Delete team | ✅ JWT |

**Example User Request:**
```bash
# List teams in league
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://localhost:3000/api/leagues/clxyz1234567890/teams

# Create team
curl -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"name":"Team Alpha","tag":"ALPHA"}' \
  http://localhost:3000/api/leagues/clxyz1234567890/teams
```

### Team Members

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/teams/:teamId/members` | List team members | ✅ JWT |
| `POST` | `/api/teams/:teamId/members` | Add team member | ✅ JWT |
| `PATCH` | `/api/teams/:teamId/members/:id` | Update team member | ✅ JWT |
| `DELETE` | `/api/teams/:teamId/members/:id` | Remove team member | ✅ JWT |

**Example User Request:**
```bash
# List team members
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://localhost:3000/api/teams/clxteam1234567890/members

# Add team member
curl -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"playerId":"clxyz1234567890","role":"CAPTAIN"}' \
  http://localhost:3000/api/teams/clxteam1234567890/members
```

### Organization Management

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

### Matches

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/matches/:id` | Get match details | ✅ JWT |
| `POST` | `/api/matches` | Create match | ✅ JWT |
| `POST` | `/api/matches/:id/participants` | Add match participant | ✅ JWT |
| `PATCH` | `/api/matches/:id/status` | Update match status | ✅ JWT |
| `POST` | `/api/matches/:id/complete` | Complete match and update stats/ratings | ✅ JWT |

**Example User Request:**
```bash
# Create match
curl -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"leagueId":"clxyz1234567890","team1Id":"clxteam1234567890","team2Id":"clxteam0987654321"}' \
  http://localhost:3000/api/matches

# Complete match
curl -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"winnerId":"clxteam1234567890"}' \
  http://localhost:3000/api/matches/clxmatch1234567890/complete
```

### Tournaments

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/tournaments/:id` | Get tournament details | ✅ JWT |
| `POST` | `/api/tournaments` | Create tournament | ✅ JWT |
| `POST` | `/api/tournaments/:id/register` | Register participant | ✅ JWT |

**Example User Request:**
```bash
# Create tournament
curl -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"name":"Spring Championship","leagueId":"clxyz1234567890"}' \
  http://localhost:3000/api/tournaments

# Register participant
curl -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"playerId":"clxyz1234567890","leagueId":"clxyz1234567890"}' \
  http://localhost:3000/api/tournaments/clxtour1234567890/register
```

### Player Stats & Ratings

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/players/:playerId/stats/league/:leagueId` | Get player stats for league | ✅ JWT |
| `GET` | `/api/leagues/:leagueId/leaderboard` | Get league leaderboard | ✅ JWT |
| `GET` | `/api/players/:playerId/ratings/league/:leagueId` | Get player rating for league | ✅ JWT |
| `GET` | `/api/leagues/:leagueId/standings` | Get league standings | ✅ JWT |

**Query Parameters for `/api/leagues/:leagueId/leaderboard` and `/api/leagues/:leagueId/standings`:**
- `limit` (optional): Number of results (default: 10)

**Example User Request:**
```bash
# Get player stats
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://localhost:3000/api/players/clxyz1234567890/stats/league/clxyz1234567890

# Get league leaderboard
curl -H "Authorization: Bearer JWT_TOKEN" \
  "http://localhost:3000/api/leagues/clxyz1234567890/leaderboard?limit=20"

# Get league standings
curl -H "Authorization: Bearer JWT_TOKEN" \
  "http://localhost:3000/api/leagues/clxyz1234567890/standings?limit=20"
```

### MMR Calculation & Calculator

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/calculator` | Calculate MMR using guild configuration (public, JWT required) | ✅ JWT |
| `POST` | `/api/mmr-calculation/test-formula` | Test custom MMR formula (admin only) | ✅ JWT + Admin |
| `POST` | `/api/mmr-calculation/validate-formula` | Validate custom MMR formula (admin only) | ✅ JWT + Admin |
| `POST` | `/api/mmr-calculation/calculate-mmr` | Calculate MMR (admin only) | ✅ JWT + Admin |

**Example User Request:**
```bash
# Calculate MMR (public endpoint)
curl -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"guildId":"123456789012345678","trackerData":{"ones":1500,"twos":1600}}' \
  http://localhost:3000/api/calculator

# Test formula (admin only)
curl -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"formula":"(ones + twos) / 2","testData":{"ones":1500,"twos":1600}}' \
  http://localhost:3000/api/mmr-calculation/test-formula
```

---

## Admin Endpoints (JWT + Admin Guard Required)

### Tracker Admin

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/admin/trackers` | List all trackers (Admin only) | ✅ JWT + Admin |
| `GET` | `/api/admin/trackers/scraping-status` | Get overview of scraping status (Admin only) | ✅ JWT + Admin |
| `GET` | `/api/admin/trackers/scraping-logs` | Get scraping logs (Admin only) | ✅ JWT + Admin |
| `POST` | `/api/admin/trackers/:id/refresh` | Manually trigger refresh for a tracker (Admin only) | ✅ JWT + Admin |
| `POST` | `/api/admin/trackers/batch-refresh` | Trigger batch refresh for multiple trackers (Admin only) | ✅ JWT + Admin |

**Query Parameters for `/api/admin/trackers`:**
- `status` (optional): Filter by scraping status (PENDING, IN_PROGRESS, COMPLETED, FAILED)
- `platform` (optional): Filter by platform
- `page` (optional): Page number
- `limit` (optional): Items per page

**Query Parameters for `/api/admin/trackers/scraping-logs`:**
- `trackerId` (optional): Filter by tracker ID
- `status` (optional): Filter by status
- `page` (optional): Page number
- `limit` (optional): Items per page

**Example Admin Request:**
```bash
# List all trackers
curl -H "Authorization: Bearer JWT_TOKEN" \
  "http://localhost:3000/api/admin/trackers?status=PENDING&page=1&limit=50"

# Get scraping status overview
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://localhost:3000/api/admin/trackers/scraping-status

# Batch refresh
curl -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"trackerIds":["clxyz1234567890","clxyz0987654321"]}' \
  http://localhost:3000/api/admin/trackers/batch-refresh
```

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

### Tracker Management (Bot)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/internal/trackers/register-multiple` | Register multiple trackers (Bot only) | ✅ API Key |
| `POST` | `/internal/trackers/add` | Add an additional tracker (Bot only) | ✅ API Key |
| `POST` | `/internal/trackers/process-pending` | Process all pending trackers (Bot only) | ✅ API Key |
| `POST` | `/internal/trackers/process` | Process pending trackers for a specific guild (Bot only) | ✅ API Key |

**Example Bot Request:**
```bash
# Register multiple trackers
curl -H "Authorization: Bearer BOT_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"userId":"123456789012345678","urls":["https://tracker.network/profile/steam/123"],"userData":{},"channelId":"987654321098765432"}' \
  http://localhost:3000/internal/trackers/register-multiple
```

### Scheduled Tracker Processing (Bot)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/internal/trackers/schedule` | Schedule tracker processing for a specific guild (Bot only) | ✅ API Key |
| `GET` | `/internal/trackers/schedule/guild/:guildId` | Get all scheduled tracker processing jobs for a guild (Bot only) | ✅ API Key |
| `POST` | `/internal/trackers/schedule/:id/cancel` | Cancel a scheduled tracker processing job (Bot only) | ✅ API Key |

**Query Parameters for `/internal/trackers/schedule/guild/:guildId`:**
- `status` (optional): Filter by status (PENDING, COMPLETED, CANCELLED, FAILED)
- `includeCompleted` (optional): Include completed schedules (default: true). Ignored if status is provided.

**Example Bot Request:**
```bash
# Schedule tracker processing
curl -H "Authorization: Bearer BOT_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"guildId":"987654321098765432","scheduledAt":"2025-02-01T10:00:00Z","createdBy":"123456789012345678","metadata":{"reason":"Season 15 start"}}' \
  http://localhost:3000/internal/trackers/schedule

# Get scheduled jobs for a guild
curl -H "Authorization: Bearer BOT_API_KEY" \
  "http://localhost:3000/internal/trackers/schedule/guild/987654321098765432?status=PENDING"

# Cancel a scheduled job
curl -H "Authorization: Bearer BOT_API_KEY" \
  -X POST \
  http://localhost:3000/internal/trackers/schedule/clxyz1234567890/cancel
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
