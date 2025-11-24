import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NewRelicLoggerService } from './newrelic-logger.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [NewRelicLoggerService],
  exports: [NewRelicLoggerService],
})
export class LoggingModule {}
