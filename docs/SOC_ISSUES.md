# SOC Refactoring - Remaining Issues

This document tracks the remaining Separation of Concerns issues that need to be addressed after the initial refactoring work.

**Current Epic**: Separation of Concerns Improvements
**Branch**: `54-api-endpoints-for-scheduled-processing`

---

## Issue 1: Break Circular Dependencies

**Priority**: P2 (High)  
**RPS**: 7.5/10  
**Estimated Effort**: 10 hours  
**Status**: 🔴 Not Started

### Problem

**Current State**: 5 circular dependencies (Target: < 3) - **67% over target**

**Identified Cycles**:
1. `CommonModule` ↔ `AuditModule`
2. `GuildsModule` ↔ `CommonModule`
3. `LeaguesModule` ↔ `LeagueMembersModule`
4. `MmrCalculationModule` ↔ `GuildsModule`
5. `GuildsModule` ↔ `UserGuildsModule`

### Impact

- Tight coupling between modules
- Difficult to test in isolation
- Makes dependency graph fragile
- Requires `forwardRef()` workarounds
- Architectural fragility, testing difficulties

### Solution Approach

1. **Audit Circular Dependencies** (2 hours)
   - Map all circular dependencies
   - Identify root causes
   - Prioritize which cycles to break first

2. **Break High-Priority Cycles** (6 hours)
   - Start with `CommonModule` ↔ `AuditModule` (already using adapters, review further)
   - Consider event-driven approach for guild/league synchronization
   - Introduce shared interfaces where appropriate
   - Break at least 2 cycles (target: 3 cycles remaining)

3. **Refactor and Test** (2 hours)
   - Update modules after breaking cycles
   - Ensure all tests pass
   - Verify no new cycles introduced

### Target Metrics

- **Before**: 5 circular dependencies
- **Target**: < 3 circular dependencies
- **Success Criteria**: Break at least 2 cycles, reducing from 5 to 3 or fewer

### Related Files

- `src/common/common.module.ts`
- `src/audit/audit.module.ts`
- `src/guilds/guilds.module.ts`
- `src/leagues/leagues.module.ts`
- `src/league-members/league-members.module.ts`
- `src/mmr-calculation/mmr-calculation.module.ts`
- `src/user-guilds/user-guilds.module.ts`

### Reference Documentation

- `docs/SOC_BIGGEST_GAPS.md` - Section 2: Circular Dependencies
- `docs/SOC_COMPREHENSIVE_ANALYSIS.md` - Priority 3: V-004

---

## Issue 2: Reduce GuildsModule Dependencies

**Priority**: P2 (High)  
**Estimated Effort**: 6 hours  
**Status**: 🔴 Not Started

### Problem

**Current State**: 18+ total dependencies (Target: < 10) - **80% over target**

**Issues**:
- Involved in 2 circular dependencies (`CommonModule`, `UserGuildsModule`)
- High coupling makes changes risky
- Mixing domain logic with infrastructure concerns
- Module brittleness due to excessive dependencies

### Impact

- High coupling makes changes risky
- Any change to GuildsModule affects many dependent modules
- Difficult to refactor or extract functionality
- Testing becomes more complex

### Solution Approach

1. **Review Dependencies** (3 hours)
   - Audit all 18+ dependencies
   - Identify what's truly necessary vs. what can be extracted
   - Categorize dependencies (core vs. optional)

2. **Strategic Refactoring** (2 hours)
   - Extract shared interfaces where appropriate
   - Consider introducing event-driven patterns for optional features
   - Split GuildsModule if complexity warrants it

3. **Optimize and Test** (1 hour)
   - Reduce dependencies to < 10
   - Ensure all functionality preserved
   - Verify tests pass

### Target Metrics

- **Before**: 18+ dependencies
- **Target**: < 10 dependencies
- **Success Criteria**: Reduce dependencies by at least 50%, achieving target of < 10

### Related Files

- `src/guilds/guilds.module.ts`
- `src/guilds/guilds.controller.ts`
- `src/guilds/guild-settings.service.ts`
- All services in `src/guilds/services/`

### Reference Documentation

- `docs/SOC_BIGGEST_GAPS.md` - Section 4: GuildsModule Dependencies
- `docs/SOC_COMPREHENSIVE_ANALYSIS.md` - Module Coupling Issues

---

## Completed Work (Reference)

The following SOC issues have been completed:

1. ✅ **TrackerService DHI Reduction** - Extracted `TrackerProcessingService` to reduce DHI from 28.0
2. ✅ **AuthController LCOM Reduction** - Extracted `AuthOrchestrationService` to reduce LCOM from 60%
3. ✅ **GuildsController Code Duplication** - Created `GuildAdminGuard` to reduce LCOM from 50%

See commit `a25c03a` for details.

---

## Progress Summary

| Issue | Status | Effort | Priority |
|-------|--------|--------|----------|
| TrackerService DHI | ✅ Complete | 12h | P1 |
| AuthController LCOM | ✅ Complete | 7h | P2 |
| GuildsController Duplication | ✅ Complete | 4h | P3 |
| **Circular Dependencies** | 🔴 **Pending** | **10h** | **P2** |
| **GuildsModule Dependencies** | 🔴 **Pending** | **6h** | **P2** |

**Total Completed**: 23 hours  
**Total Remaining**: 16 hours  
**Overall Progress**: ~60% complete

---

**Last Updated**: 2025-01-27

