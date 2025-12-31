import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { HealthCheckResponseDto } from '../common/dto/health-check.dto';
import type { ILoggingService } from '../infrastructure/logging/interfaces/logging.interface';

@Controller('internal')
@UseGuards(BotAuthGuard)
@SkipThrottle()
export class InternalController {
  private readonly serviceName = InternalController.name;

  constructor(
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {}

  @Get('health')
  healthCheck(): HealthCheckResponseDto {
    try {
      const response: HealthCheckResponseDto = {
        status: 'ok',
        message: 'Bot authenticated successfully',
        timestamp: new Date().toISOString(),
      };

      this.loggingService.log('Health check requested', this.serviceName);
      return response;
    } catch (error) {
      this.loggingService.error(
        `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw error;
    }
  }
}
