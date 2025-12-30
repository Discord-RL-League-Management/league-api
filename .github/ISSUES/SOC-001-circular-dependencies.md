---
title: Break Circular Dependencies (SOC)
labels: refactoring, architecture, high-priority
assignees: 
milestone: 
---

## Issue: Break Circular Dependencies

**Priority**: P2 (High)  
**RPS**: 7.5/10  
**Estimated Effort**: 10 hours  
**Epic**: Separation of Concerns Improvements

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
- `docs/SOC_ISSUES.md` - Issue tracking


