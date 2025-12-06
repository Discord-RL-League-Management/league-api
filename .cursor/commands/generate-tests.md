# Cursor Custom Command Prompt: Generating Expert-Level, Layered Test Code (2025)

## Role and Context
You are a Principal Software Architect specializing in test suite engineering. Your task is to generate three sample test files that exemplify the gold standard for software quality in a modern TypeScript project. These samples must adhere to the **Test Automation Pyramid** structure [1] and demonstrate full compliance with **Test Isolation** [2, 3] and **BDD/TDD** methodology.[4, 5]

## Objective
Generate functional, cited code samples for Unit, API/Integration, and End-to-End layers that minimize **Defect Leakage** [6] and prevent the accumulation of **Test Debt**.[7]

## 1. Core Architectural & Design Principles

All generated tests must comply with the following non-negotiable standards:

*   **Statelessness and Isolation:** Each test case must be entirely **self-contained and stateless**.[8, 9] All required setup (e.g., database changes, mocking) must be executed in `beforeEach` and cleaned up in `afterEach` to guarantee parallel execution readiness.[10, 3]
*   **Data Strategy:** Rely exclusively on **synthetic or mocked data** [2] and internal mock servers/stubs (Service Virtualization).[11] Do not use shared external resources or live production data.
*   **Naming Contract:** Test titles must be **descriptive** [5], focusing on the **behavior** being verified (declarative), not the implementation steps (imperative).

## 2. Layer-Specific Implementation Requirements

### A. Unit Tests (TDD / Vitest)

1.  **Methodology Focus:** Strictly adhere to the **Test-Driven Development (TDD) principles**.[4] The test must be simple, behavior-focused, and target the **Functional Core** of the code, avoiding the "Imperative Shell" (UI or external IO).[12]
2.  **Dependency Control:** Demonstrate the use of Vitest’s mocking API (`vi.mock` or `vi.spyOn`) to isolate the unit from any external service calls (e.g., database, external API).[13]
3.  **Assertion Clarity:** Use clear, single-purpose assertions to verify a precise outcome, avoiding overly complex tests with multiple, unrelated expectations.[4]

### B. API/Integration Tests (Contract Verification / Node.js)

1.  **Focus:** Verify the core **business logic and data contract** of a service endpoint, independent of the front-end application.[14]
2.  **Contract Validation:** The test must assert that the API response adheres to a defined contract, including:
    *   Correct HTTP Status Code (e.g., `201 Created`).
    *   Expected JSON Schema/Payload Structure.
    *   Correct data transformation/persistence (if applicable, confirmed via a second mocked internal call).
3.  **Isolation:** The test must simulate the creation and deletion of a unique user or record within its `beforeEach`/`afterEach` hooks to ensure full data isolation.[9]

### C. End-to-End Tests (BDD / Playwright)

1.  **Structure:** Simulate the **Behavior-Driven Development (BDD) / Gherkin structure** [5, 15] using comments (`// Given`, `// When`, `// Then`) to delineate the scenario's Context, Action, and Outcome, focusing on a **critical user journey**.[16]
2.  **Locator Resilience:** Demonstrate the prioritization of **resilient locators**.[3, 17] Prefer user-facing attributes (`page.getByRole`, `page.getByText`).[3] When specific attributes are needed, utilize the **`page.getByTestId()`** method.[18]
3.  **Asynchronous Safety (Flakiness Mitigation):** Strictly use **Web-First Assertions** (e.g., `await expect(locator).toBeVisible()`).[3] Avoid manual, synchronous assertions (e.g., `expect(await locator.isVisible()).toBe(true)`) to leverage Playwright’s auto-waiting capabilities and eliminate race conditions.[17]

## 3. Required Output

Generate the following files with commented code demonstrating the above standards:

1.  `tests/unit/payment-gateway.test.ts` (Sample Unit Test for a core function)
2.  `tests/api/transaction.api.test.ts` (Sample Integration Test for a POST endpoint)
3.  `tests/e2e/critical-checkout-flow.e2e.ts` (Sample E2E Test demonstrating a high-risk user path)