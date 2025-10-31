import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import { LoggerOptions } from 'pino';

export const pinoConfig = (configService: ConfigService): Params => {
  const isProduction =
    configService.get<string>('app.nodeEnv') === 'production';
  const logLevel = configService.get<string>('logging.level');
  const fileEnabled = configService.get<boolean>('logging.fileEnabled');
  const filePath = configService.get<string>('logging.filePath');

  const baseConfig: LoggerOptions = {
    level: logLevel,
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  };

  if (isProduction) {
    return {
      pinoHttp: {
        ...baseConfig,
        transport: fileEnabled
          ? {
              target: 'pino/file',
              options: {
                destination: `${filePath}/combined.log`,
                mkdir: true,
              },
            }
          : undefined,
      },
    };
  }

  // Development configuration
  return {
    pinoHttp: {
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: false,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    },
  };
};
