import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as os from 'os';
import * as dns from 'dns';
import * as https from 'https';
import { getTraceId } from '../common/context/request-context.store';
import { LogSanitizer } from '../common/utils/log-sanitizer';

/**
 * New Relic Logger Service
 * Sends logs to New Relic Logs API with full field support
 *
 * Reference: NestJS Logging
 * https://docs.nestjs.com/techniques/logger
 */
@Injectable()
export class NewRelicLoggerService implements LoggerService {
  private readonly apiKey: string;
  private readonly enabled: boolean;
  private readonly logEndpoint: string;
  private readonly serviceName: string;
  private readonly hostname: string;
  private readonly axiosInstance: AxiosInstance;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('newrelic.apiKey') || '';
    this.enabled = this.configService.get<boolean>('newrelic.enabled') ?? true;
    this.serviceName = process.env.NEW_RELIC_APP_NAME || 'League API';
    this.hostname = os.hostname();
    const region = process.env.NEW_RELIC_REGION || 'us';
    const hostname =
      region === 'eu' ? 'log-api.eu.newrelic.com' : 'log-api.newrelic.com';
    this.logEndpoint = `https://${hostname}/log/v1`;

    this.axiosInstance = axios.create({
      timeout: 5000,
      httpsAgent: new https.Agent({
        lookup: (hostname, options, callback) => {
          dns.lookup(hostname, options, (err, address, family) => {
            if (err || address === '0.0.0.0' || address === '::') {
              const resolver = new dns.Resolver();
              resolver.setServers(['8.8.8.8', '8.8.4.4']);
              resolver.resolve4(hostname, (err2, addresses) => {
                if (err2 || !addresses || addresses.length === 0) {
                  callback(
                    err || err2 || new Error('DNS resolution failed'),
                    '',
                    4,
                  );
                } else {
                  callback(null, addresses[0], 4);
                }
              });
            } else {
              callback(null, address, family);
            }
          });
        },
      }),
    });
  }

  /**
   * Send log to New Relic Logs API
   */
  private async sendToNewRelic(
    level: string,
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.enabled || !this.apiKey) {
      return;
    }

    try {
      const traceId = getTraceId();
      const sanitizedMessage = LogSanitizer.sanitizeString(message);
      const sanitizedMetadata = metadata
        ? (LogSanitizer.sanitizeObject(metadata) as Record<string, unknown>)
        : undefined;

      const logEntry: Record<string, unknown> = {
        timestamp: Date.now(),
        level,
        message: sanitizedMessage,
        'service.name': this.serviceName,
        hostname: this.hostname,
        'labels.name': context || 'Application',
        ...sanitizedMetadata,
      };

      if (traceId) {
        logEntry['trace.id'] = traceId;
      }

      await this.axiosInstance.post(this.logEndpoint, [logEntry], {
        headers: {
          'X-License-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });
    } catch (error: unknown) {
      const errorObj = error as {
        code?: string | number;
        response?: { status?: number };
        message?: string;
      };
      const errorCode = errorObj?.code || errorObj?.response?.status;
      const errorKey = `_error_${errorCode}_logged`;

      const loggerInstance = this as unknown as Record<string, boolean>;
      if (!loggerInstance[errorKey]) {
        console.error(
          `[NewRelicLogger] Failed to send log to New Relic: ${errorCode || 'unknown'} - ${errorObj?.message || 'Unknown error'}`,
        );
        loggerInstance[errorKey] = true;

        setTimeout(
          () => {
            loggerInstance[errorKey] = false;
          },
          5 * 60 * 1000,
        );
      }
    }
  }

  log(message: string, context?: string): void {
    this.sendToNewRelic('info', message, context).catch(() => {});
    console.log(`[${context || 'Application'}] ${message}`);
  }

  error(message: string, trace?: string, context?: string): void {
    this.sendToNewRelic('error', message, context, { trace }).catch(() => {});
    console.error(`[${context || 'Application'}] ${message}`, trace);
  }

  warn(message: string, context?: string): void {
    this.sendToNewRelic('warn', message, context).catch(() => {});
    console.warn(`[${context || 'Application'}] ${message}`);
  }

  debug(message: string, context?: string): void {
    if (process.env.NODE_ENV === 'development') {
      this.sendToNewRelic('debug', message, context).catch(() => {});
      console.debug(`[${context || 'Application'}] ${message}`);
    }
  }

  verbose(message: string, context?: string): void {
    if (process.env.NODE_ENV === 'development') {
      this.sendToNewRelic('verbose', message, context).catch(() => {});
      console.log(`[${context || 'Application'}] VERBOSE: ${message}`);
    }
  }
}
