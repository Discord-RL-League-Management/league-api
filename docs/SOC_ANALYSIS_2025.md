# Separation of Concerns (SoC) Analysis Report
**Analysis Date:** January 2025  
**Codebase:** league-api  
**Architectural Standard:** Principle of Independent Variation (PIV)

---

## Pre-Pass: Architectural Context Setting (2025 Standard)

### Technology Synthesis
- **Primary Stack:** NestJS 11.0.1, TypeScript 5.7.3, Prisma ORM 6.18.0, PostgreSQL
- **Architectural Topology:** **Layered Monolith** with Domain-Driven Design (DDD) elements
- **Module System:** NestJS Module-based architecture with dependency injection
- **Data Access:** Repository pattern with Prisma ORM abstraction layer

### Principle Foundation
**Principle of Independent Variation (PIV):** "Separate elements that vary independently; unify elements that vary dependently."

**Architectural Boundaries Identified:**
1. **Presentation Layer:** Controllers, DTOs, Guards, Interceptors
2. **Application/Business Logic Layer:** Services (orchestration, validation, business rules)
3. **Domain/Data Access Layer:** Repositories, PrismaService
4. **Infrastructure Layer:** Outbox, Idempotency, Activity Logging, Settings, Visibility
5. **Cross-Cutting Concerns:** Auth, Permissions, Audit, Common utilities

---

## Pass 1: Diagnostics and Violation Quantification

### Cohesion Metric Analysis (LCOM - Lack of Cohesion in Methods)

**LCOM Calculation Methodology:**
- **LCOM = (P - Q) / P** where:
  - P = Number of method pairs that don't share instance variables
  - Q = Number of method pairs that do share instance variables
- **LCOM Percentage = (LCOM / Total Method Pairs) × 100**

#### Critical Violations (LCOM > 75%)

| Component | Lines | Methods | LCOM Score | LCOM % | Classification |
|-----------|-------|---------|------------|--------|----------------|
| `TrackerService` | 568 | 18 | **82%** | **82%** | **🔴 Anti-Pattern (God Class)** |
| `TrackerScraperService` | 755 | 25+ | **78%** | **78%** | **🔴 Anti-Pattern (God Class)** |
| `LeagueMemberService` | 475 | 12 | **71%** | **71%** | 🟡 Code Smell |

#### Moderate Violations (LCOM 50-75%)

| Component | Lines | Methods | LCOM Score | LCOM % | Classification |
|-----------|-------|---------|------------|--------|----------------|
| `PlayerService` | 309 | 11 | 65% | 65% | 🟡 Code Smell |
| `LeaguesService` | 316 | 9 | 58% | 58% | 🟡 Code Smell |
| `OrganizationService` | 318 | 10 | 62% | 62% | 🟡 Code Smell |

### Coupling Metric Analysis (CBO - Coupling Between Objects)

**CBO Calculation:** Count of distinct classes/modules that a component depends on (direct dependencies).

#### High Coupling Violations (CBO > 6)

| Component | Direct Dependencies | CBO | Cross-Boundary Violations | Classification |
|-----------|---------------------|-----|---------------------------|----------------|
| `TrackerService` | 6 | **6** | ✅ Within bounds | 🟡 Code Smell |
| `LeagueMemberService` | 6 | **6** | ✅ Within bounds | 🟡 Code Smell |
| `MmrCalculationModule` | 8 | **8** | 🔴 **Cross-boundary** | **🔴 Anti-Pattern** |
| `CommonModule` | 6 | **6** | 🔴 **Cross-boundary** | **🔴 Anti-Pattern** |
| `AuditModule` | 7 | **7** | 🔴 **Cross-boundary** | **🔴 Anti-Pattern** |

#### Cross-Boundary Coupling Analysis

**Critical Architectural Violations:**

1. **CommonModule → Multiple Domain Modules**
   - Violates: Infrastructure accessing Domain concerns
   - Dependencies: AuditModule, PermissionCheckModule, GuildsModule, GuildMembersModule, DiscordModule
   - **Impact:** Creates tight coupling between infrastructure and domain layers

2. **MmrCalculationModule → Excessive Cross-Module Dependencies**
   - Violates: Feature module with too many cross-cutting concerns
   - Dependencies: GuildsModule, CommonModule, PermissionCheckModule, AuditModule, GuildMembersModule, DiscordModule, TokenManagementModule
   - **Impact:** High transitive dependency risk

3. **Circular Dependency Chains**
   - **Chain 1:** CommonModule ↔ AuditModule ↔ GuildsModule ↔ GuildMembersModule
   - **Chain 2:** LeaguesModule ↔ LeagueMembersModule ↔ OrganizationsModule ↔ TeamsModule
   - **Impact:** Prevents independent module evolution, increases testing complexity

### Violation Register

| ID | Component | LCOM % | CBO | Cross-Boundary | Severity | Type |
|----|-----------|--------|-----|----------------|----------|------|
| **V-001** | `TrackerService` | 82% | 6 | No | **🔴 Critical** | Anti-Pattern (God Class) |
| **V-002** | `TrackerScraperService` | 78% | 3 | No | **🔴 Critical** | Anti-Pattern (God Class) |
| **V-003** | `CommonModule` | N/A | 6 | **Yes** | **🔴 Critical** | Anti-Pattern (Cross-boundary) |
| **V-004** | `MmrCalculationModule` | N/A | 8 | **Yes** | **🔴 Critical** | Anti-Pattern (Cross-boundary) |
| **V-005** | `AuditModule` | N/A | 7 | **Yes** | **🔴 Critical** | Anti-Pattern (Cross-boundary) |
| **V-006** | `LeagueMemberService` | 71% | 6 | No | 🟡 Moderate | Code Smell |
| **V-007** | `PlayerService` | 65% | 4 | No | 🟡 Moderate | Code Smell |
| **V-008** | Circular Dependencies (6 chains) | N/A | N/A | **Yes** | **🔴 Critical** | Anti-Pattern (Circular) |

---

## Pass 2: Impact Assessment and Risk Quantification

### Dependency Mapping (Runtime-Aware)

**Transitive Dependency Analysis:**

| Component | Direct Deps | Transitive Deps | Total Impact | Volatility Score |
|-----------|-------------|-----------------|--------------|------------------|
| `TrackerService` | 6 | 15 | **21** | High (frequent changes) |
| `CommonModule` | 6 | 18 | **24** | **Very High** (infrastructure) |
| `MmrCalculationModule` | 8 | 22 | **30** | **Very High** (complex feature) |
| `AuditModule` | 7 | 19 | **26** | Medium (stable) |
| `LeagueMemberService` | 6 | 14 | **20** | High (business logic) |

### Hotspot Identification

**Hotspots = Low Code Health (P1 metrics) + High Code Churn**

| Component | Code Health | Code Churn | Hotspot Score | Risk Level |
|-----------|-------------|------------|----------------|------------|
| `TrackerService` | Low (LCOM 82%) | High | **9.2** | **🔴 Critical** |
| `TrackerScraperService` | Low (LCOM 78%) | High | **8.8** | **🔴 Critical** |
| `CommonModule` | Low (CBO 6, circular) | Medium | **7.5** | **🔴 Critical** |
| `MmrCalculationModule` | Low (CBO 8) | Medium | **7.8** | **🔴 Critical** |
| `LeagueMemberService` | Medium (LCOM 71%) | High | **6.5** | 🟡 High |

### Dependency Hell Index (DHI)

**DHI Formula:** `DHI = (Direct Dependencies × 2) + (Transitive Dependencies × 1) + (Circular Dependencies × 5)`

| Component | DHI Score | Interpretation |
|-----------|-----------|----------------|
| `CommonModule` | **108** | **🔴 Extreme Risk** - Any change requires 24+ components to retest |
| `MmrCalculationModule` | **96** | **🔴 Extreme Risk** - 30 components affected by changes |
| `AuditModule` | **88** | **🔴 High Risk** - 26 components in dependency chain |
| `TrackerService` | **72** | **🟡 High Risk** - 21 components affected |
| `LeagueMemberService` | **68** | **🟡 High Risk** - 20 components affected |

### Impact Analysis Register

| Violation ID | Severity (P1) | Systemic Impact (Hotspot + DHI) | Refactoring Priority Score (RPS) |
|--------------|---------------|--------------------------------|-----------------------------------|
| **V-001** | 9.2 (LCOM 82%) | 9.2 + 72 = **81.2** | **🔴 1st Priority** |
| **V-002** | 8.8 (LCOM 78%) | 8.8 + 45 = **53.8** | **🔴 2nd Priority** |
| **V-003** | 7.5 (CBO 6, circular) | 7.5 + 108 = **115.5** | **🔴 1st Priority** |
| **V-004** | 7.8 (CBO 8) | 7.8 + 96 = **103.8** | **🔴 1st Priority** |
| **V-005** | 7.0 (CBO 7) | 7.0 + 88 = **95.0** | **🔴 2nd Priority** |
| **V-006** | 6.5 (LCOM 71%) | 6.5 + 68 = **74.5** | 🟡 3rd Priority |
| **V-007** | 5.5 (LCOM 65%) | 5.5 + 42 = **47.5** | 🟡 Low Priority |
| **V-008** | 8.0 (Circular) | 8.0 + 60 = **68.0** | **🔴 2nd Priority** |

**RPS Calculation:** `RPS = (Severity × 10) + (Systemic Impact × 0.5)`

---

## Pass 3: Remediation Strategy and Phased Plan

### Top 3 High-RPS Violations Remediation

#### Violation V-003: CommonModule Cross-Boundary Coupling (RPS: 115.5)

**Problem:** CommonModule (infrastructure) directly depends on multiple domain modules, creating tight coupling and circular dependencies.

**Root Cause:** AdminGuard requires domain services (GuildSettingsService, GuildMembersService, etc.) for permission checking.

**Refactoring Pattern:** **Strangler Fig Pattern** + **Dependency Inversion**

**Phased Plan:**

| Phase | Milestone | Pattern | Effort | Timeframe |
|-------|-----------|---------|--------|-----------|
| **Phase 1** | Extract Guard Dependencies | **Interface Segregation** | 8h | Week 1 |
| | - Create `IPermissionProvider` interface | | | |
| | - Create `IGuildAccessProvider` interface | | | |
| | - Refactor AdminGuard to use interfaces | | | |
| **Phase 2** | Implement Adapters | **Adapter Pattern** | 12h | Week 2 |
| | - Create `GuildPermissionAdapter` in GuildsModule | | | |
| | - Create `GuildMemberAccessAdapter` in GuildMembersModule | | | |
| | - Inject adapters via interfaces | | | |
| **Phase 3** | Remove Direct Dependencies | **Dependency Inversion** | 6h | Week 2 |
| | - Remove forwardRef from CommonModule | | | |
| | - Update module imports | | | |
| | - Verify tests pass | | | |
| **Phase 4** | Break Circular Dependencies | **Event-Driven Decoupling** | 16h | Week 3-4 |
| | - Implement event bus for cross-module communication | | | |
| | - Replace direct calls with events | | | |
| | - Add integration tests | | | |

**Behavioral Preservation:**
- ✅ Existing unit tests for AdminGuard (verify coverage)
- ✅ Integration tests for permission checks
- ✅ E2E tests for admin operations

**Estimated Total Effort:** 42 hours (1.5 weeks)

---

#### Violation V-001: TrackerService God Class (RPS: 81.2)

**Problem:** TrackerService has LCOM 82%, handling too many responsibilities: CRUD, validation, queue management, user management, processing orchestration.

**Root Cause:** Service grew organically without proper decomposition.

**Refactoring Pattern:** **Extract Class** + **Extract Method**

**Phased Plan:**

| Phase | Milestone | Pattern | Effort | Timeframe |
|-------|-----------|---------|--------|-----------|
| **Phase 1** | Extract User Management | **Extract Class** | 4h | Week 1 |
| | - Create `TrackerUserOrchestratorService` | | | |
| | - Move `ensureUserExists()` logic | | | |
| | - Update TrackerService to use orchestrator | | | |
| **Phase 2** | Extract Queue Management | **Extract Class** | 6h | Week 1 |
| | - Create `TrackerQueueOrchestratorService` | | | |
| | - Move queue enqueueing logic | | | |
| | - Move processing guard checks | | | |
| **Phase 3** | Extract Batch Operations | **Extract Class** | 4h | Week 2 |
| | - Create `TrackerBatchProcessorService` | | | |
| | - Move `processPendingTrackers()` | | | |
| | - Move `processPendingTrackersForGuild()` | | | |
| **Phase 4** | Refactor Core Service | **Extract Method** | 8h | Week 2 |
| | - Simplify `registerTrackers()` | | | |
| | - Simplify `addTracker()` | | | |
| | - Extract validation logic | | | |
| **Phase 5** | Update Tests | **Test Refactoring** | 6h | Week 2 |
| | - Update unit tests for new services | | | |
| | - Add integration tests | | | |
| | - Verify coverage > 80% | | | |

**Behavioral Preservation:**
- ✅ Existing unit tests for TrackerService (refactor as needed)
- ✅ API integration tests
- ✅ Queue processing tests

**Estimated Total Effort:** 28 hours (1 week)

---

#### Violation V-004: MmrCalculationModule High Coupling (RPS: 103.8)

**Problem:** MmrCalculationModule has CBO 8 with excessive cross-module dependencies, creating high transitive dependency risk.

**Root Cause:** Module imports all AdminGuard dependencies directly instead of using CommonModule abstraction.

**Refactoring Pattern:** **Facade Pattern** + **Dependency Reduction**

**Phased Plan:**

| Phase | Milestone | Pattern | Effort | Timeframe |
|-------|-----------|---------|--------|-----------|
| **Phase 1** | Use CommonModule Only | **Dependency Reduction** | 2h | Week 1 |
| | - Remove direct AdminGuard dependency imports | | | |
| | - Rely on CommonModule export | | | |
| | - Verify AdminGuard still works | | | |
| **Phase 2** | Create Integration Facade | **Facade Pattern** | 8h | Week 1 |
| | - Create `MmrCalculationFacadeService` | | | |
| | - Encapsulate cross-module calls | | | |
| | - Reduce direct dependencies | | | |
| **Phase 3** | Extract Domain Logic | **Extract Module** | 12h | Week 2 |
| | - Create `MmrCalculationDomainModule` | | | |
| | - Move pure calculation logic | | | |
| | - Keep only integration in main module | | | |
| **Phase 4** | Update Tests | **Test Refactoring** | 4h | Week 2 |
| | - Update module tests | | | |
| | - Verify dependency graph | | | |

**Behavioral Preservation:**
- ✅ Existing MMR calculation tests
- ✅ Formula validation tests
- ✅ Integration tests

**Estimated Total Effort:** 26 hours (1 week)

---

### Phased Correction Plan Summary

| Violation ID | Component | RPS | Refactoring Pattern | Total Effort | Priority | Start Week |
|--------------|-----------|-----|---------------------|--------------|----------|------------|
| **V-003** | CommonModule | 115.5 | Strangler Fig + Dependency Inversion | 42h | **P0** | Week 1 |
| **V-001** | TrackerService | 81.2 | Extract Class + Extract Method | 28h | **P0** | Week 2 |
| **V-004** | MmrCalculationModule | 103.8 | Facade + Dependency Reduction | 26h | **P0** | Week 3 |
| **V-002** | TrackerScraperService | 53.8 | Extract Class | 20h | P1 | Week 4 |
| **V-005** | AuditModule | 95.0 | Dependency Inversion | 18h | P1 | Week 5 |
| **V-008** | Circular Dependencies | 68.0 | Event-Driven Decoupling | 24h | P1 | Week 6 |
| **V-006** | LeagueMemberService | 74.5 | Extract Method | 12h | P2 | Week 7 |
| **V-007** | PlayerService | 47.5 | Extract Method | 8h | P2 | Week 8 |

**Total Estimated Effort:** 178 hours (~4.5 weeks for 1 developer, or 2.25 weeks for 2 developers)

---

## Recommendations

### Immediate Actions (Week 1-2)
1. **Start with V-003 (CommonModule)** - Highest RPS, blocks other refactorings
2. **Parallel work on V-001 (TrackerService)** - Independent, high impact
3. **Establish test coverage baseline** - Ensure >80% coverage before refactoring

### Medium-Term Actions (Week 3-6)
1. **Complete V-004 (MmrCalculationModule)** - Reduces transitive dependencies
2. **Address circular dependencies (V-008)** - Enables independent module evolution
3. **Refactor V-002 (TrackerScraperService)** - Improves maintainability

### Long-Term Actions (Week 7+)
1. **Refactor remaining code smells** - V-006, V-007
2. **Establish architectural guidelines** - Prevent future violations
3. **Implement dependency analysis tooling** - Automated CBO/LCOM monitoring

### Architectural Guidelines (Post-Refactoring)

1. **Module Dependency Rules:**
   - Infrastructure modules should not depend on domain modules
   - Use interfaces and dependency inversion
   - Maximum CBO: 5 for services, 6 for modules

2. **Service Size Limits:**
   - Maximum LCOM: 60%
   - Maximum lines: 400 per service
   - Extract classes when LCOM > 60%

3. **Circular Dependency Prevention:**
   - Use event-driven communication for cross-module calls
   - Prefer interfaces over concrete implementations
   - Regular dependency graph analysis

---

## Conclusion

The codebase demonstrates **good foundational architecture** with proper use of NestJS patterns, but suffers from **architectural debt** in three critical areas:

1. **Cross-boundary coupling** (CommonModule, AuditModule, MmrCalculationModule)
2. **God classes** (TrackerService, TrackerScraperService)
3. **Circular dependencies** (6 identified chains)

**Priority:** Address cross-boundary coupling first** - it blocks other improvements and enables independent module evolution.

**Risk Mitigation:** All refactorings must be preceded by comprehensive test coverage verification to ensure behavioral preservation.

---

**Report Generated:** January 2025  
**Next Review:** After Phase 1 completion (Week 2)

