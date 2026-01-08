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

### 1. Unit Tests (`src/**/*.spec.ts`)

**Location:** Colocated with source files in `src/` directory  
**NestJS Convention:** Following NestJS best practices, unit test files are placed alongside their corresponding source files using the `.spec.ts` naming convention (e.g., `auth.service.ts` → `auth.service.spec.ts`)

**Tool:** Vitest  
**Methodology:** Test-Driven Development (TDD)  
**Focus:** Code correctness, individual function logic, speed

**NestJS Best Practices:**
- ✅ **Colocation:** Test files live next to source files in `src/` directory
- ✅ **Naming:** Use `.spec.ts` suffix (NestJS standard)
- ✅ **Structure:** Mirror source directory structure
- ✅ **Isolation:** Each test is independent with mocked dependencies

**Standards:**
- Focus on functional core, not imperative shell
- Descriptive naming: `should_calculate_mmr_for_high_rated_player()`
- State verification over behavior verification
- Mock external dependencies
- Fast execution (< 100ms per test)

**Example Structure:**
```
src/
  auth/
    services/
      discord-oauth.service.ts          # Source file
      discord-oauth.service.spec.ts      # Unit test (colocated)
    auth.controller.ts
    auth.controller.spec.ts              # Unit test (colocated)
```

**Example Test:**
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
- Focus on complete API workflows across multiple endpoints
- Test integration between services
- Critical business processes end-to-end
- Use Playwright's `request` API (not `page` API)

**Example:**
```typescript
test('should_complete_oauth_workflow_and_access_protected_resources', async ({ request }) => {
  // GIVEN: User initiates OAuth flow
  const oauthResponse = await request.get('/auth/discord', { maxRedirects: 0 });
  expect(oauthResponse.status()).toBe(302);
  
  // WHEN: OAuth callback completes
  const callbackResponse = await request.get('/auth/discord/callback?code=mock_code', {
    maxRedirects: 0
  });
  const token = extractTokenFromResponse(callbackResponse);
  
  // THEN: User can access protected resources
  const profileResponse = await request.get('/api/profile', {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(profileResponse.status()).toBe(200);
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

## Required Environment Variables

All test suites require specific environment variables to be set. The test setup files validate these variables and will throw clear error messages if they are missing.

### Required Variables

- **`JWT_PRIVATE_KEY`** - RSA private key in PEM format for JWT token generation in tests
  - **Required for:** All test suites (unit, API, E2E)
  - **Format:** PEM format with BEGIN/END markers
  - **Generation:** `openssl genrsa -out jwt-private.pem 2048`
  - **Note:** This should be a test-specific key, different from production keys

### Setting Environment Variables

**Local Development:**
```bash
# Export in your shell
export JWT_PRIVATE_KEY="$(cat jwt-private.pem)"

# Or use a .env file (if supported by your test runner)
```

**CI/CD:**
Ensure `JWT_PRIVATE_KEY` is set in your CI/CD environment variables/secrets.

### Error Messages

If a required environment variable is missing, tests will fail early with a clear error message:
```
Error: JWT_PRIVATE_KEY environment variable is required for tests.
Set JWT_PRIVATE_KEY in your test environment.
Generate test keys using: openssl genrsa -out jwt-private.pem 2048
```

**Security Note:** Test secrets must come from explicit environment configuration, not hardcoded fallback values. This ensures test secrets never accidentally leak into production builds.

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

## File Structure

```
src/                          # Source code with colocated unit tests
  auth/
    auth.service.ts
    auth.service.spec.ts      # ✅ Unit test (NestJS convention)
    services/
      discord-oauth.service.ts
      discord-oauth.service.spec.ts  # ✅ Unit test (NestJS convention)

tests/                        # Integration and E2E tests
  api/                        # API/Integration tests
    *.test.ts
  e2e/                        # End-to-end tests
    *.spec.ts
  integration/                # Integration test utilities
    adapters/
  factories/                  # Test data factories
  setup/                      # Test setup files
    unit-setup.ts
    api-setup.ts
    e2e-setup.ts
  utils/                      # Test utility helpers
    db-helpers.ts
    test-helpers.ts
```

## Configuration Files

- `vitest.config.mts` - Vitest configuration for unit tests (`src/**/*.spec.ts`)
- `vitest.api.config.mts` - Vitest configuration for API tests (`tests/api/**/*.test.ts`)
- `playwright.config.ts` - Playwright configuration for E2E tests
- `tests/setup/unit-setup.ts` - Unit test setup (used by `src/**/*.spec.ts`)
- `tests/setup/api-setup.ts` - API test setup
- `tests/setup/e2e-setup.ts` - E2E test setup

## Best Practices

### NestJS Conventions (Unit Tests)

1. **Colocation:** Place `.spec.ts` files next to source files in `src/` directory
2. **Naming:** Use `.spec.ts` suffix (not `.test.ts`) for unit tests
3. **Structure:** Mirror the source directory structure exactly
4. **Import Paths:** Use relative imports within the same module

### General Testing Practices

1. **State Verification:** Verify the final state, not internal interactions
2. **Descriptive Names:** Test names should clearly state the behavior being verified
3. **Arrange-Act-Assert:** Follow AAA pattern in unit tests
4. **Given-When-Then:** Follow GWT pattern in E2E tests
5. **Synthetic Data:** Always use factories, never production data
6. **Fast Execution:** Unit tests should complete in < 100ms
7. **Isolation:** Each test must be independent and stateless

## References

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing) - Official NestJS testing best practices
- ISO/IEC/IEEE 29119 Software Testing Standards
- Test Automation Pyramid (Mike Cohn)
- Shift-Left Testing Methodology
- Risk-Based Testing (RBT)

