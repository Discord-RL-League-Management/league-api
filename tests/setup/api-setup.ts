/**
 * API Test Setup
 *
 * Setup for API/Integration tests using Axios.
 * Ensures stateless, parallel-executable tests.
 */
import axios from 'axios';

// Base URL for API tests
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Create axios instance for API tests
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  validateStatus: (status) => status < 500, // Don't throw on 4xx errors
});

// Test environment setup
process.env.NODE_ENV = 'test';
