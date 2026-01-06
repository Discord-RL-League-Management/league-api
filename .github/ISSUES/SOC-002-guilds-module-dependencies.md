---
title: Reduce GuildsModule Dependencies (SOC)
labels: refactoring, architecture, high-priority
assignees: 
milestone: 
---

## Issue: Reduce GuildsModule Dependencies

**Priority**: P2 (High)  
**Estimated Effort**: 6 hours  
**Epic**: Separation of Concerns Improvements

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
- `docs/SOC_ISSUES.md` - Issue tracking





