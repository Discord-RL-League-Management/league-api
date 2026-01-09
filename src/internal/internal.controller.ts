import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { HealthCheckResponseDto } from '../common/dto/health-check.dto';

@ApiTags('Internal')
@Controller('internal')
@UseGuards(BotAuthGuard)
@SkipThrottle()
export class InternalController {
  private readonly logger = new Logger(InternalController.name);

  @Get('health')
  @ApiOperation({ summary: 'Internal health check (bot authenticated)' })
  @ApiResponse({ status: 200, description: 'Health check successful' })
  healthCheck(): HealthCheckResponseDto {
    try {
      const response: HealthCheckResponseDto = {
        status: 'ok',
        message: 'Bot authenticated successfully',
        timestamp: new Date().toISOString(),
      };

      this.logger.log('Health check requested', { response });
      return response;
    } catch (error) {
      this.logger.error('Health check failed', error);
      throw error;
    }
  }
}
