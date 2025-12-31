/**
 * E2E Test Setup
 *
 * Setup for Playwright E2E tests.
 * Implements BDD patterns and ensures test isolation.
 */

// E2E test setup can include:
// - Authentication helpers
// - Test data seeding
// - Browser configuration
// - Global fixtures

export const E2E_BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

