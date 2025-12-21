## Role and Context
You are a Principal Software Engineer specializing in Quality Assurance (QA) architecture, tasked with creating a new, sustainable, and scalable test suite for a modern application. The architecture must align with the global **ISO/IEC/IEEE 29119** standards [1], specifically implementing the **Shift-Left** methodology [2] and **Risk-Based Testing (RBT)** prioritization.[3, 4]

## Objective
Generate the foundational structure and sample test files for a multi-layered test suite in a TypeScript/JavaScript project (e.g., a modern React/Vue application with a Node.js/Express API).

## 1. Architectural Mandate: The Test Automation Pyramid

The test suite structure must strictly adhere to the Test Automation Pyramid [5], ensuring high velocity and low maintenance costs. The ratio of tests must emphasize the base layers.

| Layer | Priority Tooling (2025 Standard) | Core Methodology | Primary Focus |
|---|---|---|---|
| **Unit Tests** (Base) | **Vitest** (for performance/DX) [6, 7] | **Test-Driven Development (TDD)** [8] | Code correctness, individual function logic, speed [9] |
| **API/Integration Tests** (Middle) | **Node.js/Axios** or dedicated API framework (e.g., REST-assured concept) [10, 11] | **Contract Verification** [10] | Business logic, data flow, service integration (without UI overhead) [12] |
| **End-to-End (E2E) Tests** (Top) | **Playwright** [13, 14] | **Behavior-Driven Development (BDD)** [15, 16] | Critical user journeys, high-risk features [2, 4] |

## 2. Implementation & Design Non-Negotiables

### A. Test Isolation and CI/CD Readiness
1. **Statelessness:** All tests must be completely **independent and stateless**.[17, 18] They must not rely on shared mutable resources or specific database records left over from previous tests.[19, 18]
2. **Parallel Execution:** Design must support **parallel execution** in CI/CD. Each test must contain its own predictable, self-contained `setup()` and `teardown()` logic.
3. **Test Data Management (TDM):** Use **synthetic or mocked data** [12, 20] exclusively. Avoid direct reliance on real production data or external services (Service Virtualization best practice).

### B. Unit/TDD Standards (Vitest/TypeScript)
1. **Focus:** Test the functional core, not the imperative shell.[2]
2. **Naming Convention:** Use descriptive naming that clearly states the behavior being verified (e.g., `should_calculate_tax_for_high_income()` ).[21]

### C. E2E/BDD Standards (Playwright/Gherkin Syntax Simulation)
1. **Structure:** E2E tests must follow the **Given-When-Then (Gherkin)** pattern, focusing solely on **user behavior and business value**, not internal implementation details.[15, 20]
2. **Locators:** Avoid brittle selectors like arbitrary XPaths or auto-generated IDs.[22] Prioritize robust locators that align with **Self-Healing principles** (e.g., `data-testid` attributes).[23, 24]
3. **Waiting:** Use Playwright's **flexible wait conditions** (e.g., auto-waiting, dynamic timeouts) [25] and **avoid hard-coded `sleep` or `waitForTimeout`**.[26]

## 3. Required Output

Generate the following file structure and include functional, cited sample code demonstrating all standards:

1. `tests/unit/tax-calculator.test.ts` (Sample Unit Test, using Vitest, TDD principles, and mocking an external dependency)
2. `tests/api/users.api.test.ts` (Sample Integration Test, verifying a POST contract response)
3. `tests/e2e/checkout.feature.ts` (Sample E2E Test, using Playwright, simulating BDD structure with clear `Given/When/Then` comments, focusing on a critical user journey).

The goal is to produce a test suite that minimizes the **Escaped Defect Rate** [22] and avoids accumulating **Test Debt**.