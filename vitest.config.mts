import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest Configuration
 * 
 * Aligned with ISO/IEC/IEEE 29119 standards for unit testing.
 * Focuses on TDD methodology with fast execution and state verification.
 */
export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Test file patterns
    // Default: only unit tests (API tests run separately via test:api script)
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'tests/e2e', 'tests/api'],
    
    // Setup files
    setupFiles: ['./tests/setup/unit-setup.ts'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/*.d.ts',
        '**/main.ts',
        '**/prisma/**',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    
    // Test timeout (100ms target per test)
    testTimeout: 5000,
    
    // Parallel execution support
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    
    // Globals for cleaner test syntax
    globals: true,
    
    // TypeScript support
    typecheck: {
      tsconfig: './tsconfig.json',
    },
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
});

