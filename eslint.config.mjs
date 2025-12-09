// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import vitestPlugin from 'eslint-plugin-vitest';
import playwrightPlugin from 'eslint-plugin-playwright';

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      '.eslintrc.js',
      'commitlint.config.js',
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'src/**/*.spec.ts',
      'test/**/*.e2e-spec.ts',
    ],
  },
  // Base configuration for source files
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    files: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.spec.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      // Cyclomatic complexity rule - blocks functions with complexity >= 30
      complexity: ['error', { max: 30 }],
    },
  },
  // Exclude configuration.ts from complexity check - it's a configuration factory with many env vars
  {
    files: ['src/config/configuration.ts'],
    rules: {
      complexity: 'off',
    },
  },
  // Test file configuration - Unit tests (Vitest)
  {
    files: ['tests/unit/**/*.test.ts', 'tests/api/**/*.test.ts'],
    plugins: {
      vitest: vitestPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
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
      // Note: valid-title rule may not be available in all versions
      // prefer-lowercase-title already enforces descriptive naming
      
      // 2. Assertion Scope - strictly prohibit assertions outside test blocks
      //    Enforces clear separation between action (When) and assertion (Then) phases
      'vitest/expect-expect': 'error',
      'vitest/no-standalone-expect': [
        'error',
        {
          // Allow expects in beforeEach/afterEach hooks for fail-fast setup validation
          // This is necessary per TQA Protocol to ensure deterministic test execution
          additionalTestBlockFunctions: ['beforeEach', 'afterEach'],
        },
      ],
      'vitest/no-conditional-expect': 'error', // Prevent conditional assertions
      // Note: no-conditional-in-test may not be available in all versions
      
      // 3. Conditional Test Logic - prohibit conditional logic and early returns in test bodies
      //    This enforces deterministic tests per TQA Protocol Rule: conditional-test-logic
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='it'] > FunctionExpression > BlockStatement > ReturnStatement[argument=null]",
          message: 'Early returns in test bodies violate test determinism. Use expect().toBeDefined() to fail fast if setup fails.',
        },
        {
          selector: "CallExpression[callee.name='it'] > ArrowFunctionExpression > BlockStatement > ReturnStatement[argument=null]",
          message: 'Early returns in test bodies violate test determinism. Use expect().toBeDefined() to fail fast if setup fails.',
        },
        {
          selector: "CallExpression[callee.name='test'] > FunctionExpression > BlockStatement > ReturnStatement[argument=null]",
          message: 'Early returns in test bodies violate test determinism. Use expect().toBeDefined() to fail fast if setup fails.',
        },
        {
          selector: "CallExpression[callee.name='test'] > ArrowFunctionExpression > BlockStatement > ReturnStatement[argument=null]",
          message: 'Early returns in test bodies violate test determinism. Use expect().toBeDefined() to fail fast if setup fails.',
        },
      ],
      
      // 4. Hooks Order - mandate predictable hook placement at top of file
      'vitest/prefer-hooks-on-top': 'error',
      'vitest/no-duplicate-hooks': 'error',
      'vitest/no-hooks': 'off', // Allow hooks but enforce order
      
      // ============================================
      // Governance Pillar II: Isolation and Statelessness
      // ============================================
      
      // 1. State Management - prefer beforeEach/afterEach over beforeAll/afterAll
      //    Prevents shared state leakage across tests
      //    Note: prefer-hooks-on-top already enforces hook placement
      
      // 2. Component Isolation - prohibit rendering in lifecycle hooks
      //    Note: This project uses NestJS (no DOM), but rule applies to any setup hooks
      //    The no-standalone-expect rule prevents assertions outside test blocks
      
      // Additional isolation rules
      'vitest/no-focused-tests': 'error', // Prevent .only() in CI
      // Note: no-skipped-tests and no-disabled-tests may not be available in all versions
      
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
  // Test file configuration - E2E tests (Playwright)
  {
    files: ['tests/e2e/**/*.test.ts', 'tests/e2e/**/*.e2e.test.ts'],
    plugins: {
      playwright: playwrightPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
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
      
      // Custom rule: Prohibit XPath selectors (enforced via no-raw-locators and prefer-native-locators)
      // XPath usage will be caught by these rules, but we add explicit pattern matching
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
);
