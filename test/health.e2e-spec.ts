import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { bootstrapTestApp } from './helpers/create-test-app';

describe('Health Endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await bootstrapTestApp(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Basic health check', () => {
    it('should return 200 and basic health information', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('version');

      // Verify timestamp is valid ISO string
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      expect(response.body.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );

      // Verify uptime is a number
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    it('should be accessible without authentication', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);
    });

    it('should return consistent response structure', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(Object.keys(response1.body)).toEqual(Object.keys(response2.body));
    });
  });

  describe('Detailed health check', () => {
    it('should return 200 and detailed health information', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('info');
      expect(response.body.info).toHaveProperty('database');
      expect(response.body.info).toHaveProperty('memory_heap');
      expect(response.body.info).toHaveProperty('memory_rss');
      expect(response.body.info).toHaveProperty('storage');
      expect(response.body.info).toHaveProperty('discord_api');
    });

    it('should be accessible without authentication', async () => {
      await request(app.getHttpServer()).get('/health/detailed').expect(200);
    });

    it('should include health check details for each indicator', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      // Check that each health indicator has a status
      Object.values(response.body.info).forEach((indicator: unknown) => {
        expect(indicator).toHaveProperty('status');
        expect(['up', 'down']).toContain((indicator as { status: string }).status);
      });
    });

    it('should handle health check failures gracefully', async () => {
      // This test verifies that the health check doesn't crash the application
      // even if individual indicators fail
      const response = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      // Status should be 'ok' or 'error' but not undefined
      expect(['ok', 'error']).toContain(response.body.status);
    });
  });

  describe('Health endpoint performance', () => {
    it('should respond quickly to health checks', async () => {
      const start = Date.now();
      await request(app.getHttpServer()).get('/health').expect(200);
      const duration = Date.now() - start;

      // Health check should respond within 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should handle multiple concurrent health check requests', async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(app.getHttpServer()).get('/health').expect(200),
      );

      const responses = await Promise.all(promises);

      // All responses should be successful
      responses.forEach((response: { body: { status: string } }) => {
        expect(response.body.status).toBe('ok');
      });
    });
  });

  describe('Health endpoint headers', () => {
    it('should include appropriate cache headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      // Health checks should not be cached
      expect(response.headers['cache-control']).toMatch(/no-cache|no-store/);
    });

    it('should include CORS headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });
});
