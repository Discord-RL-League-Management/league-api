# Audit Gap Analysis - Files Without Behavior Definitions
## Generated: 2025-01-27

This document identifies source files that do not have corresponding behavior definitions in `/features` or `/specs`.

---

## Analysis Methodology

Files are categorized as:
- **✅ Covered**: Has behavior defined in features/specs
- **⚠️ Supporting Code**: DTOs, interfaces, repositories, utilities (expected, no behavior needed)
- **❌ Gap**: Implementation files without behavior definitions

---

## Files Without Behavior Definitions (Gaps)

### Profile Module
- **Gap**: `src/profile/profile.module.ts` - Module not fully covered
- **Gap**: `src/profile/profile.service.ts` - Profile service
- **Gap**: `src/profile/profile.controller.ts` - Profile endpoints
- **Gap**: `src/profile/services/user-statistics.service.ts` - Statistics service
- **Gap**: `src/profile/services/user-settings.service.ts` - Settings service
- **Recommendation**: Create `features/profile-management.feature` and `specs/profile.module.md`

### League Members Module
- **Gap**: `src/league-members/league-members.module.ts` - Module not fully covered
- **Gap**: `src/league-members/services/league-member.service.ts` - League member service
- **Gap**: `src/league-members/services/league-join-validation.service.ts` - Join validation
- **Gap**: `src/league-members/league-members.controller.ts` - League member endpoints
- **Gap**: `src/league-members/internal-league-members.controller.ts` - Bot endpoints
- **Recommendation**: Create `features/league-member-management.feature` and `specs/league-members.module.md`

### Team Members Module
- **Gap**: `src/team-members/team-members.module.ts` - Module not fully covered
- **Gap**: `src/team-members/services/team-member.service.ts` - Team member service
- **Gap**: `src/team-members/team-members.controller.ts` - Team member endpoints
- **Gap**: `src/team-members/internal-team-members.controller.ts` - Bot endpoints
- **Recommendation**: Create `features/team-member-management.feature` and `specs/team-members.module.md`

### Players Module
- **Gap**: `src/players/players.module.ts` - Module not fully covered
- **Gap**: `src/players/services/player.service.ts` - Player service
- **Gap**: `src/players/services/player-validation.service.ts` - Validation service
- **Gap**: `src/players/services/player-ownership.service.ts` - Ownership service
- **Gap**: `src/players/players.controller.ts` - Player endpoints
- **Gap**: `src/players/internal-players.controller.ts` - Bot endpoints
- **Recommendation**: Create `features/player-management.feature` and `specs/players.module.md`

### Player Stats Module
- **Gap**: `src/player-stats/player-stats.module.ts` - Module not fully covered
- **Gap**: `src/player-stats/services/player-league-stats.service.ts` - Stats service
- **Gap**: `src/player-stats/player-stats.controller.ts` - Stats endpoints
- **Recommendation**: Create `features/player-stats.feature` and `specs/player-stats.module.md`

### Player Ratings Module
- **Gap**: `src/player-ratings/player-ratings.module.ts` - Module not fully covered
- **Gap**: `src/player-ratings/services/player-league-rating.service.ts` - Rating service
- **Gap**: `src/player-ratings/player-ratings.controller.ts` - Rating endpoints
- **Recommendation**: Create `features/player-ratings.feature` and `specs/player-ratings.module.md`

### MMR Calculation Module
- **Gap**: `src/mmr-calculation/mmr-calculation.module.ts` - Module not fully covered
- **Gap**: `src/mmr-calculation/services/mmr-calculation.service.ts` - MMR calculation
- **Gap**: `src/mmr-calculation/services/formula-validation.service.ts` - Formula validation
- **Gap**: `src/mmr-calculation/services/tracker-data-extraction.service.ts` - Data extraction
- **Gap**: `src/mmr-calculation/services/mmr-calculation-integration.service.ts` - Integration
- **Gap**: `src/mmr-calculation/controllers/mmr-calculation.controller.ts` - MMR endpoints
- **Gap**: `src/mmr-calculation/controllers/calculator.controller.ts` - Calculator endpoints
- **Gap**: `src/mmr-calculation/controllers/mmr-calculator-demo.controller.ts` - Demo endpoints
- **Recommendation**: Create `features/mmr-calculation.feature` and `specs/mmr-calculation.module.md`

### Tournaments Module
- **Gap**: `src/tournaments/tournaments.module.ts` - Module not fully covered
- **Gap**: `src/tournaments/services/tournament.service.ts` - Tournament service
- **Gap**: `src/tournaments/tournaments.controller.ts` - Tournament endpoints
- **Recommendation**: Create `features/tournament-management.feature` and `specs/tournaments.module.md`

### Guild Members Module
- **Gap**: `src/guild-members/guild-members.module.ts` - Module not fully covered
- **Gap**: `src/guild-members/services/guild-members.service.ts` - Guild member service
- **Gap**: `src/guild-members/services/guild-member-sync.service.ts` - Sync service
- **Gap**: `src/guild-members/services/guild-member-query.service.ts` - Query service
- **Gap**: `src/guild-members/services/guild-member-statistics.service.ts` - Statistics service
- **Gap**: `src/guild-members/guild-members.controller.ts` - Guild member endpoints
- **Gap**: `src/guild-members/internal-guild-members.controller.ts` - Bot endpoints
- **Recommendation**: Create `features/guild-member-management.feature` and `specs/guild-members.module.md`

### Permissions Module
- **Note**: This is a cross-cutting module (infrastructure concern)
- **Status**: ⚠️ Supporting code - used by CommonModule guards
- **Recommendation**: Document in `specs/permissions.module.md` (infrastructure spec)

### Audit Module
- **Note**: Partially covered in CommonModule spec
- **Gap**: `src/audit/audit.module.ts` - Should have dedicated spec
- **Gap**: `src/audit/services/audit-log.service.ts` - Audit service
- **Gap**: `src/audit/audit-log.controller.ts` - Audit endpoints
- **Recommendation**: Create `specs/audit.module.md` (infrastructure spec)

### Discord Module
- **Note**: Infrastructure/integration module
- **Gap**: `src/discord/discord.module.ts` - Should have integration spec
- **Gap**: `src/discord/discord-api.service.ts` - Discord API integration
- **Gap**: `src/discord/discord-bot.service.ts` - Bot service
- **Recommendation**: Create `specs/discord.module.md` (integration spec)

### User Guilds Module
- **Note**: Supporting module for AuthModule
- **Gap**: `src/user-guilds/user-guilds.module.ts` - Should be documented
- **Gap**: `src/user-guilds/user-guilds.service.ts` - User guild service
- **Recommendation**: Document in `specs/user-guilds.module.md` or expand AuthModule spec

### Internal Module
- **Note**: Contains internal/bot endpoints
- **Gap**: `src/internal/internal.module.ts` - Should be documented
- **Gap**: `src/internal/internal.controller.ts` - Internal endpoints
- **Status**: Partially covered in feature files (bot endpoints)
- **Recommendation**: Create `specs/internal.module.md` (infrastructure spec)

---

## Supporting Code (Expected - No Behavior Needed)

These file types are expected to not have behavior definitions:

### DTOs (Data Transfer Objects)
- All `dto/*.dto.ts` files - Data structures, no behavior
- Examples: `src/users/dto/create-user.dto.ts`, `src/leagues/dto/update-league.dto.ts`

### Interfaces
- All `interfaces/*.interface.ts` files - Type definitions, no behavior
- Examples: `src/common/interfaces/user.interface.ts`, `src/guilds/interfaces/settings.interface.ts`

### Repositories
- All `repositories/*.repository.ts` files - Data access layer, behavior in services
- Examples: `src/users/repositories/user.repository.ts`, `src/leagues/repositories/league.repository.ts`

### Pipes
- All `pipes/*.pipe.ts` files - Transformation utilities, no business behavior
- Examples: `src/common/pipes/parse-cuid.pipe.ts`, `src/common/pipes/parse-enum.pipe.ts`

### Filters
- All `filters/*.filter.ts` files - Exception handling, infrastructure concern
- Examples: `src/common/filters/prisma-exception.filter.ts`, `src/common/filters/global-exception.filter.ts`

### Decorators
- All `decorators/*.decorator.ts` files - Metadata utilities, no behavior
- Examples: `src/common/decorators/public.decorator.ts`, `src/auth/decorators/current-user.decorator.ts`

### Exceptions
- All `exceptions/*.exceptions.ts` files - Error definitions, no behavior
- Examples: `src/leagues/exceptions/league.exceptions.ts`, `src/guilds/exceptions/guild.exceptions.ts`

### Adapters
- All `adapters/*.adapter.ts` files - Dependency inversion adapters, infrastructure concern
- Examples: `src/auth/adapters/token-provider.adapter.ts`, `src/guilds/adapters/guild-access-provider.adapter.ts`

### Strategies
- All `strategies/*.strategy.ts` files - Authentication strategies, infrastructure concern
- Examples: `src/auth/strategies/jwt.strategy.ts`, `src/auth/strategies/bot-api-key.strategy.ts`

### Configuration
- All `config/*.ts` files - Configuration, no behavior
- Examples: `src/config/configuration.ts`, `src/config/configuration.schema.ts`

### Constants
- All `constants/*.ts` files - Constants, no behavior
- Examples: `src/guilds/constants/*.ts`, `src/leagues/constants/*.ts`

### Transformers
- All `transformers/*.transformer.ts` files - Data transformation, no business behavior
- Examples: `src/users/transformers/user.transformer.ts`

### Schemas
- All `schemas/*.schema.ts` files - Data schemas, no behavior
- Examples: `src/trackers/schemas/tracker-segment.schema.ts`

---

## Summary

### Coverage Status

| Category | Count | Status |
|----------|-------|--------|
| **Modules with Full Coverage** | 9 | ✅ Complete |
| **Modules Needing Feature Files** | 10 | ❌ Gap |
| **Infrastructure Modules** | 5 | ⚠️ Need Infrastructure Specs |
| **Supporting Code (Expected)** | 150+ | ✅ Expected (no behavior) |

### Priority Recommendations

#### High Priority (User-Facing Features)
1. **ProfileModule** - User profile management
2. **LeagueMembersModule** - League membership management
3. **PlayersModule** - Player management
4. **TeamMembersModule** - Team membership management

#### Medium Priority (Important Features)
5. **MmrCalculationModule** - MMR calculation features
6. **PlayerStatsModule** - Player statistics
7. **PlayerRatingsModule** - Player ratings
8. **GuildMembersModule** - Guild membership management

#### Low Priority (Infrastructure/Supporting)
9. **TournamentsModule** - Tournament features (if actively used)
10. **AuditModule** - Audit logging (infrastructure spec)
11. **DiscordModule** - Discord integration (integration spec)
12. **InternalModule** - Internal endpoints (infrastructure spec)

---

## Next Steps

1. **Create Missing Feature Files**: Generate Gherkin feature files for high-priority modules
2. **Create Missing Specs**: Generate behavioral contract specs for identified gaps
3. **Update SYSTEM_MAP**: Add new features and specs to traceability map
4. **Infrastructure Specs**: Create specs for infrastructure modules (lower priority)

---

**Last Updated**: 2025-01-27


