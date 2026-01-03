import { defineConfig } from 'vitest/config';
import path from 'path';
import swc from 'unplugin-swc';

/**
 * Vitest Configuration
 * 
 * Aligned with ISO/IEC/IEEE 29119 standards for unit testing.
 * Focuses on TDD methodology with fast execution and state verification.
 * 
 * Uses SWC instead of esbuild to support emitDecoratorMetadata required for NestJS DI.
 */
export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          decoratorMetadata: true,
        },
      },
    }),
  ],
  test: {
    // Test environment
    environment: 'node',
    
    // Test file patterns
    // Default: only unit tests (API tests run separately via test:api script)
    include: [
      'tests/unit/**/*.test.ts',
      'src/**/*.spec.ts', // NestJS convention - co-located spec files
    ],
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
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    
    // Test timeout (100ms target per test)
    // TQA Compliance: Unit tests must have timeout < 100ms per TQA Quality Gates
    testTimeout: 100,
    
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

