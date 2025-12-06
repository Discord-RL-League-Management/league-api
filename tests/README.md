# Test Suite Documentation

This test suite follows **ISO/IEC/IEEE 29119** standards and implements the **Test Automation Pyramid** structure.

## Test Architecture

### Test Automation Pyramid

```
        /\
       /  \  E2E Tests (10%) - Playwright, BDD
      /____\
     /      \  API Tests (20%) - Axios, Contract Verification
    /________\
   /          \  Unit Tests (70%) - Vitest, TDD
  /____________\
```

## Test Levels

### 1. Unit Tests (`tests/unit/`)

**Tool:** Vitest  
**Methodology:** Test-Driven Development (TDD)  
**Focus:** Code correctness, individual function logic, speed

**Standards:**
- Focus on functional core, not imperative shell
- Descriptive naming: `should_calculate_mmr_for_high_rated_player()`
- State verification over behavior verification
- Mock external dependencies
- Fast execution (< 100ms per test)

**Example:**
```typescript
it('should_calculate_weighted_average_mmr_with_valid_data', () => {
  // ARRANGE
  const trackerData = { ones: 1200, twos: 1400 };
  const config = { algorithm: 'WEIGHTED_AVERAGE', weights: {...} };
  
  // ACT
  const result = service.calculateMmr(trackerData, config);
  
  // ASSERT
  expect(result).toBe(1460);
});
```

### 2. API/Integration Tests (`tests/api/`)

**Tool:** Axios  
**Methodology:** Contract Verification  
**Focus:** Business logic, data flow, service integration (without UI overhead)

**Standards:**
- Verify API contracts (request/response)
- Stateless and parallel-executable
- Use synthetic data factories
- Test business logic integration
- No UI overhead

**Example:**
```typescript
it('should_create_user_with_valid_data_and_return_201_status', async () => {
  // ARRANGE
  const userData = createUserData();
  
  // ACT
  const response = await apiClient.post('/internal/users', userData);
  
  // ASSERT
  expect(response.status).toBe(201);
  expect(response.data).toHaveProperty('id');
});
```

### 3. E2E Tests (`tests/e2e/`)

**Tool:** Playwright  
**Methodology:** Behavior-Driven Development (BDD)  
**Focus:** Critical user journeys, high-risk features

**Standards:**
- Given-When-Then structure
- Focus on user behavior and business value
- Use `data-testid` attributes for locators
- Flexible wait conditions (no hard-coded sleeps)
- Critical user journeys only

**Example:**
```typescript
test('should_complete_discord_oauth_flow_successfully', async ({ page }) => {
  // GIVEN: User is on the home page
  await page.goto('/');
  
  // WHEN: User clicks on "Login with Discord"
  await page.getByTestId('login-discord-button').click();
  
  // THEN: User should be redirected to Discord OAuth
  await expect(page).toHaveURL(/discord.com\/oauth/);
});
```

## Test Data Management

### Synthetic Data Factories

All tests use synthetic data factories located in `tests/factories/`:

- `user.factory.ts` - User data factory
- `guild.factory.ts` - Guild data factory
- `tracker.factory.ts` - Tracker data factory

**Principle:** Never use production data. All test data is generated synthetically.

## Test Execution

### Running Tests

```bash
# Unit tests
npm run test:unit              # Run once
npm run test:unit:watch        # Watch mode
npm run test:unit:coverage     # With coverage

# API tests
npm run test:api               # Run once
npm run test:api:watch         # Watch mode

# E2E tests
npm run test:e2e               # Run all E2E tests
npm run test:e2e:ui            # Playwright UI mode

# All tests
npm run test:all               # Run all test suites
npm run test:ci                # CI/CD optimized
```

## Test Isolation and CI/CD Readiness

### Statelessness

All tests are **completely independent and stateless**. They:
- Do not rely on shared mutable resources
- Do not depend on specific database records from previous tests
- Contain their own predictable setup and teardown logic

### Parallel Execution

All tests support **parallel execution** in CI/CD:
- Each test is self-contained
- No shared state between tests
- Independent setup/teardown per test

## Configuration Files

- `vitest.config.mts` - Vitest configuration for unit and API tests
- `playwright.config.ts` - Playwright configuration for E2E tests
- `tests/setup/unit-setup.ts` - Unit test setup
- `tests/setup/api-setup.ts` - API test setup
- `tests/setup/e2e-setup.ts` - E2E test setup

## Best Practices

1. **State Verification:** Verify the final state, not internal interactions
2. **Descriptive Names:** Test names should clearly state the behavior being verified
3. **Arrange-Act-Assert:** Follow AAA pattern in unit tests
4. **Given-When-Then:** Follow GWT pattern in E2E tests
5. **Synthetic Data:** Always use factories, never production data
6. **Fast Execution:** Unit tests should complete in < 100ms
7. **Isolation:** Each test must be independent and stateless

## References

- ISO/IEC/IEEE 29119 Software Testing Standards
- Test Automation Pyramid (Mike Cohn)
- Shift-Left Testing Methodology
- Risk-Based Testing (RBT)

