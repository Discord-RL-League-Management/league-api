# File Structure Conventions

This document outlines the file structure conventions for the league-api project, aligned with NestJS CLI defaults and best practices.

## Controller File Locations

### Standard Convention

Controllers should be located at the **module root** directory, following NestJS CLI conventions.

**NestJS CLI Behavior:**
```bash
nest g controller users
# Generates: src/users/users.controller.ts (at module root)
```

### Current Structure

All controllers are located at their respective module roots:

- `src/trackers/tracker.controller.ts`
- `src/trackers/tracker-admin.controller.ts`
- `src/mmr-calculation/mmr-calculation.controller.ts`
- `src/mmr-calculation/mmr-calculator-demo.controller.ts`
- `src/internal/internal-scheduled-processing.controller.ts`

### Exception Policy

Modules with **3 or more controllers** may use a `controllers/` subdirectory for organizational purposes, but this decision must be:

1. **Documented** in this file with rationale
2. **Justified** by clear separation of concerns (e.g., admin vs. user controllers, different API versions)
3. **Consistent** within the module (all controllers in subdirectory or all at root)

### Rationale

- **Consistency**: Aligns with NestJS CLI defaults, making the codebase predictable
- **Discoverability**: Controllers are easier to find when located at module root
- **Simplicity**: Reduces directory nesting and import path complexity
- **Tooling**: Works seamlessly with NestJS CLI generators

## Service File Locations

### Standard Convention

The **primary domain service** should be located at the **module root** directory, following NestJS CLI conventions. Helper services (validation, orchestration, etc.) may be organized in a `services/` subdirectory when there are multiple services.

**NestJS CLI Behavior:**
```bash
nest g service users
# Generates: src/users/users.service.ts (at module root)

nest g service validation services/users
# Generates: src/users/services/validation.service.ts (in subdirectory)
```

### Current Structure

Most modules follow the pattern of primary service at root with helper services in subdirectories:

**Primary Services at Module Root:**
- `src/leagues/leagues.service.ts` (primary) + `src/leagues/league-settings.service.ts` (also at root)
- `src/guilds/guilds.service.ts` (primary) + `src/guilds/guild-settings.service.ts` (also at root)
- `src/trackers/tracker.service.ts` (primary)
- `src/users/users.service.ts` (primary)
- `src/players/player.service.ts` (primary)
- `src/organizations/organization.service.ts` (primary)
- `src/auth/auth.service.ts` (primary)

**Helper Services in Subdirectories:**
- `src/leagues/services/` - Contains 5 helper services (validation, permissions, defaults, etc.)
- `src/guilds/services/` - Contains 6 helper services (validation, authorization, sync, etc.)
- `src/trackers/services/` - Contains 20+ helper services (scraping, processing, notifications, etc.)
- `src/users/services/` - Contains helper services (orchestration, etc.)
- `src/players/services/` - Contains helper services (validation, ownership, etc.)
- `src/organizations/services/` - Contains helper services (validation, authorization, member management, etc.)
- `src/auth/services/` - Contains helper services (OAuth, token management, orchestration, etc.)

**Modules with All Services in Subdirectory:**
Some smaller modules have all services organized in subdirectories:
- `src/mmr-calculation/services/` - All services including primary `mmr-calculation.service.ts`
- `src/league-members/services/` - All services including primary `league-member.service.ts`
- `src/teams/services/` - All services including primary `team.service.ts`

### Exception Policy

Modules with **3 or more services** may organize helper services in a `services/` subdirectory, but the **primary domain service must remain at module root**. The decision to use a subdirectory must be:

1. **Documented** in this file with rationale
2. **Justified** by clear organizational needs (e.g., many validation/orchestration services)
3. **Consistent** within the module (primary at root, helpers in subdirectory)

**Primary Service Requirement:**
- The primary domain service (e.g., `leagues.service.ts`, `guilds.service.ts`) **MUST** be at module root
- This aligns with NestJS CLI defaults and ensures discoverability
- Additional related services (e.g., `league-settings.service.ts`) may also be at root if they are core domain services

**Helper Services Organization:**
- When a module has 3+ services, helper services (validation, orchestration, authorization, etc.) should be organized in a `services/` subdirectory
- This keeps the module root clean while maintaining organization
- Examples of helper services: validation services, authorization services, orchestration services, sync services, etc.

### Rationale

- **Consistency**: Aligns with NestJS CLI defaults for primary services, making the codebase predictable
- **Discoverability**: Primary services are easier to find when located at module root
- **Organization**: Helper services in subdirectories prevent module root clutter when there are many services
- **Simplicity**: Primary service at root reduces import path complexity for the most commonly used service
- **Tooling**: Works seamlessly with NestJS CLI generators for primary services
- **Scalability**: Subdirectory organization scales well for modules with many helper services

## Guard File Locations

### Standard Convention

Guards should be **co-located with their registration module**, following NestJS CLI conventions and the principle of keeping related code together.

**NestJS CLI Behavior:**
```bash
nest g guard users
# Generates: src/users/users.guard.ts (at module root, co-located with module)
```

### Current Structure

Guards are organized into three categories based on their scope:

#### 1. Common Guards (Cross-Cutting Concerns)

Common guards that are used across multiple modules are located in a shared authorization module:

- **Location**: `src/common/authorization/guards/`
- **Module**: `src/common/authorization/authorization.module.ts`
- **Guards**: 
  - `SystemAdminGuard` - System-wide admin authorization
  - `ResourceOwnershipGuard` - Resource ownership validation
- **Pattern**: Guards are co-located with the `AuthorizationModule` that registers and exports them
- **Usage**: Other modules import `AuthorizationModule` to use these guards

#### 2. Domain-Specific Guards

Guards specific to a single domain module are co-located with that module:

- `src/guilds/guards/` - Registered in `GuildsModule`
  - `guild-admin.guard.ts`
  - `guild-admin-simple.guard.ts`
- `src/leagues/guards/` - Registered in `LeaguesModule`
  - `league-access.guard.ts`
  - `league-admin.guard.ts`
  - `league-admin-or-moderator.guard.ts`
- `src/organizations/guards/` - Registered in `OrganizationsModule`
  - `organization-gm.guard.ts`
- `src/trackers/guards/` - Registered in `TrackersModule`
  - `tracker-access.guard.ts`

**Pattern**: Guards are in a `guards/` subdirectory within their module, registered in the module's providers array, and exported if needed by other modules.

#### 3. Authentication Guards

Authentication guards (Passport-based) are co-located with the `AuthModule`:

- **Location**: `src/auth/guards/`
- **Module**: `src/auth/auth.module.ts`
- **Guards**:
  - `jwt-auth.guard.ts` - JWT authentication guard
  - `bot-auth.guard.ts` - Bot API key authentication guard
- **Pattern**: These guards extend `@nestjs/passport` `AuthGuard` and are integrated via `PassportModule`, following NestJS authentication patterns

### Co-Location Principle

All guards follow the **co-location principle**:
- Guards are located in the same directory structure as the module that registers them
- Guards are registered in the module's `providers` array
- Guards are exported in the module's `exports` array if used by other modules
- This makes it easy to find guards and understand module dependencies

### Rationale

- **Consistency**: Aligns with NestJS CLI defaults and co-location best practices
- **Discoverability**: Guards are easy to find when located with their module
- **Maintainability**: Clear ownership and organization boundaries
- **Dependency Management**: Module registration and exports are transparent

## Related Documentation

- [NestJS CLI Documentation](https://docs.nestjs.com/cli/usages#nest-generate) - Service and controller generation
- [NestJS Providers Documentation](https://docs.nestjs.com/providers) - Service implementation patterns
- [NestJS File Structure Best Practices](https://docs.nestjs.com/fundamentals/module-ref)
- [NestJS Guards Documentation](https://docs.nestjs.com/guards)
- `docs/NESTJS_AUDIT_REPORT.md` - Section 1: CLI Structure Alignment, Findings A.2 (Services), A.3 (Controllers)

