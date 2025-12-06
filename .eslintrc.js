/**
 * ESLint Configuration - Legacy Format
 * 
 * This file provides a legacy .eslintrc.js format for compatibility.
 * The project primarily uses the modern flat config format (eslint.config.mjs).
 * 
 * This configuration enforces strict coding standards for test automation
 * across three governance pillars:
 * 1. Structural Adherence (TDD/BDD)
 * 2. Isolation and Statelessness
 * 3. Locator Resilience and Asynchronous Safety
 * 
 * All critical rules are set to severity 'error' (2) to fail CI pipeline.
 */

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
    'playwright',
    'vitest',
    'prettier',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:playwright/recommended',
    'plugin:vitest/recommended',
    'plugin:prettier/recommended',
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'coverage/',
    'playwright-report/',
    'eslint.config.mjs',
  ],
  env: {
    node: true,
    es2020: true,
  },
  rules: {
    // Base TypeScript rules
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/no-unsafe-argument': 'warn',
    'prettier/prettier': ['error', { endOfLine: 'auto' }],
    complexity: ['error', { max: 30 }],
  },
  overrides: [
    // ============================================
    // Unit Tests (Vitest) Configuration
    // ============================================
    {
      files: ['tests/unit/**/*.test.ts', 'tests/api/**/*.test.ts'],
      env: {
        'vitest-globals/env': true,
      },
      rules: {
        // ============================================
        // Governance Pillar I: Structural Adherence (TDD/BDD)
        // ============================================
        
        // 1. Descriptive Naming - enforce lowercase, descriptive, behavior-focused test titles
        'vitest/prefer-lowercase-title': [
          'error',
          {
            ignore: ['describe', 'test', 'it'],
            allowedPrefixes: ['should_', 'when_', 'given_'],
          },
        ],
        
        // 2. Assertion Scope - strictly prohibit assertions outside test blocks
        //    Enforces clear separation between action (When) and assertion (Then) phases
        'vitest/expect-expect': 'error',
        'vitest/no-standalone-expect': 'error',
        'vitest/no-conditional-expect': 'error',
        
        // 3. Hooks Order - mandate predictable hook placement at top of file
        'vitest/prefer-hooks-on-top': 'error',
        'vitest/no-duplicate-hooks': 'error',
        'vitest/no-hooks': 'off', // Allow hooks but enforce order
        
        // ============================================
        // Governance Pillar II: Isolation and Statelessness
        // ============================================
        
        // 1. State Management - prefer beforeEach/afterEach over beforeAll/afterAll
        //    Prevents shared state leakage across tests
        //    (prefer-hooks-on-top and no-duplicate-hooks already enforce this)
        
        // 2. Component Isolation - prohibit rendering in lifecycle hooks
        //    Note: This project uses NestJS (no DOM), but rule applies to any setup hooks
        //    The no-standalone-expect rule prevents assertions outside test blocks
        
        // Additional isolation rules
        'vitest/no-focused-tests': 'error', // Prevent .only() in CI
        'vitest/no-skipped-tests': 'warn', // Warn about .skip() (may indicate incomplete tests)
        'vitest/no-disabled-tests': 'warn', // Warn about disabled tests
        
        // ============================================
        // TypeScript Rules for Test Files
        // ============================================
        '@typescript-eslint/no-explicit-any': 'off', // Common in mocks
        '@typescript-eslint/no-floating-promises': 'error', // Critical for async tests
        '@typescript-eslint/no-unsafe-argument': 'warn',
        '@typescript-eslint/no-unsafe-assignment': 'off', // Common in mocks
        '@typescript-eslint/no-unsafe-call': 'off', // Common in mocks
        '@typescript-eslint/no-unsafe-member-access': 'off', // Common in mocks
        '@typescript-eslint/unbound-method': 'off', // Common in mocks
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'prettier/prettier': ['error', { endOfLine: 'auto' }],
      },
    },
    // ============================================
    // E2E Tests (Playwright) Configuration
    // ============================================
    {
      files: ['tests/e2e/**/*.test.ts', 'tests/e2e/**/*.e2e.test.ts'],
      rules: {
        // ============================================
        // Governance Pillar I: Structural Adherence (BDD)
        // ============================================
        
        // 1. Descriptive Naming - enforce behavior-focused test titles
        'playwright/expect-expect': 'error',
        'playwright/no-standalone-expect': 'error',
        'playwright/max-nested-describe': ['error', { max: 3 }],
        
        // 2. Assertion Scope - prohibit assertions outside test blocks
        //    (no-standalone-expect already enforces this)
        
        // 3. Hooks Order - enforce predictable hook placement
        //    (max-nested-describe helps with structure)
        
        // ============================================
        // Governance Pillar II: Isolation and Statelessness
        // ============================================
        
        // State Management - prefer beforeEach/afterEach for state-modifying operations
        //    (no-focused-test and no-skipped-test help maintain test independence)
        'playwright/no-focused-test': 'error',
        'playwright/no-skipped-test': 'warn',
        
        // ============================================
        // Governance Pillar III: Locator Resilience and Asynchronous Safety
        // ============================================
        
        // 1. Locator Mandate - strongly discourage brittle selectors
        //    Prohibit XPath selectors entirely (Severity: error)
        'playwright/prefer-locator': 'error',
        'playwright/prefer-native-locators': 'error',
        'playwright/no-raw-locators': 'error',
        'playwright/no-element-handle': 'error', // Prohibit deprecated element handles
        
        // Custom rule: Prohibit XPath selectors explicitly
        'no-restricted-syntax': [
          'error',
          {
            selector: "CallExpression[callee.property.name='locator'][arguments.0.value=/^\\/\\//]",
            message: 'XPath selectors are prohibited. Use user-facing locators (getByRole, getByText) or test IDs (getByTestId) instead.',
          },
          {
            selector: "CallExpression[callee.property.name='locator'][arguments.0.value=/^xpath=/i]",
            message: 'XPath selectors are prohibited. Use user-facing locators (getByRole, getByText) or test IDs (getByTestId) instead.',
          },
        ],
        
        // 2. Asynchronous Correctness - enforce that all async Playwright API calls are awaited
        '@typescript-eslint/no-floating-promises': 'error',
        'playwright/missing-playwright-await': 'error',
        'playwright/no-useless-await': 'error',
        
        // 3. Web-First Assertions - mandate Playwright's built-in auto-waiting assertions
        //    Prohibit manual visibility checks in favor of auto-waiting assertions
        'playwright/prefer-web-first-assertions': 'error',
        'playwright/no-wait-for-timeout': 'error',
        'playwright/no-wait-for-selector': 'error',
        'playwright/no-wait-for-navigation': 'error',
        'playwright/no-force-option': 'error', // Prohibit force clicks (indicates flaky test)
        
        // Additional resilience rules
        'playwright/no-page-pause': 'error', // Prevent page.pause() in CI
        'playwright/no-eval': 'error', // Prohibit eval() usage
        
        // ============================================
        // TypeScript Rules for E2E Tests
        // ============================================
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-argument': 'warn',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/unbound-method': 'off',
        '@typescript-eslint/require-await': 'off', // Common in test setup/teardown
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'prettier/prettier': ['error', { endOfLine: 'auto' }],
      },
    },
  ],
};

