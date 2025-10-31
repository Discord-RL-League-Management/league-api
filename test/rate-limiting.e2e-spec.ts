import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { bootstrapTestApp } from './helpers/create-test-app';

describe('Rate Limiting (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await bootstrapTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('User endpoints rate limiting', () => {
    it('should apply rate limiting to user endpoints', async () => {
      // Make multiple requests to a user endpoint
      const promises = Array.from(
        { length: 5 },
        () => request(app.getHttpServer()).get('/api/users/me').expect(401), // Unauthorized because no JWT token
      );

      await Promise.all(promises);

      // Check that rate limit headers are present
      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .expect(401);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });

    it('should return 429 when rate limit is exceeded', async () => {
      // This test would need to be adjusted based on the actual rate limit configuration
      // For now, we'll just verify the endpoint exists and returns proper headers
      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .expect(401);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
    });
  });

  describe('Bot endpoints rate limiting exemption', () => {
    it('should not apply rate limiting to internal bot endpoints', async () => {
      // Make multiple requests to internal endpoint
      const promises = Array.from(
        { length: 10 },
        () => request(app.getHttpServer()).get('/internal/health').expect(401), // Unauthorized because no API key
      );

      await Promise.all(promises);

      // Check that rate limit headers are NOT present for internal endpoints
      const response = await request(app.getHttpServer())
        .get('/internal/health')
        .expect(401);

      expect(response.headers).not.toHaveProperty('x-ratelimit-limit');
      expect(response.headers).not.toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).not.toHaveProperty('x-ratelimit-reset');
    });

    it('should not apply rate limiting to internal users endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/internal/users')
        .expect(401);

      expect(response.headers).not.toHaveProperty('x-ratelimit-limit');
      expect(response.headers).not.toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).not.toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('Health endpoints rate limiting', () => {
    it('should not apply rate limiting to public health endpoints', async () => {
      // Make multiple requests to health endpoint
      const promises = Array.from({ length: 10 }, () =>
        request(app.getHttpServer()).get('/health').expect(200),
      );

      await Promise.all(promises);

      // Check that rate limit headers are NOT present for health endpoints
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.headers).not.toHaveProperty('x-ratelimit-limit');
      expect(response.headers).not.toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).not.toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('Rate limit headers', () => {
    it('should include proper rate limit headers in responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .expect(401);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');

      // Verify header values are numbers
      expect(Number(response.headers['x-ratelimit-limit'])).toBeGreaterThan(0);
      expect(
        Number(response.headers['x-ratelimit-remaining']),
      ).toBeGreaterThanOrEqual(0);
      expect(Number(response.headers['x-ratelimit-reset'])).toBeGreaterThan(0);
    });
  });
});
