# Separation of Concerns - Dependency Graph Analysis
## Analysis Date: 2025-01-27

---

## Dependency Graph Overview

This document provides a visual representation of module and component dependencies to identify coupling patterns and potential architectural issues.

---

## Module Dependency Graph

### Domain Modules (Core)

```
┌─────────────────┐
│  PlayersModule  │ (Low coupling, High cohesion)
└────────┬────────┘
         │
         ├──► PrismaModule
         ├──► InfrastructureModule
         └──► AuthModule (guards only)

┌─────────────────┐
│  LeaguesModule  │ (Medium coupling, High cohesion)
└────────┬────────┘
         │
         ├──► PrismaModule
         ├──► InfrastructureModule
         ├──► CommonModule
         ├──► AuthModule
         ├──► GuildsModule
         ├──► PlayersModule
         ├──► PermissionCheckModule
         ├──► LeagueMembersModule (forwardRef - circular)
         ├──► OrganizationsModule (forwardRef - circular)
         └──► TeamsModule (forwardRef - circular)

┌─────────────────┐
│  TrackersModule │ (High coupling, Moderate cohesion)
└────────┬────────┘
         │
         ├──► PrismaModule
         ├──► InfrastructureModule (forwardRef - circular)
         ├──► AuditModule (forwardRef - circular)
         ├──► MmrCalculationModule
         ├──► GuildsModule (forwardRef - circular)
         ├──► BullMQ (queue system)
         ├──► HttpModule (axios)
         └──► ConfigModule

┌─────────────────┐
│  GuildsModule   │ (High coupling, High cohesion)
└────────┬────────┘
         │
         ├──► PrismaModule
         ├──► InfrastructureModule (forwardRef - circular)
         ├──► UserGuildsModule (forwardRef - circular)
         ├──► DiscordModule
         ├──► CommonModule (forwardRef - circular)
         ├──► AuditModule (forwardRef - circular)
         ├──► PermissionCheckModule
         ├──► MmrCalculationModule (forwardRef - circular)
         ├──► UsersModule
         └──► GuildMembersModule
```

### Cross-Cutting Modules

```
┌─────────────────┐
│  CommonModule   │ (High coupling, Moderate cohesion)
└────────┬────────┘
         │ Uses Dependency Inversion Pattern (adapters)
         │
         ├──► ConfigModule
         ├──► AuditModule (forwardRef - circular)
         ├──► PermissionCheckModule
         ├──► GuildsModule (forwardRef - circular)
         ├──► GuildMembersModule
         ├──► DiscordModule
         └──► TokenManagementModule

┌─────────────────┐
│   AuthModule    │ (Medium coupling, Moderate cohesion)
└────────┬────────┘
         │
         ├──► PrismaModule
         ├──► DiscordModule (DiscordApiService, DiscordOAuthService)
         ├──► UserGuildsModule
         ├──► GuildsModule
         └──► ConfigModule
```

---

## Circular Dependency Chains

### Cycle 1: CommonModule ↔ AuditModule
```
CommonModule
  ├──► AuditModule (for AuditProviderAdapter)
  │       └──► CommonModule (for AdminGuard)
  │               └──► [CYCLE]
```

**Resolution**: forwardRef() + Adapter Pattern
**Impact**: Medium - Managed but architectural smell

### Cycle 2: GuildsModule ↔ CommonModule
```
GuildsModule
  ├──► CommonModule (for AdminGuard)
  │       └──► GuildsModule (for GuildAccessProviderAdapter)
  │               └──► [CYCLE]
```

**Resolution**: forwardRef() + Adapter Pattern
**Impact**: Medium - Managed but architectural smell

### Cycle 3: LeaguesModule ↔ LeagueMembersModule
```
LeaguesModule
  ├──► LeagueMembersModule (forwardRef)
  │       └──► LeaguesModule (forwardRef)
  │               └──► [CYCLE]
```

**Resolution**: forwardRef()
**Impact**: Low - Bidirectional domain relationship

### Cycle 4: GuildsModule ↔ UserGuildsModule
```
GuildsModule
  ├──► UserGuildsModule (forwardRef)
  │       └──► GuildsModule (forwardRef)
  │               └──► [CYCLE]
```

**Resolution**: forwardRef()
**Impact**: Low - Bidirectional relationship

### Cycle 5: TrackersModule ↔ InfrastructureModule
```
TrackersModule
  ├──► InfrastructureModule (forwardRef)
  │       └──► (potential dependency chain back to TrackersModule)
  │               └──► [CYCLE]
```

**Resolution**: forwardRef()
**Impact**: Medium - Needs review

---

## Service Dependency Graph (Critical Paths)

### TrackerService Dependency Chain
```
TrackerService (CBO: 9)
│
├──► PrismaService
│
├──► TrackerRepository
│       └──► PrismaService
│
├──► TrackerValidationService
│
├──► TrackerScrapingQueueService
│       └──► BullMQ Queue
│
├──► TrackerSeasonService
│
├──► TrackerProcessingGuardService
│
├──► TrackerUserOrchestratorService
│       └──► [Multiple dependencies]
│
├──► TrackerQueueOrchestratorService
│       └──► [Multiple dependencies]
│
└──► TrackerBatchProcessorService
        └──► [Multiple dependencies]

Total Transitive Dependencies: ~25-30 components
```

### AuthController Dependency Chain
```
AuthController (CBO: 7)
│
├──► AuthService
│       └──► PrismaService
│
├──► DiscordOAuthService
│       └──► Discord API (external)
│
├──► DiscordApiService
│       └──► Discord API (external)
│
├──► TokenManagementService
│
├──► UserGuildsService
│       ├──► PrismaService
│       └──► GuildMembersService
│
├──► GuildsService
│       └──► GuildRepository
│
└──► ConfigService

Total Transitive Dependencies: ~20-25 components
```

### GuildsController Dependency Chain
```
GuildsController (CBO: 7)
│
├──► GuildsService
│       └──► GuildRepository
│
├──► GuildMembersService
│       └──► [Multiple dependencies]
│
├──► GuildAccessValidationService
│
├──► PermissionCheckService
│       └──► [Multiple dependencies]
│
├──► GuildSettingsService
│
├──► UserGuildsService
│       └──► [Multiple dependencies]
│
└──► DiscordBotService
        └──► Discord API (external)

Total Transitive Dependencies: ~18-22 components
```

---

## Dependency Depth Analysis

### Critical Paths (Deep Dependency Chains)

**Path 1: TrackerService → Orchestrators**
```
TrackerService
  └──► TrackerUserOrchestratorService
        └──► [Multiple services]
              └──► [Infrastructure services]
                    └──► PrismaService / External APIs
Depth: 4-5 levels
```

**Path 2: AuthController → Guild Sync**
```
AuthController
  └──► UserGuildsService
        └──► GuildMembersService
              └──► PrismaService
Depth: 3-4 levels
```

**Path 3: GuildsController → Permission Check**
```
GuildsController
  └──► PermissionCheckService
        └──► GuildSettingsService
              └──► SettingsRepository
                    └──► PrismaService
Depth: 4 levels
```

---

## Coupling Metrics by Module

| Module | In-Degree | Out-Degree | Total Dependencies | Coupling Level |
|--------|-----------|------------|-------------------|----------------|
| GuildsModule | 8 | 10+ | 18+ | 🔴 High |
| TrackersModule | 6 | 5+ | 11+ | 🔴 High |
| CommonModule | 5 | 7+ | 12+ | 🟡 Medium-High |
| LeaguesModule | 4 | 9 | 13 | 🟡 Medium-High |
| AuthModule | 3 | 5 | 8 | 🟢 Medium |
| PlayersModule | 2 | 3 | 5 | 🟢 Low |
| TeamsModule | 2 | 4 | 6 | 🟢 Low |

**Legend**:
- 🔴 High: >15 total dependencies
- 🟡 Medium-High: 10-15 total dependencies
- 🟢 Medium: 6-9 total dependencies
- 🟢 Low: <6 total dependencies

---

## Architectural Boundaries

### Layer Boundaries (Well-Maintained) ✅

```
┌─────────────────────────────────────┐
│     Presentation Layer              │
│  (Controllers - 37 controllers)     │
└──────────────┬──────────────────────┘
               │ depends on
               ▼
┌─────────────────────────────────────┐
│     Application Layer               │
│  (Services - 79 services)           │
└──────────────┬──────────────────────┘
               │ depends on
               ▼
┌─────────────────────────────────────┐
│     Domain/Infrastructure Layer     │
│  (Repositories, External Services)  │
└──────────────┬──────────────────────┘
               │ depends on
               ▼
┌─────────────────────────────────────┐
│     Data Layer                      │
│  (Prisma ORM, PostgreSQL)           │
└─────────────────────────────────────┘
```

**Status**: ✅ No violations - proper layering maintained

---

## Dependency Inversion Usage

### Adapter Pattern (CommonModule)

```
AdminGuard
  └──► depends on interfaces
        ├──► IPermissionProvider (via adapter)
        ├──► IAuditProvider (via adapter)
        ├──► IDiscordProvider (via adapter)
        ├──► ITokenProvider (via adapter)
        └──► IGuildAccessProvider (via adapter)

Adapters:
  ├──► PermissionProviderAdapter
  ├──► AuditProviderAdapter
  ├──► DiscordProviderAdapter
  ├──► TokenProviderAdapter
  └──► GuildAccessProviderAdapter
```

**Status**: ✅ Well-implemented - breaks circular dependencies

---

## Recommendations Based on Dependency Graph

### High Priority
1. **Reduce TrackersModule Coupling**
   - Extract TrackerProcessingService to reduce TrackerService dependencies
   - Consider splitting into sub-modules if complexity grows

2. **Break Circular Dependencies**
   - Review all forwardRef() usages
   - Consider event-driven patterns for cross-module communication
   - Use dependency inversion more extensively

### Medium Priority
1. **Reduce GuildsModule Coupling**
   - Monitor for further growth
   - Consider introducing shared interfaces
   - Evaluate if all dependencies are necessary

2. **Simplify AuthController Chain**
   - Extract orchestration logic
   - Reduce depth of dependency chain

### Low Priority
1. **Document Dependency Rationale**
   - Document why each dependency exists
   - Review periodically for stale dependencies

---

## Dependency Health Score

| Aspect | Score | Grade |
|--------|-------|-------|
| Layer Boundaries | 95/100 | A |
| Dependency Inversion | 85/100 | B+ |
| Circular Dependencies | 65/100 | D |
| Coupling Level | 75/100 | C+ |
| Dependency Depth | 80/100 | B |

**Overall Dependency Health**: 80/100 (B)

---

## Conclusion

The dependency graph shows:
- ✅ **Good layer boundaries** - proper separation of concerns
- ✅ **Effective use of dependency inversion** - adapter pattern in CommonModule
- ⚠️ **Multiple circular dependencies** - requires forwardRef() in several places
- ⚠️ **High coupling in some modules** - GuildsModule and TrackersModule

**Recommendations**:
1. Focus on breaking circular dependencies (highest architectural impact)
2. Reduce coupling in high-dependency modules
3. Continue using dependency inversion pattern for new cross-cutting concerns


