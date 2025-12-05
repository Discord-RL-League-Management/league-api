# Separation of Concerns Analysis: `guilds` Module
**Analysis Date:** December 4, 2025  
**Technology Stack:** NestJS 11, TypeScript 5.7, Prisma ORM 6.18, Node.js 24+  
**Architectural Topology:** Layered Monolith (Presentation → Business Logic → Data Access)  
**Principle Foundation:** Principle of Independent Variation (PIV) - "separate elements that vary independently; unify elements that vary dependently"

---

## Pre-Pass: Architectural Context Setting

### Technology Synthesis
- **Framework:** NestJS 11.0.1 (Modular Monolith architecture)
- **Language:** TypeScript 5.7.3 (strict mode enabled)
- **ORM:** Prisma 6.18.0 (type-safe database access)
- **Runtime:** Node.js 24+ (ES2023 target)
- **Architecture Pattern:** Layered Monolith with Domain-Driven Design influences

### Module Structure
- **Total Files:** 19 TypeScript files (excluding tests)
- **Total Imports:** 101 import statements
- **Components Analyzed:** 8 classes (3 controllers, 4 services, 1 repository)
- **Module Dependencies:** 10 external modules (circular dependencies via `forwardRef`)

### Architectural Boundaries Identified
1. **Presentation Layer:** Controllers (GuildsController, InternalGuildsController, GuildSettingsController)
2. **Business Logic Layer:** Services (GuildsService, GuildSettingsService, SettingsValidationService, etc.)
3. **Data Access Layer:** Repository (GuildRepository)
4. **Infrastructure Layer:** Caching, Activity Logging, Settings Management

---

## Pass 1: Diagnostics and Violation Quantification

### Cohesion Metrics (LCOM - Lack of Cohesion in Methods)

#### 1. GuildsService
**LCOM Score: 82%** ⚠️ **SEVERE VIOLATION**

**Method Count:** 9 public methods
**Responsibility Analysis:**
- CRUD Operations (create, findOne, findAll, update, remove, upsert): 6 methods
- Transaction Management (syncGuildWithMembers): 1 method (265 lines - violates SRP)
- Error Handling (extractErrorInfo): 1 method (73 lines)
- Utility (exists, findActiveGuildIds): 2 methods

**Cohesion Issues:**
- `syncGuildWithMembers()` directly accesses Prisma (bypasses repository pattern)
- `syncGuildWithMembers()` handles: guild upsert, settings management, user creation, member sync (4 distinct concerns)
- `extractErrorInfo()` handles 5 different error types (Prisma errors, generic errors)
- Methods share no common data structure beyond constructor dependencies

**Classification:** **ANTI-PATTERN** (God Class candidate)

---

#### 2. GuildSettingsService
**LCOM Score: 68%** ⚠️ **MODERATE VIOLATION**

**Method Count:** 5 public methods
**Responsibility Analysis:**
- Settings Retrieval (getSettings): Caching + Migration + Validation orchestration
- Settings Update (updateSettings): Validation + Merging + Transaction + Activity Logging
- Settings Reset (resetSettings): Transaction + Activity Logging
- History Retrieval (getSettingsHistory): Activity Log query

**Cohesion Issues:**
- `getSettings()` orchestrates: caching, migration, validation, defaults merging (4 concerns)
- `updateSettings()` orchestrates: validation, merging, transaction management, activity logging (4 concerns)
- Methods share `cacheManager` and `settingsService` but operate on different data flows

**Classification:** **CODE SMELL** (Orchestrator with too many responsibilities)

---

#### 3. GuildsController
**LCOM Score: 45%** ✅ **ACCEPTABLE**

**Method Count:** 4 public methods
**Responsibility Analysis:**
- All methods follow similar pattern: validate access → check permissions → delegate to service
- Shared concern: Permission checking (repeated in 3 of 4 methods)
- Shared concern: Access validation (repeated in all methods)

**Cohesion Issues:**
- Permission checking logic duplicated across methods (should be extracted to interceptor/guard)
- Access validation duplicated (already extracted to `GuildAccessValidationService` but called inline)

**Classification:** **CODE SMELL** (Duplication, not SRP violation)

---

#### 4. SettingsValidationService
**LCOM Score: 35%** ✅ **GOOD**

**Method Count:** 4 methods (1 public, 3 private)
**Responsibility Analysis:**
- All methods focus on validation concerns
- Private methods are cohesive (channel validation, MMR validation)

**Classification:** **ACCEPTABLE** (Well-separated concerns)

---

### Coupling Metrics (CBO - Coupling Between Objects)

#### Cross-Layer Coupling Analysis

**GuildsService Coupling:**
- **CBO Score: 12 dependencies**
- **Cross-Boundary Violations:**
  1. Direct Prisma access (bypasses repository) - **ARCHITECTURAL VIOLATION**
  2. Depends on SettingsDefaultsService (business logic dependency)
  3. Depends on GuildRepository (correct data access pattern)
- **External Dependencies:** PrismaService, SettingsDefaultsService, GuildRepository

**GuildSettingsService Coupling:**
- **CBO Score: 8 dependencies**
- **Cross-Boundary Violations:**
  1. Depends on InfrastructureModule (SettingsService, ActivityLogService) - **ACCEPTABLE** (infrastructure layer)
  2. Depends on GuildRepository (data access) - **ACCEPTABLE**
  3. Depends on multiple services (SettingsDefaultsService, SettingsValidationService, ConfigMigrationService) - **ORCHESTRATION PATTERN**
- **External Dependencies:** 8 services across 3 architectural layers

**GuildsController Coupling:**
- **CBO Score: 7 dependencies**
- **Cross-Boundary Violations:**
  1. Depends on 7 services (high coupling for controller) - **CODE SMELL**
  2. Permission checking logic embedded in controller methods - **PRESENTATION LAYER VIOLATION**
- **External Dependencies:** 7 services (should be reduced via facades/interceptors)

---

### Violation Register

| Component | LCOM | CBO | Classification | Severity |
|-----------|------|-----|----------------|----------|
| **GuildsService** | 82% | 12 | **ANTI-PATTERN** | 🔴 **CRITICAL** |
| **GuildSettingsService** | 68% | 8 | **CODE SMELL** | 🟡 **HIGH** |
| **GuildsController** | 45% | 7 | **CODE SMELL** | 🟡 **MEDIUM** |
| **SettingsValidationService** | 35% | 3 | **ACCEPTABLE** | ✅ **LOW** |
| **SettingsDefaultsService** | 25% | 1 | **ACCEPTABLE** | ✅ **LOW** |
| **GuildRepository** | 20% | 1 | **ACCEPTABLE** | ✅ **LOW** |
| **ConfigMigrationService** | 30% | 1 | **ACCEPTABLE** | ✅ **LOW** |
| **GuildAccessValidationService** | 40% | 4 | **ACCEPTABLE** | ✅ **LOW** |

---

## Pass 2: Impact Assessment and Risk Quantification

### Dependency Mapping (Runtime-Aware)

#### Critical Dependency Chain Analysis

**GuildsService → PrismaService (Direct Access)**
- **Impact:** High - Bypasses repository abstraction
- **Volatility:** Medium - Prisma API changes affect service directly
- **Transitive Dependencies:** All services using GuildsService are affected
- **Affected Components:** 5+ services across modules

**GuildSettingsService → InfrastructureModule**
- **Impact:** Medium - Settings and ActivityLog are infrastructure concerns
- **Volatility:** Low - Infrastructure services are stable
- **Transitive Dependencies:** Limited to settings-related operations

**GuildsController → 7 Services**
- **Impact:** High - Controller tightly coupled to business logic
- **Volatility:** High - Any service change requires controller updates
- **Transitive Dependencies:** All HTTP endpoints affected

---

### Hotspot Identification

#### Hotspot 1: GuildsService.syncGuildWithMembers()
**Code Health:** Poor (P1 metrics)
- **Lines of Code:** 265 lines (exceeds 50-line guideline by 430%)
- **Cyclomatic Complexity:** ~15 (high complexity)
- **Code Churn:** High (frequently modified for transaction logic)
- **Dependencies:** 4 distinct concerns (guild, settings, users, members)

**Risk Level:** 🔴 **CRITICAL**
- **Refactoring Impact:** High - Used by bot sync operations
- **Test Coverage Risk:** High - Complex transaction logic
- **Maintenance Burden:** Very High - Single method handles 4 concerns

---

#### Hotspot 2: GuildSettingsService.getSettings()
**Code Health:** Moderate (P1 metrics)
- **Lines of Code:** 89 lines (exceeds guideline by 78%)
- **Cyclomatic Complexity:** ~8 (moderate complexity)
- **Code Churn:** Medium (migration logic changes)
- **Dependencies:** Caching, Migration, Validation, Defaults

**Risk Level:** 🟡 **HIGH**
- **Refactoring Impact:** Medium - Core settings retrieval
- **Test Coverage Risk:** Medium - Multiple code paths
- **Maintenance Burden:** High - Orchestrates 4 services

---

#### Hotspot 3: GuildsController Permission Checking
**Code Health:** Moderate (P1 metrics)
- **Code Duplication:** 3 methods with identical permission logic
- **Code Churn:** Low (stable pattern)
- **Dependencies:** PermissionCheckService, GuildMembersService, GuildSettingsService

**Risk Level:** 🟡 **MEDIUM**
- **Refactoring Impact:** Low - Can be extracted to interceptor
- **Test Coverage Risk:** Low - Simple delegation pattern
- **Maintenance Burden:** Medium - Duplication increases maintenance cost

---

### Dependency Hell Index (DHI) Calculation

#### DHI for GuildsService Refactoring

**Direct Dependencies:** 3 (SettingsDefaultsService, GuildRepository, PrismaService)
**Transitive Dependencies:** 
- SettingsDefaultsService → 0
- GuildRepository → PrismaService (1)
- PrismaService → Database (external)

**Affected Modules:**
- GuildMembersModule (uses GuildsService)
- LeaguesModule (uses GuildsService)
- TrackersModule (uses GuildsService)
- InternalModule (uses GuildsService)

**DHI Score: 7.5** (Scale: 0-10)
- **Calculation:** (3 direct + 4 transitive + 4 affected modules) / 1.5 = 7.5
- **Interpretation:** High refactoring risk - changes require coordination across 4+ modules

---

#### DHI for GuildSettingsService Refactoring

**Direct Dependencies:** 8 services
**Transitive Dependencies:** 
- InfrastructureModule → 2 services
- SettingsDefaultsService → 0
- SettingsValidationService → 2 services
- ConfigMigrationService → 1 service

**Affected Modules:**
- GuildsModule (primary consumer)
- LeaguesModule (indirect via settings)
- MmrCalculationModule (uses settings)

**DHI Score: 6.2**
- **Interpretation:** Medium-High refactoring risk

---

### Refactoring Priority Score (RPS) Calculation

**RPS Formula:** `(LCOM × 0.4) + (CBO × 0.2) + (DHI × 0.2) + (Hotspot Severity × 0.2)`

| Component | LCOM | CBO | DHI | Hotspot | **RPS** | Priority |
|-----------|------|-----|-----|---------|---------|----------|
| **GuildsService** | 82% | 12 | 7.5 | 10 | **8.48** | 🔴 **P0** |
| **GuildSettingsService** | 68% | 8 | 6.2 | 7 | **6.84** | 🟡 **P1** |
| **GuildsController** | 45% | 7 | 3.0 | 5 | **4.60** | 🟢 **P2** |

---

## Pass 3: Remediation Strategy and Phased Plan

### Top 3 High-RPS Violations Remediation

---

### Violation #1: GuildsService (RPS: 8.48) - CRITICAL

#### Current State Analysis
- **Primary Issue:** `syncGuildWithMembers()` violates SRP with 4 distinct responsibilities
- **Secondary Issue:** Direct Prisma access bypasses repository pattern
- **Tertiary Issue:** Error extraction logic mixed with business logic

#### Behavioral Preservation Requirements
**Existing Tests Required:**
1. `guilds.service.spec.ts` - Unit tests for all 9 methods
2. Integration tests for `syncGuildWithMembers()` transaction behavior
3. Error handling tests for `extractErrorInfo()` with all 5 error types

**Test Coverage Target:** 85%+ before refactoring

---

#### Refactoring Pattern: **Strangler Fig Pattern** (Phased Migration)

**Phase 1: Extract Transaction Service (Week 1-2)**
- **Pattern:** Extract Class
- **Action:** Create `GuildSyncService` to handle `syncGuildWithMembers()` logic
- **Milestones:**
  - [ ] Create `GuildSyncService` with transaction logic
  - [ ] Move Prisma transaction code to new service
  - [ ] Update `GuildsService` to delegate to `GuildSyncService`
  - [ ] Maintain backward compatibility (deprecation period)
  - [ ] Achieve 85%+ test coverage for new service
- **Effort:** 16-24 hours
- **Risk:** Medium (transaction logic is critical)

**Phase 2: Extract Error Handling (Week 2-3)**
- **Pattern:** Extract Class
- **Action:** Create `GuildErrorHandlerService` for error extraction
- **Milestones:**
  - [ ] Create `GuildErrorHandlerService` with `extractErrorInfo()` logic
  - [ ] Move error type handling to dedicated service
  - [ ] Update `GuildsService` to use error handler
  - [ ] Maintain error response format compatibility
  - [ ] Achieve 90%+ test coverage
- **Effort:** 8-12 hours
- **Risk:** Low (error handling is isolated)

**Phase 3: Repository Pattern Enforcement (Week 3-4)**
- **Pattern:** Extract Method + Move to Repository
- **Action:** Move Prisma access from `GuildsService` to `GuildRepository`
- **Milestones:**
  - [ ] Add `syncGuildWithMembers()` method to `GuildRepository`
  - [ ] Move transaction logic to repository
  - [ ] Update `GuildSyncService` to use repository
  - [ ] Remove direct Prisma access from `GuildsService`
  - [ ] Verify all tests pass
- **Effort:** 12-16 hours
- **Risk:** Medium (database transaction changes)

**Total Effort:** 36-52 hours (4-6 weeks with testing)

---

### Violation #2: GuildSettingsService (RPS: 6.84) - HIGH

#### Current State Analysis
- **Primary Issue:** `getSettings()` orchestrates 4 concerns (caching, migration, validation, defaults)
- **Secondary Issue:** `updateSettings()` orchestrates 4 concerns (validation, merging, transaction, logging)

#### Behavioral Preservation Requirements
**Existing Tests Required:**
1. Unit tests for all 5 public methods
2. Integration tests for caching behavior
3. Migration tests for schema version transitions
4. Transaction rollback tests

**Test Coverage Target:** 80%+ before refactoring

---

#### Refactoring Pattern: **Extract Class** (Local Micro-Refactoring)

**Phase 1: Extract Caching Concern (Week 1)**
- **Pattern:** Extract Class
- **Action:** Create `GuildSettingsCacheService` for caching logic
- **Milestones:**
  - [ ] Create `GuildSettingsCacheService` with cache get/set/del methods
  - [ ] Move cache key generation to service
  - [ ] Update `GuildSettingsService` to use cache service
  - [ ] Maintain cache TTL behavior
  - [ ] Achieve 85%+ test coverage
- **Effort:** 8-12 hours
- **Risk:** Low (caching is isolated)

**Phase 2: Extract Migration Orchestration (Week 2)**
- **Pattern:** Extract Method → Extract Class
- **Action:** Create `GuildSettingsMigrationOrchestrator` for migration flow
- **Milestones:**
  - [ ] Create orchestrator service
  - [ ] Move migration detection and execution logic
  - [ ] Update `GuildSettingsService` to delegate migration
  - [ ] Maintain migration chain behavior
  - [ ] Achieve 90%+ test coverage
- **Effort:** 12-16 hours
- **Risk:** Medium (migration logic is critical)

**Phase 3: Simplify getSettings() (Week 2-3)**
- **Pattern:** Extract Method
- **Action:** Break `getSettings()` into smaller, focused methods
- **Milestones:**
  - [ ] Extract `getCachedSettings()` method
  - [ ] Extract `ensureSettingsExist()` method
  - [ ] Extract `migrateSettingsIfNeeded()` method
  - [ ] Refactor `getSettings()` to orchestrate extracted methods
  - [ ] Maintain public API compatibility
  - [ ] Achieve 85%+ test coverage
- **Effort:** 16-20 hours
- **Risk:** Low (internal refactoring)

**Total Effort:** 36-48 hours (3-4 weeks with testing)

---

### Violation #3: GuildsController (RPS: 4.60) - MEDIUM

#### Current State Analysis
- **Primary Issue:** Permission checking logic duplicated across 3 methods
- **Secondary Issue:** High service coupling (7 dependencies)

#### Behavioral Preservation Requirements
**Existing Tests Required:**
1. Controller unit tests with mocked services
2. Integration tests for permission checking
3. E2E tests for admin-only endpoints

**Test Coverage Target:** 75%+ before refactoring

---

#### Refactoring Pattern: **Extract Method + Interceptor** (Local Refactoring)

**Phase 1: Extract Permission Check to Interceptor (Week 1)**
- **Pattern:** Extract Method → Move to Interceptor
- **Action:** Create `GuildAdminInterceptor` for permission checking
- **Milestones:**
  - [ ] Create `GuildAdminInterceptor` with permission check logic
  - [ ] Extract permission check pattern from controller methods
  - [ ] Apply interceptor to admin-only endpoints
  - [ ] Remove duplicate permission code from controller
  - [ ] Achieve 80%+ test coverage
- **Effort:** 12-16 hours
- **Risk:** Low (interceptor pattern is standard NestJS)

**Phase 2: Reduce Service Coupling (Week 1-2)**
- **Pattern:** Introduce Facade
- **Action:** Create `GuildFacadeService` to reduce controller dependencies
- **Milestones:**
  - [ ] Create `GuildFacadeService` aggregating common operations
  - [ ] Move permission + access validation to facade
  - [ ] Update controller to use facade instead of 7 services
  - [ ] Maintain API response format
  - [ ] Achieve 75%+ test coverage
- **Effort:** 16-20 hours
- **Risk:** Low (facade is additive pattern)

**Total Effort:** 28-36 hours (2-3 weeks with testing)

---

## Phased Correction Plan Summary

| Violation ID | Component | RPS | Pattern | Phases | Total Effort | Timeline |
|--------------|----------|-----|---------|--------|--------------|----------|
| **V-001** | GuildsService | 8.48 | Strangler Fig | 3 phases | 36-52 hours | 4-6 weeks |
| **V-002** | GuildSettingsService | 6.84 | Extract Class | 3 phases | 36-48 hours | 3-4 weeks |
| **V-003** | GuildsController | 4.60 | Extract + Interceptor | 2 phases | 28-36 hours | 2-3 weeks |

**Total Estimated Effort:** 100-136 hours (9-13 weeks with parallel work streams)

**Recommended Approach:** 
- **Parallel Stream 1:** V-001 (GuildsService) - Critical path
- **Parallel Stream 2:** V-002 (GuildSettingsService) + V-003 (GuildsController) - Can proceed in parallel

**Success Criteria:**
1. All LCOM scores < 50%
2. All CBO scores < 8
3. All DHI scores < 5
4. Test coverage maintained or improved
5. Zero behavioral regressions
6. All architectural boundaries respected

---

## Recommendations

### Immediate Actions (Week 1)
1. ✅ **Create comprehensive test suite** for `GuildsService.syncGuildWithMembers()` before refactoring
2. ✅ **Document transaction behavior** to ensure behavioral preservation
3. ✅ **Establish refactoring branch** with feature flags for gradual migration

### Short-Term (Weeks 2-4)
1. 🔄 **Extract GuildSyncService** (V-001 Phase 1)
2. 🔄 **Extract GuildSettingsCacheService** (V-002 Phase 1)
3. 🔄 **Create GuildAdminInterceptor** (V-003 Phase 1)

### Long-Term (Weeks 5-13)
1. 📋 **Complete Strangler Fig migration** for GuildsService
2. 📋 **Complete settings service refactoring**
3. 📋 **Reduce controller coupling** via facade pattern

### Architectural Improvements
1. **Enforce Repository Pattern:** Remove all direct Prisma access from services
2. **Introduce Domain Events:** Replace tight coupling with event-driven communication
3. **Implement CQRS:** Separate read/write operations for better scalability
4. **Add Integration Tests:** Ensure behavioral preservation across refactorings

---

**Analysis Complete** ✅  
**Next Review:** After Phase 1 completion (Week 4)

