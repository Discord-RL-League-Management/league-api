# LeaguesModule - Behavioral Contract

## Module: LeaguesModule
**Location**: `src/leagues/leagues.module.ts`

## Purpose
Manages competitive leagues within Discord guilds, including league creation, configuration, status management, and access control.

## Behavioral Contract

### Responsibilities
1. **League CRUD Operations**: Create, read, update, delete leagues
2. **League Settings Management**: Manage league-specific configuration
3. **League Status Management**: Handle league status transitions (ACTIVE, PAUSED, ARCHIVED, CANCELLED)
4. **Access Control**: Validate user permissions for league operations
5. **Settings Defaults**: Provide default settings for new leagues

### Exported Services

#### LeaguesService
- **Purpose**: Core league management logic
- **Key Methods**:
  - `create(createLeagueDto, createdBy)`: Creates league with default settings
  - `findAll(options)`: Retrieves paginated/filtered list of leagues
  - `findOne(id, options)`: Retrieves league by ID with optional relations
  - `update(id, updateLeagueDto)`: Updates league information
  - `updateStatus(id, status)`: Updates league status

#### LeagueSettingsService
- **Purpose**: League settings management
- **Key Methods**:
  - `getSettings(leagueId)`: Retrieves league settings (creates defaults if missing)
  - `updateSettings(leagueId, settings)`: Updates league settings
  - `validateSettings(settings)`: Validates settings structure

#### LeagueAccessValidationService
- **Purpose**: Validates user access to leagues
- **Key Methods**:
  - `validateUserLeagueAccess(userId, leagueId)`: Validates user can access league
  - `validateLeagueExists(leagueId)`: Validates league exists

#### LeaguePermissionService
- **Purpose**: League permission management
- **Key Methods**:
  - `checkAdminPermissions(userId, leagueId)`: Checks if user is league admin
  - `checkLeagueAdminPermissions(userId, leagueId)`: Checks league-specific admin permissions

### Controllers

#### LeaguesController (User-facing)
- **Endpoints**:
  - `GET /api/leagues/guild/:guildId`: Lists leagues in guild (with filters)
  - `GET /api/leagues/:id`: Returns league details
  - `POST /api/leagues`: Creates league (admin only)
  - `PATCH /api/leagues/:id`: Updates league (admin/league admin)
  - `PATCH /api/leagues/:id/status`: Updates league status (admin only)
  - `DELETE /api/leagues/:id`: Deletes league (admin only)
  - `GET /api/leagues/:leagueId/settings`: Returns league settings (admin only)
  - `PATCH /api/leagues/:leagueId/settings`: Updates league settings (admin only)

#### InternalLeaguesController (Bot-facing)
- **Endpoints**:
  - `GET /internal/leagues/:id`: Retrieves league
  - `POST /internal/leagues`: Creates league
  - `PATCH /internal/leagues/:id`: Updates league
  - `DELETE /internal/leagues/:id`: Deletes league
  - `GET /internal/leagues/:id/settings`: Returns league settings
  - `PATCH /internal/leagues/:id/settings`: Updates league settings

#### LeagueSettingsController
- **Endpoints**:
  - `GET /api/leagues/:leagueId/settings`: Returns league settings
  - `PATCH /api/leagues/:leagueId/settings`: Updates league settings

### Behavioral Rules

1. **League Creation**:
   - Must be created within a guild
   - Must have default settings applied
   - Creator must be set (user ID or "bot")
   - Default status is ACTIVE if not specified

2. **League Listing**:
   - Must support pagination (page, limit)
   - Must support filtering by status and game
   - Must validate user has access to guild

3. **League Access**:
   - User must have access to league's guild
   - Admin operations require admin role in guild
   - League admin operations require league-specific admin permissions

4. **Status Transitions**:
   - Status updates require admin permissions
   - Status transitions must be validated (e.g., cannot reactivate CANCELLED league)
   - Status changes should trigger appropriate side effects

5. **Settings Management**:
   - Settings must be validated before update
   - Settings structure must match configuration schema
   - Settings are auto-created with defaults if missing

6. **Query Parameters**:
   - `page`: Page number (default: 1)
   - `limit`: Items per page (default: 50)
   - `status`: Filter by status (ACTIVE, PAUSED, ARCHIVED, CANCELLED)
   - `game`: Filter by game (ROCKET_LEAGUE, DOTA_2)

### Dependencies
- **GuildsModule**: For guild validation
- **LeagueMembersModule**: For membership management (forwardRef)
- **PlayersModule**: For player validation
- **CommonModule**: For permission guards
- **InfrastructureModule**: For settings storage

### Related Features
- `features/league-management.feature`

### Related Implementation
- `src/leagues/leagues.service.ts`
- `src/leagues/leagues.controller.ts`
- `src/leagues/league-settings.service.ts`
- `src/leagues/services/league-access-validation.service.ts`
- `src/leagues/repositories/league.repository.ts`


