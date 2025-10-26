import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { pinoConfig } from './pino.config';

@Module({
  imports: [
    ConfigModule,
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: pinoConfig,
    }),
  ],
})
export class LoggingModule {}











