# System Map - Feature to Spec to Implementation Traceability
## Generated: 2025-01-27

This document provides traceability mapping from user-facing features (Gherkin) to module behavioral contracts (specs) to implementation files.

---

## Feature: Authentication (`features/authentication.feature`)

### Module Spec: `specs/auth.module.md`
- **Purpose**: Authentication and authorization services

### Implementation Files
- `src/auth/auth.module.ts` - Module definition
- `src/auth/auth.service.ts` - Core authentication logic
- `src/auth/auth.controller.ts` - Authentication endpoints
- `src/auth/services/discord-oauth.service.ts` - OAuth flow management
- `src/auth/services/token-management.service.ts` - Token lifecycle management
- `src/auth/guards/jwt-auth.guard.ts` - JWT authentication guard
- `src/auth/guards/bot-auth.guard.ts` - Bot API key guard
- `src/auth/strategies/jwt.strategy.ts` - JWT strategy
- `src/auth/strategies/bot-api-key.strategy.ts` - Bot API key strategy
- `src/auth/decorators/current-user.decorator.ts` - Current user decorator
- `src/auth/dto/login.dto.ts` - Login DTO

### Scenarios Covered
- Discord OAuth flow initiation
- OAuth callback handling
- JWT token generation and refresh
- User session management
- Guild synchronization during OAuth

---

## Feature: User Management (`features/user-management.feature`)

### Module Spec: `specs/users.module.md`
- **Purpose**: User profile and data management

### Implementation Files
- `src/users/users.module.ts` - Module definition
- `src/users/users.service.ts` - User CRUD operations
- `src/users/users.controller.ts` - User-facing endpoints
- `src/users/internal-users.controller.ts` - Bot-facing endpoints
- `src/users/services/user-orchestrator.service.ts` - User orchestration
- `src/users/repositories/user.repository.ts` - User repository
- `src/users/dto/create-user.dto.ts` - Create user DTO
- `src/users/dto/update-user.dto.ts` - Update user DTO
- `src/users/dto/update-user-profile.dto.ts` - Update profile DTO
- `src/users/transformers/user.transformer.ts` - User transformation

### Scenarios Covered
- User profile retrieval
- User data updates
- User statistics
- Bot user management (CRUD)

---

## Feature: Guild Management (`features/guild-management.feature`)

### Module Spec: `specs/guilds.module.md`
- **Purpose**: Discord guild management and settings

### Implementation Files
- `src/guilds/guilds.module.ts` - Module definition
- `src/guilds/guilds.service.ts` - Guild CRUD operations
- `src/guilds/guilds.controller.ts` - User-facing endpoints
- `src/guilds/internal-guilds.controller.ts` - Bot-facing endpoints
- `src/guilds/guild-settings.service.ts` - Settings management
- `src/guilds/guild-settings.controller.ts` - Settings endpoints
- `src/guilds/services/guild-access-validation.service.ts` - Access validation
- `src/guilds/services/settings-defaults.service.ts` - Default settings
- `src/guilds/services/settings-validation.service.ts` - Settings validation
- `src/guilds/services/guild-sync.service.ts` - Guild synchronization
- `src/guilds/services/guild-error-handler.service.ts` - Error handling
- `src/guilds/repositories/guild.repository.ts` - Guild repository
- `src/guilds/adapters/guild-access-provider.adapter.ts` - Guild access adapter
- `src/guilds/dto/create-guild.dto.ts` - Create guild DTO
- `src/guilds/dto/update-guild.dto.ts` - Update guild DTO
- `src/guilds/dto/guild-settings.dto.ts` - Settings DTO
- `src/guilds/interfaces/settings.interface.ts` - Settings interface

### Scenarios Covered
- Guild retrieval
- Guild settings management
- Discord channels and roles retrieval
- Access validation
- Bot guild management

---

## Feature: League Management (`features/league-management.feature`)

### Module Spec: `specs/leagues.module.md`
- **Purpose**: League creation and management

### Implementation Files
- `src/leagues/leagues.module.ts` - Module definition
- `src/leagues/leagues.service.ts` - League CRUD operations
- `src/leagues/leagues.controller.ts` - User-facing endpoints
- `src/leagues/internal-leagues.controller.ts` - Bot-facing endpoints
- `src/leagues/league-settings.service.ts` - Settings management
- `src/leagues/league-settings.controller.ts` - Settings endpoints
- `src/leagues/services/league-access-validation.service.ts` - Access validation
- `src/leagues/services/league-permission.service.ts` - Permission checking
- `src/leagues/services/league-settings-defaults.service.ts` - Default settings
- `src/leagues/services/settings-validation.service.ts` - Settings validation
- `src/leagues/services/config-migration.service.ts` - Config migration
- `src/leagues/repositories/league.repository.ts` - League repository
- `src/leagues/dto/create-league.dto.ts` - Create league DTO
- `src/leagues/dto/update-league.dto.ts` - Update league DTO
- `src/leagues/dto/update-league-status.dto.ts` - Status update DTO
- `src/leagues/interfaces/league-query.options.ts` - Query options
- `src/leagues/exceptions/league.exceptions.ts` - League exceptions

### Scenarios Covered
- League listing with filters
- League creation and updates
- League status management
- League settings management
- Permission validation

---

## Feature: Tracker Management (`features/tracker-management.feature`)

### Module Spec: `specs/trackers.module.md`
- **Purpose**: Tracker registration and processing

### Implementation Files
- `src/trackers/trackers.module.ts` - Module definition
- `src/trackers/services/tracker.service.ts` - Core tracker service
- `src/trackers/controllers/tracker.controller.ts` - User-facing endpoints
- `src/trackers/controllers/tracker-admin.controller.ts` - Admin endpoints
- `src/internal/internal-tracker.controller.ts` - Bot-facing endpoints
- `src/trackers/services/tracker-scraping-queue.service.ts` - Queue management
- `src/trackers/services/scheduled-tracker-processing.service.ts` - Scheduled processing
- `src/trackers/services/tracker-snapshot.service.ts` - Snapshot management
- `src/trackers/services/tracker-notification.service.ts` - Notification service
- `src/trackers/services/tracker-validation.service.ts` - URL validation
- `src/trackers/services/tracker-url-converter.service.ts` - URL conversion
- `src/trackers/services/tracker-scraper.service.ts` - Scraper service
- `src/trackers/services/tracker-season.service.ts` - Season management
- `src/trackers/services/tracker-user-orchestrator.service.ts` - User orchestration
- `src/trackers/services/tracker-queue-orchestrator.service.ts` - Queue orchestration
- `src/trackers/services/tracker-batch-processor.service.ts` - Batch processing
- `src/trackers/services/tracker-processing-guard.service.ts` - Processing guard
- `src/trackers/services/tracker-refresh-scheduler.service.ts` - Refresh scheduler
- `src/trackers/services/tracker-batch-refresh.service.ts` - Batch refresh
- `src/trackers/services/notification-builder.service.ts` - Notification builder
- `src/trackers/services/discord-message.service.ts` - Discord messaging
- `src/trackers/repositories/tracker.repository.ts` - Tracker repository
- `src/trackers/repositories/tracker-snapshot.repository.ts` - Snapshot repository
- `src/trackers/queues/tracker-scraping.queue.ts` - Queue definition
- `src/trackers/queues/tracker-scraping.processor.ts` - Queue processor
- `src/trackers/dto/tracker.dto.ts` - Tracker DTOs
- `src/trackers/dto/tracker-snapshot.dto.ts` - Snapshot DTO
- `src/trackers/dto/batch-refresh.dto.ts` - Batch refresh DTO
- `src/internal/dto/register-trackers.dto.ts` - Register trackers DTO
- `src/internal/dto/add-tracker.dto.ts` - Add tracker DTO
- `src/internal/dto/process-trackers.dto.ts` - Process trackers DTO
- `src/internal/dto/schedule-tracker-processing.dto.ts` - Schedule DTO

### Scenarios Covered
- Tracker registration (1-4 trackers)
- Additional tracker addition
- Tracker retrieval and status checking
- Manual refresh triggering
- Scheduled batch processing
- Bot tracker management

---

## Feature: Organization Management (`features/organization-management.feature`)

### Module Spec: `specs/organizations.module.md`
- **Purpose**: Organization creation and management

### Implementation Files
- `src/organizations/organizations.module.ts` - Module definition
- `src/organizations/services/organization.service.ts` - Organization CRUD
- `src/organizations/services/organization-member.service.ts` - Member management
- `src/organizations/services/organization-validation.service.ts` - Validation
- `src/organizations/organizations.controller.ts` - User-facing endpoints
- `src/organizations/internal-organizations.controller.ts` - Bot-facing endpoints
- `src/organizations/repositories/organization.repository.ts` - Organization repository
- `src/organizations/guards/organization-gm.guard.ts` - GM guard
- `src/organizations/dto/create-organization.dto.ts` - Create DTO
- `src/organizations/dto/update-organization.dto.ts` - Update DTO
- `src/organizations/exceptions/organization.exceptions.ts` - Exceptions

### Scenarios Covered
- Organization listing and retrieval
- Organization creation and updates
- Member management (add/update/remove)
- Team transfer between organizations
- General Manager permissions
- Organization statistics

---

## Feature: Team Management (`features/team-management.feature`)

### Module Spec: `specs/teams.module.md`
- **Purpose**: Team creation and management

### Implementation Files
- `src/teams/teams.module.ts` - Module definition
- `src/teams/services/team.service.ts` - Team CRUD operations
- `src/teams/services/team-validation.service.ts` - Team validation
- `src/teams/teams.controller.ts` - User-facing endpoints
- `src/teams/internal-teams.controller.ts` - Bot-facing endpoints
- `src/teams/repositories/team.repository.ts` - Team repository
- `src/teams/dto/create-team.dto.ts` - Create team DTO
- `src/teams/dto/update-team.dto.ts` - Update team DTO
- `src/teams/exceptions/team.exceptions.ts` - Team exceptions

### Scenarios Covered
- Team listing and retrieval
- Team creation and updates
- Team member management
- Team deletion
- Bot team management

---

## Feature: Match Management (`features/match-management.feature`)

### Module Spec: `specs/matches.module.md`
- **Purpose**: Match creation and tracking

### Implementation Files
- `src/matches/matches.module.ts` - Module definition
- `src/matches/services/match.service.ts` - Match CRUD operations
- `src/matches/matches.controller.ts` - Match endpoints
- `src/matches/repositories/match.repository.ts` - Match repository
- `src/matches/repositories/match-participant.repository.ts` - Participant repository
- `src/matches/dto/create-match.dto.ts` - Create match DTO
- `src/matches/dto/update-match.dto.ts` - Update match DTO
- `src/matches/dto/complete-match.dto.ts` - Complete match DTO
- `src/matches/dto/update-match-status.dto.ts` - Status update DTO

### Scenarios Covered
- Match listing and retrieval
- Match creation (admin only)
- Score recording
- Match status updates
- Match deletion

---

## Feature: Health Check (`features/health-check.feature`)

### Module Spec: (No dedicated spec - infrastructure concern)
- **Purpose**: System health monitoring

### Implementation Files
- `src/health/health.module.ts` - Health module
- `src/health/health.controller.ts` - Health endpoints
- `src/health/indicators/discord-api.health.ts` - Discord API health indicator

### Scenarios Covered
- Public health check
- Bot internal health check

---

## Cross-Cutting Modules

### CommonModule (`specs/common.module.md`)

#### Implementation Files
- `src/common/common.module.ts` - Module definition
- `src/common/guards/admin.guard.ts` - Admin guard
- `src/common/guards/system-admin.guard.ts` - System admin guard
- `src/common/guards/resource-ownership.guard.ts` - Resource ownership guard
- `src/common/encryption.service.ts` - Encryption service
- `src/common/interceptors/request-context.interceptor.ts` - Request context
- `src/common/middleware/auth-logger.middleware.ts` - Auth logging middleware
- `src/common/filters/prisma-exception.filter.ts` - Prisma exception filter
- `src/common/filters/global-exception.filter.ts` - Global exception filter
- `src/common/pipes/parse-cuid.pipe.ts` - CUID parser
- `src/common/pipes/parse-enum.pipe.ts` - Enum parser
- `src/common/pipes/parse-int.pipe.ts` - Integer parser
- `src/common/pipes/parse-uuid.pipe.ts` - UUID parser
- `src/common/decorators/public.decorator.ts` - Public decorator
- `src/common/decorators/roles.decorator.ts` - Roles decorator
- `src/common/interfaces/*.ts` - Interface definitions

### InfrastructureModule (`specs/infrastructure.module.md`)

#### Implementation Files
- `src/infrastructure/infrastructure.module.ts` - Module definition
- `src/infrastructure/outbox/` - Outbox pattern implementation
- `src/infrastructure/idempotency/` - Idempotency implementation
- `src/infrastructure/activity-log/` - Activity logging
- `src/infrastructure/settings/` - Settings storage
- `src/infrastructure/visibility/` - Visibility management

---

## Additional Modules (Not yet fully mapped)

### ProfileModule
- `src/profile/profile.module.ts`
- `src/profile/profile.service.ts`
- `src/profile/profile.controller.ts`
- `src/profile/services/user-statistics.service.ts`
- `src/profile/services/user-settings.service.ts`

### LeagueMembersModule
- `src/league-members/league-members.module.ts`
- `src/league-members/services/league-member.service.ts`
- `src/league-members/services/league-join-validation.service.ts`
- `src/league-members/league-members.controller.ts`

### TeamMembersModule
- `src/team-members/team-members.module.ts`
- `src/team-members/services/team-member.service.ts`
- `src/team-members/team-members.controller.ts`

### PlayersModule
- `src/players/players.module.ts`
- `src/players/services/player.service.ts`
- `src/players/services/player-validation.service.ts`
- `src/players/services/player-ownership.service.ts`

### PlayerStatsModule
- `src/player-stats/player-stats.module.ts`
- `src/player-stats/services/player-league-stats.service.ts`

### PlayerRatingsModule
- `src/player-ratings/player-ratings.module.ts`
- `src/player-ratings/services/player-league-rating.service.ts`

### MmrCalculationModule
- `src/mmr-calculation/mmr-calculation.module.ts`
- `src/mmr-calculation/services/mmr-calculation.service.ts`
- `src/mmr-calculation/services/formula-validation.service.ts`
- `src/mmr-calculation/controllers/mmr-calculation.controller.ts`

### TournamentsModule
- `src/tournaments/tournaments.module.ts`
- `src/tournaments/services/tournament.service.ts`
- `src/tournaments/tournaments.controller.ts`

### GuildMembersModule
- `src/guild-members/guild-members.module.ts`
- `src/guild-members/services/guild-members.service.ts`
- `src/guild-members/services/guild-member-sync.service.ts`

### PermissionsModule
- `src/permissions/permissions.module.ts`
- `src/permissions/services/permission-check.service.ts`
- `src/permissions/services/role-parser.service.ts`

### AuditModule
- `src/audit/audit.module.ts`
- `src/audit/services/audit-log.service.ts`
- `src/audit/audit-log.controller.ts`

### DiscordModule
- `src/discord/discord.module.ts`
- `src/discord/discord-api.service.ts`
- `src/discord/discord-bot.service.ts`

### UserGuildsModule
- `src/user-guilds/user-guilds.module.ts`
- `src/user-guilds/user-guilds.service.ts`

---

## Traceability Summary

| Feature | Spec | Implementation Files | Coverage |
|---------|------|---------------------|----------|
| Authentication | `specs/auth.module.md` | 10+ files | ✅ Complete |
| User Management | `specs/users.module.md` | 8+ files | ✅ Complete |
| Guild Management | `specs/guilds.module.md` | 15+ files | ✅ Complete |
| League Management | `specs/leagues.module.md` | 15+ files | ✅ Complete |
| Tracker Management | `specs/trackers.module.md` | 30+ files | ✅ Complete |
| Organization Management | `specs/organizations.module.md` | 10+ files | ✅ Complete |
| Team Management | `specs/teams.module.md` | 8+ files | ✅ Complete |
| Match Management | `specs/matches.module.md` | 9+ files | ✅ Complete |
| Health Check | (Infrastructure) | 3 files | ✅ Complete |
| CommonModule | `specs/common.module.md` | 15+ files | ✅ Mapped |
| InfrastructureModule | `specs/infrastructure.module.md` | 20+ files | ✅ Mapped |

---

## Notes

- **Feature Coverage**: All major user-facing features have corresponding Gherkin feature files
- **Spec Coverage**: All domain modules have behavioral contract specifications
- **Implementation Coverage**: Core implementation files are mapped
- **Gap Analysis**: See `docs/AUDIT_GAP_ANALYSIS.md` for files without behavior definitions

---

**Last Updated**: 2025-01-27


