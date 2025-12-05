import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { bootstrapTestApp } from './helpers/create-test-app';

describe('MMR Calculation API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await bootstrapTestApp(app);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.upsert({
      where: { id: 'test-admin-user' },
      update: {},
      create: {
        id: 'test-admin-user',
        username: 'testadmin',
        globalName: 'Test Admin',
      },
    });
    adminToken = jwtService.sign({ sub: user.id, username: user.username });
  });

  describe('POST /api/mmr-calculation/validate-formula', () => {
    // INPUT: Valid formula
    it('should validate valid formula', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/mmr-calculation/validate-formula')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          formula: '(ones * 0.1 + twos * 0.3 + threes * 0.5 + fours * 0.1)',
        })
        .expect(200);

      const body = response.body as { valid: boolean; error?: string };
      expect(body).toMatchObject({
        valid: true,
      });
      expect(body.error).toBeUndefined();
    });

    // INPUT: Invalid formula
    it('should reject invalid formula', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/mmr-calculation/validate-formula')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ formula: 'ones + + twos' })
        .expect(200);

      const body = response.body as { valid: boolean; error?: string };
      expect(body).toMatchObject({
        valid: false,
      });
      expect(body.error).toBeDefined();
    });

    // PROTECTION: Reject empty formula
    it('should reject empty formula', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/mmr-calculation/validate-formula')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ formula: '' })
        .expect(200);

      const body = response.body as { valid: boolean; error?: string };
      expect(body).toMatchObject({
        valid: false,
      });
      expect(body.error).toContain('cannot be empty');
    });

    // PROTECTION: Reject disallowed variables
    it('should reject formula with disallowed variables', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/mmr-calculation/validate-formula')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ formula: 'ones + maliciousVar' })
        .expect(200);

      const body = response.body as { valid: boolean; error?: string };
      expect(body).toMatchObject({
        valid: false,
      });
      expect(body.error).toContain('Disallowed variables');
    });

    // INPUT: Missing formula field
    it('should return 400 when formula is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/mmr-calculation/validate-formula')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    // PROTECTION: Require authentication
    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/mmr-calculation/validate-formula')
        .send({ formula: 'ones + twos' })
        .expect(401);
    });
  });

  describe('POST /api/mmr-calculation/test-formula', () => {
    // INPUT: Valid formula with default test data
    it('should test formula with default test data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/mmr-calculation/test-formula')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          formula: '(ones * 0.1 + twos * 0.3 + threes * 0.5 + fours * 0.1)',
        })
        .expect(200);

      const body = response.body as {
        valid: boolean;
        result: number;
        testData: Record<string, unknown>;
      };
      expect(body).toMatchObject({
        valid: true,
        result: expect.any(Number),
        testData: expect.any(Object),
      });
      expect(body.result).toBeGreaterThan(0);
    });

    // INPUT: Valid formula with custom test data
    it('should test formula with custom test data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/mmr-calculation/test-formula')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          formula: 'max([ones, twos, threes, fours])',
          testData: {
            ones: 1000,
            twos: 2000,
            threes: 1500,
            fours: 800,
          },
        })
        .expect(200);

      const body = response.body as {
        valid: boolean;
        result: number;
        testData: Record<string, unknown>;
      };
      expect(body).toMatchObject({
        valid: true,
        result: 2000,
        testData: expect.objectContaining({
          ones: 1000,
          twos: 2000,
          threes: 1500,
          fours: 800,
        }),
      });
    });

    // OUTPUT: Invalid formula returns error
    it('should return error for invalid formula', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/mmr-calculation/test-formula')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ formula: 'invalid syntax + +' })
        .expect(200);

      const body = response.body as {
        valid: boolean;
        result: number;
        error?: string;
      };
      expect(body).toMatchObject({
        valid: false,
        result: 0,
        error: expect.any(String),
      });
    });

    // PROTECTION: Require authentication
    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/mmr-calculation/test-formula')
        .send({ formula: 'ones + twos' })
        .expect(401);
    });
  });
});
