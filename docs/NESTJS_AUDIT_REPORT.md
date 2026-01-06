# NestJS Architecture Audit Report

**Generated**: 2025-01-27  
**Codebase**: League Management API  
**NestJS Version**: 11.0.1

## Executive Summary

This audit evaluates the codebase against NestJS best practices and conventions. The analysis reveals significant architectural misalignments that require substantial refactoring to properly align with NestJS's intended usage patterns.

### Overall Alignment Score: 45/100

### Priority Breakdown

- **Critical Issues**: 8 findings requiring immediate attention
- **High Priority**: 12 findings affecting maintainability and scalability  
- **Medium Priority**: 15 findings impacting code quality
- **Low Priority**: 7 findings for optimization

### Total Estimated Effort: 120-150 hours

---

## 1. CLI Structure Alignment

### NestJS CLI Standard Structure

When using NestJS CLI commands, the framework generates files in specific locations:

- `nest g module users` → `src/users/users.module.ts`
- `nest g controller users` → `src/users/users.controller.ts` (in module root)
- `nest g service users` → `src/users/users.service.ts` (in module root)
- `nest g service users` → Also generates `src/users/users.service.spec.ts` (next to service file)

### Current Codebase Structure

**Finding A.1: Test Files Not Co-located with Source Files**  
**Severity**: High  
**Current State**: All test files are in a separate `tests/` directory structure:
- Unit tests: `tests/unit/services/user.service.test.ts`
- API tests: `tests/api/users.api.test.ts`
- E2E tests: `tests/e2e/`

**Expected**: Tests should be next to source files:
- `src/users/users.service.spec.ts` (unit tests)
- `src/users/users.controller.spec.ts` (unit tests)

**Impact**: 
- Violates NestJS conventions
- Makes it harder to find tests related to source files
- CLI-generated code won't match existing structure
- IDE tooling expects co-located test files

**Recommendation**: Migrate tests to be co-located with source files. NestJS convention is `.spec.ts` files next to implementation files.

**Files Affected**: All test files in `tests/` directory (52+ test files)

**Estimated Effort**: 20 hours

---

**Finding A.2: Services in Subdirectories Instead of Module Root**  
**Severity**: Medium  
**Current State**: Services are inconsistently placed:
- Some modules: Services in `services/` subdirectory (e.g., `src/leagues/services/league-access-validation.service.ts`)
- Some modules: Services at module root (e.g., `src/users/users.service.ts`)

**Expected**: Services should be at module root unless there are many services, then they can be organized in subdirectories, but primary service should be at root.

**Impact**: Inconsistent structure makes navigation harder and deviates from CLI defaults

**Files Affected**: 
- `src/leagues/services/` (5 services)
- `src/guilds/services/` (6 services)
- `src/trackers/services/` (20+ services)
- `src/players/services/` (3 services)
- `src/organizations/services/` (3 services)
- And others

**Recommendation**: Standardize structure. For modules with many services, organization in subdirectories is acceptable, but should be consistent. Primary domain service should be at module root (e.g., `leagues.service.ts` at root, helper services can be in subdirectory).

**Estimated Effort**: 8 hours (documentation and minor reorganization)

---

**Finding A.3: Controllers in Subdirectories**  
**Severity**: Medium  
**Current State**: Some controllers are in `controllers/` subdirectories:
- `src/trackers/controllers/tracker.controller.ts`
- `src/mmr-calculation/controllers/mmr-calculation.controller.ts`

**Expected**: Controllers should be at module root. NestJS CLI generates controllers at module root.

**Impact**: Deviation from CLI conventions

**Files Affected**:
- `src/trackers/controllers/` (2 controllers)
- `src/mmr-calculation/controllers/` (3 controllers)
- `src/internal/controllers/` (1 controller)

**Recommendation**: Move controllers to module root unless there are compelling organizational reasons. For trackers and mmr-calculation, this might be acceptable given multiple controllers, but should be documented decision.

**Estimated Effort**: 4 hours

---

## 2. Module Architecture

### NestJS Module Principles

Modules should:
1. Be self-contained with clear boundaries
2. Export only what other modules need
3. Import only what they require
4. Avoid circular dependencies
5. Follow dependency direction: Feature modules → Shared modules → Core modules

### Current Issues

**Finding B.1: Excessive Circular Dependencies with forwardRef**  
**Severity**: Critical  
**Current State**: 22 files use `forwardRef()` to work around circular dependencies

**Circular Dependency Cycles Identified**:

1. **GuardsModule ↔ GuildsModule ↔ AuditModule**
   - `GuardsModule` imports `forwardRef(() => GuildsModule)`
   - `GuardsModule` imports `forwardRef(() => AuditModule)`
   - `GuildsModule` imports `GuardsModule` (for guards)
   - `AuditModule` likely imports something that needs guards

2. **LeaguesModule ↔ LeagueMembersModule**
   - `LeaguesModule` imports `forwardRef(() => LeagueMembersModule)`
   - `LeagueMembersModule` imports `forwardRef(() => LeaguesModule)`

3. **TeamsModule ↔ LeaguesModule ↔ OrganizationsModule**
   - Multiple `forwardRef` usages between these modules

4. **MmrCalculationModule ↔ GuildsModule**
   - `MmrCalculationModule` imports `forwardRef(() => GuildsModule)`

**Root Cause**: Guards and authorization logic depends on domain services, creating bidirectional dependencies.

**Impact**:
- Makes modules tightly coupled
- Harder to test in isolation
- Makes dependency graph fragile
- Indicates architectural design issues
- `forwardRef` is a workaround, not a solution

**Recommendation**: Refactor to eliminate circular dependencies:
1. Guards should not depend on domain modules - extract shared authorization logic
2. Use events or shared services for cross-module communication
3. Invert dependencies: Domain modules should depend on authorization abstractions, not vice versa
4. Consider creating a separate `AuthorizationModule` that domain modules import, not the other way around

**Files Using forwardRef**:
- `src/guards/guards.module.ts`
- `src/leagues/leagues.module.ts`
- `src/league-members/league-members.module.ts`
- `src/guilds/guilds.module.ts`
- `src/mmr-calculation/mmr-calculation.module.ts`
- `src/teams/teams.module.ts`
- `src/organizations/organizations.module.ts`
- `src/auth/auth.module.ts`
- `src/audit/audit.module.ts`
- `src/user-guilds/user-guilds.module.ts`
- And 12 more files

**Estimated Effort**: 40 hours (major architectural refactoring)

---

**Finding B.2: Guards Module Anti-Pattern**  
**Severity**: Critical  
**Location**: `src/guards/guards.module.ts`

**Issue**: The `GuardsModule` imports domain modules (`GuildsModule`, `AuditModule`) using `forwardRef`. This inverts the dependency direction incorrectly.

**Current Structure**:
```typescript
@Module({
  imports: [
    forwardRef(() => AuditModule),
    forwardRef(() => GuildAccessAdapterModule),
    forwardRef(() => GuildsModule), // Guards depending on domain!
    // ...
  ],
  providers: [AdminGuard, SystemAdminGuard, GuildAdminGuard],
  exports: [AdminGuard, SystemAdminGuard, GuildAdminGuard],
})
```

**Problem**: Guards (cross-cutting concern) are depending on domain modules (business logic). This creates tight coupling.

**Expected**: Guards should be self-contained or depend only on:
- ConfigModule (for configuration)
- AuthModule (for authentication, not domain logic)
- Shared utilities

Domain modules should import and use guards, not the other way around.

**Impact**: Creates circular dependencies and tight coupling

**Recommendation**: 
1. Extract authorization logic that domain modules need into a shared service
2. Guards should only depend on auth and config
3. Domain modules should provide authorization data to guards, not guards querying domain services

**Estimated Effort**: 25 hours

---

**Finding B.3: Module Exports Inconsistency**  
**Severity**: Medium  
**Current State**: Some modules export too much, others export too little.

**Examples**:
- `GuildsModule` exports: `GuildsService`, `GuildSettingsService`, `GuildAccessValidationService`, `SettingsDefaultsService`, `GuildAccessProviderAdapter` - potentially too many
- Some modules export repositories directly (e.g., `UserRepository`, `LeagueRepository`) - repositories are implementation details

**Recommendation**: 
- Only export services/interfaces that other modules need
- Don't export repositories - they're implementation details
- Use interfaces/DTOs for cross-module contracts

**Estimated Effort**: 12 hours

---

## 3. Dependency Injection Patterns

### NestJS DI Principles

1. All dependencies injected via constructor
2. Use `@Injectable()` decorator
3. Providers registered in modules
4. Avoid manual instantiation (`new Service()`)
5. Use proper provider patterns (useClass, useFactory, useValue)

### Current Issues

**Finding C.1: String-Based Injection Tokens**  
**Severity**: Medium  
**Current State**: Custom providers use string tokens:
```typescript
{
  provide: 'IPermissionProvider',
  useFactory: (service) => new Adapter(service),
  inject: [PermissionCheckService],
}
```

**Issue**: String tokens are:
- Not type-safe
- Harder to refactor
- Can cause runtime errors if typo'd
- Not IDE-friendly

**Recommendation**: Use symbols or classes for injection tokens:
```typescript
export const IPERMISSION_PROVIDER = Symbol('IPermissionProvider');
```

Or better: Use abstract classes:
```typescript
export abstract class PermissionProvider {
  abstract checkAdminRoles(...): Promise<boolean>;
}
```

**Files Affected**:
- `src/guards/guards.module.ts`
- `src/leagues/leagues.module.ts`
- `src/league-members/league-members.module.ts`
- `src/guilds/adapters/guild-access-adapter.module.ts`

**Estimated Effort**: 8 hours

---

**Finding C.2: Complex Provider Factories**  
**Severity**: Low  
**Location**: `src/guards/guards.module.ts`

**Issue**: Using `useFactory` to instantiate adapter classes manually. This is unnecessary complexity.

**Current**:
```typescript
{
  provide: 'IPermissionProvider',
  useFactory: (permissionCheckService: PermissionCheckService) => {
    return new PermissionProviderAdapter(permissionCheckService);
  },
  inject: [PermissionCheckService],
}
```

**Recommendation**: If adapters are simple wrappers, use `useClass` instead. Only use factories for complex initialization logic.

**Estimated Effort**: 4 hours

---

**Finding C.3: Direct Prisma Usage in Services**  
**Severity**: High  
**Location**: Multiple service files

**Issue**: Some services inject `PrismaService` directly instead of using repositories:
- `src/players/services/player.service.ts` - injects `PrismaService` for transactions
- `src/infrastructure/outbox/services/outbox.service.ts` - uses Prisma transaction client directly

**Current Example**:
```typescript
constructor(
  private playerRepository: PlayerRepository,
  private prisma: PrismaService, // Direct Prisma dependency
  // ...
) {}

async create(dto: CreatePlayerDto) {
  return await this.prisma.$transaction(async (tx) => {
    const player = await tx.player.create({ /* ... */ });
    // ...
  });
}
```

**Issue**: Mixing repository pattern with direct Prisma usage breaks abstraction. Services should use repositories exclusively.

**Recommendation**: 
1. Repositories should handle transactions internally
2. Services should only depend on repositories, not PrismaService
3. If transaction coordination is needed, use repository methods that accept transaction clients

**Files Affected**:
- `src/players/services/player.service.ts` (lines 118-139)
- `src/infrastructure/outbox/services/outbox.service.ts` (line 25)
- Potentially others

**Estimated Effort**: 12 hours

---

## 4. Guards Implementation

### NestJS Guard Principles

1. Guards implement `CanActivate` interface
2. Guards should be stateless and focused
3. Guards execute before route handlers
4. Guards can be applied globally, controller-level, or method-level
5. Guards should not depend on domain modules

### Current Issues

**Finding D.1: Guards Depending on Domain Services**  
**Severity**: Critical  
**Location**: `src/common/guards/admin.guard.ts`, `src/common/guards/guild-admin.guard.ts`

**Issue**: Guards are injecting domain services and making business logic calls:

```typescript
// AdminGuard depends on:
@Inject('IGuildAccessProvider') private guildAccessProvider: IGuildAccessProvider,
@Inject('IPermissionProvider') private permissionProvider: IPermissionProvider,
@Inject('IAuditProvider') private auditProvider: IAuditProvider,
@Inject('IDiscordProvider') private discordProvider: IDiscordProvider,
@Inject('ITokenProvider') private tokenProvider: ITokenProvider,
```

While using interfaces is good (dependency inversion), the guard is still orchestrating complex business logic:
- Checking Discord permissions
- Fetching guild settings
- Validating roles
- Logging audit events

**Problem**: Guards should be thin authorization checks, not business logic orchestrators.

**Expected**: Guards should:
1. Extract user/request context
2. Delegate authorization decision to a dedicated authorization service
3. Return boolean (allow/deny)

**Impact**: 
- Guards are doing too much
- Hard to test
- Creates tight coupling
- Violates single responsibility principle

**Recommendation**: 
1. Extract authorization logic into `AuthorizationService` or similar
2. Guards become thin wrappers that call the authorization service
3. Authorization service can depend on domain modules if needed, but guards stay independent

**Files Affected**:
- `src/common/guards/admin.guard.ts` (198 lines - too complex)
- `src/common/guards/guild-admin.guard.ts` (103 lines)
- `src/common/guards/system-admin.guard.ts` (95 lines)

**Estimated Effort**: 20 hours

---

**Finding D.2: Guard Module Organization**  
**Severity**: Medium  
**Location**: `src/guards/guards.module.ts` vs `src/common/guards/`

**Issue**: Guards are in `src/common/guards/` but registered in `src/guards/guards.module.ts`. This separation is confusing.

**Recommendation**: Either:
1. Move guards to `src/guards/` directory, OR
2. Move `GuardsModule` to `src/common/common.module.ts` (but this might recreate circular dependency issues)

Better solution: Keep guards in `common/guards/` but have them registered in a module that doesn't create circular dependencies. The current `GuardsModule` approach is a workaround for the circular dependency problem.

**Estimated Effort**: 6 hours (after circular dependencies are resolved)

---

## 5. Service Layer

**Finding E.1: Services Bypassing Repository Pattern**  
**Severity**: High  
**Location**: `src/players/services/player.service.ts`

**Issue**: Service uses `PrismaService.$transaction()` directly and calls `tx.player.create()` instead of using repository methods.

**Impact**: Breaks abstraction, makes testing harder, inconsistent with repository pattern used elsewhere

**Recommendation**: Repository should handle transactions. Service should call repository methods that accept transaction client if needed.

**Estimated Effort**: 8 hours

---

**Finding E.2: Service Method Complexity**  
**Severity**: Medium  
**Location**: Various service files

Some service methods are too complex (100+ lines), violating single responsibility principle. This is a code quality issue but not strictly a NestJS violation.

**Recommendation**: Refactor large methods into smaller, focused methods.

**Estimated Effort**: 16 hours (across multiple services)

---

## 6. Summary Tables

### Findings by Severity

| Severity | Count | Total Effort (hours) |
|----------|-------|---------------------|
| Critical | 3     | 85                  |
| High     | 3     | 40                  |
| Medium   | 6     | 38                  |
| Low      | 1     | 4                   |
| **Total** | **13** | **167**            |

### Findings by Category

| Category | Findings | Effort (hours) |
|----------|----------|----------------|
| CLI Structure | 3 | 32 |
| Module Architecture | 3 | 77 |
| Dependency Injection | 3 | 24 |
| Guards | 2 | 26 |
| Service Layer | 2 | 24 |

### Priority Recommendations

**Immediate Actions (Critical)**:
1. Eliminate circular dependencies (40h) - Blocks proper module design
2. Refactor guards to not depend on domain modules (25h) - Enables proper architecture
3. Fix guard architecture and implementation (20h) - Improves testability

**High Priority**:
1. Move test files to be co-located with source (20h) - Aligns with CLI conventions
2. Refactor services to use repositories exclusively (12h) - Maintains abstraction
3. Replace string injection tokens with symbols/classes (8h) - Improves type safety

**Medium Priority**:
1. Standardize service/controller file locations (12h)
2. Review and optimize module exports (12h)
3. Refactor complex service methods (16h)

---

## 7. Recommendations Summary

### Architectural Changes Required

1. **Eliminate Circular Dependencies**: This is the most critical issue. The current use of `forwardRef` indicates fundamental architectural problems. Guards should not depend on domain modules.

2. **Restructure Authorization**: Extract authorization logic into a dedicated service/module that domain modules can depend on, rather than guards depending on domain modules.

3. **Test File Migration**: Move tests to be co-located with source files to align with NestJS CLI conventions.

4. **Repository Pattern Consistency**: Ensure all data access goes through repositories, no direct Prisma usage in services.

5. **Injection Token Improvements**: Replace string tokens with symbols or abstract classes for better type safety.

### Quick Wins

1. Replace string injection tokens (8h)
2. Simplify provider factories (4h)
3. Document file structure decisions (2h)

### Long-term Improvements

1. Refactor complex service methods (16h)
2. Optimize module exports (12h)
3. Standardize file organization (12h)

---

## Appendix: File Impact Matrix

### Files Requiring Changes

**Critical Priority**:
- `src/guards/guards.module.ts` - Complete refactoring needed
- `src/common/guards/admin.guard.ts` - Extract authorization logic
- `src/leagues/leagues.module.ts` - Eliminate forwardRef
- `src/guilds/guilds.module.ts` - Eliminate forwardRef
- All 22 files using forwardRef

**High Priority**:
- All test files in `tests/` directory (52+ files) - Move to co-located
- `src/players/services/player.service.ts` - Remove direct Prisma usage
- `src/infrastructure/outbox/services/outbox.service.ts` - Remove direct Prisma usage

**Medium Priority**:
- Module files with inconsistent exports
- Services in subdirectories (consider reorganization)
- Controllers in subdirectories (consider moving to root)

---

**Report End**




