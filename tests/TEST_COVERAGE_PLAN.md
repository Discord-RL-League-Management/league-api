# Test Coverage Restoration Plan

## Current State
- **Deleted:** 57 unit test files + 13 E2E test files
- **Created:** 1 sample unit test (7 tests) + 1 sample API test + 1 sample E2E test
- **Coverage Gap:** ~70 test files need to be recreated following new standards

## Test Automation Pyramid Target
- **70% Unit Tests** (~50 test files)
- **20% API Tests** (~14 test files)  
- **10% E2E Tests** (~6 test files)

## Priority Matrix

### Phase 1: Critical Services (P0) - Week 1
**High business impact, complex logic, high RPS scores**

1. **GuildsService** (RPS: 8.48) - `tests/unit/services/guilds.service.test.ts`
   - 9 public methods
   - Transaction logic testing
   - Error handling (5 error types)
   - Target: 15-20 tests

2. **LeagueMemberService** (RPS: 8.44) - `tests/unit/services/league-member.service.test.ts`
   - 10 public methods
   - Join/leave league flows
   - Rating initialization
   - Target: 20-25 tests

3. **TrackerService** (RPS: 7.50) - `tests/unit/services/tracker.service.test.ts`
   - Tracker registration
   - URL validation
   - Batch operations
   - Target: 15-20 tests

4. **MmrCalculationService** ✅ (Already created - 7 tests)
   - Needs expansion: Add more algorithm tests
   - Target: Expand to 15-20 tests

### Phase 2: High Priority Services (P1) - Week 2
**Important business logic, moderate complexity**

5. **GuildSettingsService** (RPS: 6.84)
6. **OrganizationService** (RPS: 6.88)
7. **PlayerService** (RPS: 6.20)
8. **AuthService** - Authentication flows
9. **UserOrchestratorService** - User management
10. **GuildSyncService** - Guild synchronization

### Phase 3: Controllers & API Tests (P1) - Week 3
**API contract verification**

11. **AuthController** - `tests/api/auth.api.test.ts`
12. **UsersController** ✅ (Sample created - needs expansion)
13. **GuildsController** - `tests/api/guilds.api.test.ts`
14. **LeaguesController** - `tests/api/leagues.api.test.ts`
15. **TrackersController** - `tests/api/trackers.api.test.ts`
16. **MatchesController** - `tests/api/matches.api.test.ts`
17. **Internal Controllers** (Bot API) - `tests/api/internal.api.test.ts`

### Phase 4: Supporting Services (P2) - Week 4
**Utility and supporting services**

18. **Validation Services** (Player, Organization, Tracker)
19. **Repository Services** (All repositories)
20. **Permission Services**
21. **Settings Services**
22. **Filter & Pipe Tests**

### Phase 5: E2E Tests (P2) - Week 5
**Critical user journeys**

23. **Auth Flow** ✅ (Sample created - needs implementation)
24. **User Registration Flow** - `tests/e2e/user-registration.e2e.test.ts`
25. **League Management Flow** - `tests/e2e/league-management.e2e.test.ts`
26. **Tracker Registration Flow** - `tests/e2e/tracker-registration.e2e.test.ts`
27. **Match Creation Flow** - `tests/e2e/match-creation.e2e.test.ts`

## Test Creation Standards

### Unit Tests (Vitest/TDD)
- **Naming:** `should_<behavior>_when_<condition>`
- **Structure:** Arrange-Act-Assert
- **Verification:** State verification only (no `toHaveBeenCalled`)
- **Mocking:** External dependencies only
- **Target:** 5-10 tests per service method

### API Tests (Axios/Contract)
- **Naming:** `should_<action>_and_return_<status>`
- **Structure:** Contract verification (request/response)
- **Data:** Synthetic factories only
- **Target:** 3-5 tests per endpoint

### E2E Tests (Playwright/BDD)
- **Naming:** `should_<user_journey>`
- **Structure:** Given-When-Then
- **Locators:** `data-testid` or user-facing locators
- **Target:** Critical paths only (10% of total tests)

## Estimated Effort

- **Phase 1 (P0):** 40-60 hours (5 critical services)
- **Phase 2 (P1):** 60-80 hours (10 services)
- **Phase 3 (P1):** 40-60 hours (7 API test suites)
- **Phase 4 (P2):** 40-60 hours (15 supporting services)
- **Phase 5 (P2):** 20-30 hours (5 E2E test suites)

**Total:** 200-290 hours (5-7 weeks full-time)

## Next Steps

1. Start with Phase 1, Priority 0 services
2. Create tests following Black Box principles
3. Focus on state verification, not behavior verification
4. Use synthetic data factories
5. Ensure tests are stateless and parallel-executable




