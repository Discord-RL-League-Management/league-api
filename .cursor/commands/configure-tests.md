## Role and Context
You are a Quality Assurance (QA) Architect tasked with configuring a static code analysis (SCA) system to enforce strict coding standards for test automation across a TypeScript monorepo utilizing Playwright (E2E) and Vitest (Unit). This configuration serves as the **CI/CD Quality Gate** [1, 2], ensuring adherence to the three pillars of test code quality: **Structure, Isolation, and Resilience**. The goal is to minimize **Test Debt** [3, 4] and reduce test flakiness.[5]

## Objective
Generate the configuration files required to implement a two-tiered quality governance system:
1.  **Local Gate:** Pre-commit checks using Husky and `lint-staged`.
2.  **Global Gate:** ESLint rules that will fail the CI pipeline on critical violations (Severity: 2/`error`).[6]

## 1. Governance Pillar I: Structural Adherence (TDD/BDD)

Configure ESLint plugins (`eslint-plugin-vitest`, `eslint-plugin-jest` equivalents) to enforce clear, maintainable test structure:

1.  **Descriptive Naming:** Enforce consistent, descriptive, and non-generic test titles that focus on **behavior**.[7] (Use `prefer-lowercase-title` [8]).
2.  **Assertion Scope:** Strictly prohibit assertions (`expect()`) outside of the main `it`/`test` blocks [8, 9] to enforce the clear separation between the action (When) and assertion (Then) phases.[10]
3.  **Hooks Order:** Mandate that setup and teardown hooks (`beforeEach`, `afterEach`, etc.) are placed predictably at the top of the test file.[8]

## 2. Governance Pillar II: Isolation and Statelessness

Configure rules to guarantee that tests are **independent and atomic** [11, 12], preventing state leakage and flakiness.

1.  **State Management:** Prohibit the use of hooks that introduce shared state across tests. Prioritize `beforeEach` / `afterEach` over `beforeAll` / `afterAll` for any state-modifying operations.[5, 12] (Use `no-duplicate-hooks` [8]).
2.  **Component Isolation:** For component/unit testing (Vitest + Testing Library), strictly disallow component rendering within setup hooks (`beforeEach`, `beforeAll`) [13] to ensure each test runs against a clean DOM/component instance. (Use `eslint-plugin-testing-library/no-render-in-lifecycle` [13]).

## 3. Governance Pillar III: Locator Resilience and Asynchronous Safety (Playwright)

Configure `eslint-plugin-playwright` and `@typescript-eslint` rules to enforce modern, resilient locator strategies:

1.  **Locator Mandate:** Strongly discourage brittle selectors.[12] Prohibit the use of XPath selectors entirely (Severity: `error`).[14] Encourage the use of **user-facing locators** (e.g., `getByRole`, `getByText`) or **explicit test IDs** (`getByTestId`).[12, 15]
2.  **Asynchronous Correctness:** Enforce that all asynchronous Playwright API calls and assertions are correctly awaited.[12] (Use `@typescript-eslint/no-floating-promises` [12]).
3.  **Web-First Assertions:** Mandate the use of Playwright's built-in auto-waiting assertions (e.g., `await expect().toBeVisible()`) over manual visibility checks (e.g., `expect(await locator.isVisible())`).[12]

## 4. Required Output

Generate the following two files containing the necessary configurations, setting all critical rules to severity `error` (2):

1.  `package.json` (Containing `husky` and `lint-staged` configuration to run ESLint on all staged TypeScript/JavaScript files during pre-commit).[16, 17]
2.  `.eslintrc.js` (The core configuration file, extending recommended settings and enabling the specific governance rules detailed above).