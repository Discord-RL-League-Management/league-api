# GuildsModule - Behavioral Contract

## Module: GuildsModule
**Location**: `src/guilds/guilds.module.ts`

## Purpose
Manages Discord guild (server) information, settings, and access control within the League Management system.

## Behavioral Contract

### Responsibilities
1. **Guild CRUD Operations**: Create, read, update, delete guild records
2. **Guild Settings Management**: Manage guild-specific configuration
3. **Access Validation**: Validate user and bot access to guilds
4. **Guild Synchronization**: Sync guild data with Discord API
5. **Settings Defaults**: Provide default settings for new guilds

### Exported Services

#### GuildsService
- **Purpose**: Core guild management logic
- **Key Methods**:
  - `create(createGuildDto)`: Creates guild with default settings
  - `findAll(page, limit)`: Retrieves paginated list of guilds
  - `findOne(id, options)`: Retrieves guild by ID with optional relations
  - `update(id, updateGuildDto)`: Updates guild information
  - `findActiveGuildIds()`: Returns list of active guild IDs (for bot presence validation)

#### GuildSettingsService
- **Purpose**: Guild settings management
- **Key Methods**:
  - `getSettings(guildId)`: Retrieves guild settings (creates defaults if missing)
  - `updateSettings(guildId, settings)`: Updates guild settings
  - `validateSettings(settings)`: Validates settings structure

#### GuildAccessValidationService
- **Purpose**: Validates user and bot access to guilds
- **Key Methods**:
  - `validateUserGuildAccess(userId, guildId)`: Validates user is member of guild
  - `validateBotGuildAccess(guildId)`: Validates bot has access to guild

### Controllers

#### GuildsController (User-facing)
- **Endpoints**:
  - `GET /api/guilds/:id`: Returns guild details
  - `GET /api/guilds/:id/settings`: Returns guild settings (admin only)
  - `GET /api/guilds/:id/channels`: Returns Discord channels (admin only)
  - `GET /api/guilds/:id/roles`: Returns Discord roles (admin only)

#### InternalGuildsController (Bot-facing)
- **Endpoints**:
  - `GET /internal/guilds/:id`: Retrieves guild
  - `POST /internal/guilds`: Creates guild
  - `PATCH /internal/guilds/:id`: Updates guild
  - `DELETE /internal/guilds/:id`: Deletes guild

#### GuildSettingsController
- **Endpoints**:
  - `GET /api/guilds/:id/settings`: Returns guild settings
  - `PATCH /api/guilds/:id/settings`: Updates guild settings

### Behavioral Rules

1. **Guild Access**:
   - User must be member of guild to access guild endpoints
   - Bot must be present in guild for access validation
   - Access validation must occur before any data retrieval

2. **Settings Access**:
   - Settings endpoints require admin permissions
   - Settings are auto-created with defaults if missing
   - Settings validation must occur before update

3. **Permission Checks**:
   - Admin role checking must validate with Discord API when required
   - Settings must be fetched before permission validation
   - Permission checks must be consistent across endpoints

4. **Guild Creation**:
   - Guild ID must be Discord guild ID (snowflake)
   - Default settings must be applied on creation
   - Duplicate guild creation must be prevented

5. **Discord Integration**:
   - Channels and roles endpoints must fetch from Discord API
   - Discord API errors must be handled gracefully
   - Rate limiting must be considered

### Dependencies
- **GuildMembersModule**: For membership validation
- **DiscordModule**: For Discord API access
- **CommonModule**: For AdminGuard and permission checking
- **InfrastructureModule**: For settings storage
- **MmrCalculationModule**: For MMR calculation settings

### Related Features
- `features/guild-management.feature`

### Related Implementation
- `src/guilds/guilds.service.ts`
- `src/guilds/guilds.controller.ts`
- `src/guilds/guild-settings.service.ts`
- `src/guilds/services/guild-access-validation.service.ts`
- `src/guilds/repositories/guild.repository.ts`


