import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { bootstrapTestApp } from './helpers/create-test-app';

describe('Internal Health API (e2e)', () => {
  let app: INestApplication;
  const validApiKey = process.env.BOT_API_KEY;

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

  describe('GET /internal/health', () => {
    it('should return health status with valid API key', async () => {
      const response = await request(app.getHttpServer())
        .get('/internal/health')
        .set('Authorization', `Bearer ${validApiKey}`)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        message: 'Bot authenticated successfully',
        timestamp: expect.any(String),
      });
    });

    it('should return 401 without API key', async () => {
      await request(app.getHttpServer()).get('/internal/health').expect(401);
    });

    it('should return 401 with invalid API key', async () => {
      await request(app.getHttpServer())
        .get('/internal/health')
        .set('Authorization', 'Bearer invalid-key')
        .expect(401);
    });
  });
});
