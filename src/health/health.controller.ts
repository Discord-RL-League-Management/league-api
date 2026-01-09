import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { DiscordApiHealthIndicator } from './indicators/discord-api.health';
import { Public } from '../common/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Public health check endpoint that bypasses authentication to allow monitoring tools and load balancers to check service availability
@ApiTags('Health')
@Controller('health')
@UseGuards(JwtAuthGuard)
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private discordApi: DiscordApiHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({
    status: 200,
    description: 'Returns basic application status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', example: 123.456 },
        environment: { type: 'string', example: 'development' },
        version: { type: 'string', example: '1.0.0' },
      },
    },
  })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.configService.get<string>('app.nodeEnv', 'development'),
      // Use build-time npm env var since version isn't available in runtime configuration
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  @Get('detailed')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Detailed health check with system indicators' })
  @ApiResponse({
    status: 200,
    description:
      'Returns detailed health status including database, memory, and external services',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: { status: { type: 'string' } },
            },
            memory_heap: {
              type: 'object',
              properties: { status: { type: 'string' } },
            },
            memory_rss: {
              type: 'object',
              properties: { status: { type: 'string' } },
            },
            storage: {
              type: 'object',
              properties: { status: { type: 'string' } },
            },
            discord_api: {
              type: 'object',
              properties: { status: { type: 'string' } },
            },
          },
        },
        error: { type: 'object' },
        details: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable - One or more health checks failed',
  })
  detailedCheck() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024), // 150MB
      () =>
        this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 }), // 90% threshold
      () => this.discordApi.isHealthy('discord_api'),
    ]);
  }
}
