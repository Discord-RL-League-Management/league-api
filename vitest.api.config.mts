import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest Configuration for API/Integration Tests
 * 
 * Aligned with ISO/IEC/IEEE 29119 standards for API testing.
 * Focuses on contract verification with Axios.
 */
export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Test file patterns - API tests only
    include: ['tests/api/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'tests/e2e', 'tests/unit'],
    
    // Setup files
    setupFiles: ['./tests/setup/api-setup.ts'],
    
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
    },
    
    // Test timeout
    testTimeout: 10000, // API tests may take longer
    
    // Parallel execution support
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    
    // Globals for cleaner test syntax
    globals: true,
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
});

