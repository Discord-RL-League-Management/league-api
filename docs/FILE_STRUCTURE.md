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

- [NestJS CLI Documentation](https://docs.nestjs.com/cli/usages#nest-generate)
- [NestJS File Structure Best Practices](https://docs.nestjs.com/fundamentals/module-ref)
- [NestJS Guards Documentation](https://docs.nestjs.com/guards)

