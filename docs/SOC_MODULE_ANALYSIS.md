# Separation of Concerns - Module-Level Analysis
## Analysis Date: 2025-01-27

---

## Module Architecture Overview

### Module Classification

#### Domain Modules (Core Business Logic)
1. **GuildsModule** - Guild management and settings
2. **LeaguesModule** - League management and operations
3. **PlayersModule** - Player management
4. **TeamsModule** - Team management
5. **MatchesModule** - Match tracking and results
6. **TournamentsModule** - Tournament management
7. **TrackersModule** - Tracker registration and processing
8. **OrganizationsModule** - Organization management

#### Cross-Cutting Modules
1. **AuthModule** - Authentication and authorization
2. **PermissionsModule** - Permission checking
3. **AuditModule** - Audit logging
4. **CommonModule** - Shared utilities and guards
5. **InfrastructureModule** - Infrastructure concerns (outbox, idempotency, activity log)

#### Integration Modules
1. **DiscordModule** - Discord API integration
2. **MmrCalculationModule** - MMR calculation engine
3. **UserGuildsModule** - User-guild relationship management

#### Support Modules
1. **HealthModule** - Health checks
2. **LoggingModule** - Logging infrastructure
3. **ConfigModule** - Configuration management
4. **PrismaModule** - Database access

---

## Module Dependency Analysis

### Circular Dependencies Identified

#### Cycle 1: CommonModule ↔ AuditModule
```
CommonModule
  └── imports AuditModule (for AuditProviderAdapter)
      └── imports CommonModule (for AdminGuard)
```

**Resolution**: Using `forwardRef()` and adapter pattern
**Status**: ✅ Managed but architectural smell

#### Cycle 2: GuildsModule ↔ CommonModule
```
GuildsModule
  └── imports CommonModule (for AdminGuard)
      └── imports GuildsModule (for GuildAccessProviderAdapter)
```

**Resolution**: Using `forwardRef()` and adapter pattern
**Status**: ✅ Managed but architectural smell

#### Cycle 3: LeaguesModule ↔ LeagueMembersModule
```
LeaguesModule
  └── imports LeagueMembersModule (forwardRef)
      └── imports LeaguesModule (forwardRef)
```

**Resolution**: Using `forwardRef()`
**Status**: ⚠️ Needs review - consider shared interfaces

#### Cycle 4: MmrCalculationModule ↔ GuildsModule
```
MmrCalculationModule
  └── imports GuildsModule (forwardRef)
      └── (potential reverse dependency through settings)
```

**Resolution**: Using `forwardRef()`
**Status**: ⚠️ Needs review

#### Cycle 5: GuildsModule ↔ UserGuildsModule
```
GuildsModule
  └── imports UserGuildsModule (forwardRef)
      └── imports GuildsModule (forwardRef)
```

**Resolution**: Using `forwardRef()`
**Status**: ⚠️ Needs review

---

## Module Cohesion Analysis

### High Cohesion Modules ✅

#### GuildsModule
- **Responsibility**: Guild domain management
- **Services**: 6 services, all guild-related
- **Controllers**: 3 controllers (GuildsController, InternalGuildsController, GuildSettingsController)
- **Cohesion**: High - all components focus on guild domain
- **Classification**: ✅ Well-structured

#### LeaguesModule
- **Responsibility**: League domain management
- **Services**: 5 services, all league-related
- **Controllers**: 3 controllers (LeaguesController, InternalLeaguesController, LeagueSettingsController)
- **Cohesion**: High - all components focus on league domain
- **Classification**: ✅ Well-structured

#### PlayersModule
- **Responsibility**: Player domain management
- **Services**: 3 services (PlayerService, PlayerValidationService, PlayerOwnershipService)
- **Controllers**: 2 controllers (PlayersController, InternalPlayersController)
- **Cohesion**: High
- **Classification**: ✅ Well-structured

---

### Moderate Cohesion Modules ⚠️

#### TrackersModule
- **Responsibility**: Tracker management and processing
- **Services**: 15+ services (mix of domain and infrastructure concerns)
- **Controllers**: 2 controllers (TrackerController, TrackerAdminController)
- **Cohesion**: Moderate - mixing domain logic with processing orchestration
- **Issues**:
  - TrackerService handles both CRUD and processing
  - Multiple orchestrator services (indicates complex orchestration)
- **Classification**: ⚠️ Needs refactoring

#### AuthModule
- **Responsibility**: Authentication and authorization
- **Services**: 3 services (AuthService, DiscordOAuthService, TokenManagementService)
- **Controllers**: 1 controller (AuthController)
- **Cohesion**: Moderate - AuthController contains orchestration logic
- **Issues**:
  - AuthController.discordCallback() contains complex guild sync logic
- **Classification**: ⚠️ Needs refactoring

#### CommonModule
- **Responsibility**: Shared utilities and guards
- **Complexity**: High - uses adapter pattern to break circular dependencies
- **Cohesion**: Moderate - multiple concerns (encryption, guards, interceptors)
- **Classification**: ✅ Well-architected (uses dependency inversion correctly)

---

### Low Cohesion Modules ⚠️

#### InfrastructureModule
- **Responsibility**: Infrastructure concerns
- **Sub-modules**: Outbox, Idempotency, Activity Log, Settings, Visibility
- **Cohesion**: Low - barrel export module containing unrelated infrastructure concerns
- **Classification**: ⚠️ Consider splitting into separate modules if they grow

**Note**: This is acceptable as a "barrel export" pattern, but monitor for growth.

---

## Module Coupling Analysis

### High Coupling Modules (Many Dependencies)

#### TrackersModule
**Direct Module Dependencies**: 5
- PrismaModule
- InfrastructureModule (forwardRef)
- AuditModule (forwardRef)
- MmrCalculationModule
- GuildsModule (forwardRef)

**External Dependencies**:
- BullMQ (queue system)
- HttpModule (axios)
- ConfigModule

**Classification**: ⚠️ High coupling - many dependencies

#### GuildsModule
**Direct Module Dependencies**: 10+
- PrismaModule
- InfrastructureModule (forwardRef)
- UserGuildsModule (forwardRef)
- DiscordModule
- CommonModule (forwardRef)
- AuditModule (forwardRef)
- PermissionCheckModule
- MmrCalculationModule (forwardRef)
- UsersModule
- GuildMembersModule

**Classification**: ⚠️ High coupling - many dependencies

#### CommonModule
**Direct Module Dependencies**: 6
- ConfigModule
- AuditModule
- PermissionCheckModule
- GuildsModule (forwardRef)
- GuildMembersModule
- DiscordModule
- TokenManagementModule

**Classification**: ⚠️ High coupling (acceptable for cross-cutting module)

---

### Low Coupling Modules (Few Dependencies)

#### PlayersModule
**Direct Module Dependencies**: 3
- PrismaModule
- InfrastructureModule
- AuthModule (for guards)

**Classification**: ✅ Good coupling

#### TeamsModule
**Direct Module Dependencies**: 4
- PrismaModule
- InfrastructureModule
- AuthModule
- LeaguesModule

**Classification**: ✅ Good coupling

---

## Module Boundary Violations

### No Violations Identified ✅

The codebase correctly maintains:
- ✅ Controllers depend on Services (Presentation → Application)
- ✅ Services depend on Repositories (Application → Domain/Infrastructure)
- ✅ No direct database access from controllers
- ✅ Proper use of dependency injection
- ✅ Repository pattern correctly implemented

---

## Module Metrics Summary

| Module | Cohesion | Coupling | Circular Deps | Status |
|--------|----------|----------|---------------|--------|
| GuildsModule | High | High (10+) | 2 cycles | ⚠️ High coupling |
| LeaguesModule | High | Medium (6) | 1 cycle | ✅ Good |
| PlayersModule | High | Low (3) | 0 cycles | ✅ Excellent |
| TrackersModule | Moderate | High (5+) | 1 cycle | ⚠️ Needs refactoring |
| AuthModule | Moderate | Medium (5) | 0 cycles | ⚠️ Needs refactoring |
| CommonModule | Moderate | High (7+) | 2 cycles | ✅ Well-architected |
| InfrastructureModule | Low | Low (1) | 0 cycles | ✅ Acceptable (barrel) |

---

## Recommendations by Module

### TrackersModule
**Priority**: High
**Issues**: Mixed responsibilities in TrackerService, high coupling
**Recommendations**:
1. Extract TrackerProcessingService from TrackerService
2. Consider splitting into TrackersModule and TrackerProcessingModule if complexity grows

### AuthModule
**Priority**: Medium
**Issues**: Business logic in controller
**Recommendations**:
1. Extract AuthOrchestrationService
2. Move guild sync logic to UserGuildsService

### GuildsModule
**Priority**: Low
**Issues**: High coupling (many dependencies)
**Recommendations**:
1. Monitor for further growth
2. Consider introducing shared interfaces to reduce coupling

### Circular Dependencies
**Priority**: Medium
**Recommendations**:
1. Review all forwardRef() usages
2. Consider event-driven patterns for cross-module communication
3. Introduce shared interfaces/contracts where appropriate

---

## Module Health Score

| Module | Health Score | Grade |
|--------|--------------|-------|
| PlayersModule | 95/100 | A |
| LeaguesModule | 85/100 | B+ |
| TeamsModule | 85/100 | B+ |
| GuildsModule | 75/100 | C+ |
| CommonModule | 80/100 | B |
| AuthModule | 70/100 | C |
| TrackersModule | 65/100 | D+ |
| InfrastructureModule | 90/100 | A- |

**Average Module Health**: 80.6/100 (B)

---

## Conclusion

The module structure demonstrates **good separation of domain concerns** with clear boundaries between domain modules. However, several modules exhibit:

1. **High coupling** (GuildsModule, TrackersModule) - many dependencies
2. **Moderate cohesion issues** (TrackersModule, AuthModule) - mixed responsibilities
3. **Circular dependencies** - multiple cycles requiring forwardRef()

**Overall Module Architecture**: **B** (Good structure with targeted improvements needed)

**Priority Actions**:
1. Refactor TrackersModule (extract processing service)
2. Simplify AuthModule (extract orchestration)
3. Review and break circular dependencies where possible


