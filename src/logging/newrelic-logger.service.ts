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
  private readonly errorRateLimitMap = new Map<string, boolean>();

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
      // Convert errorCode to string safely for use as object key
      const errorCodeStr = String(errorCode ?? 'unknown');
      const errorKey = `_error_${errorCodeStr}_logged`;

      // Use Map for error tracking instead of dynamic object property access
      if (!this.errorRateLimitMap.has(errorKey)) {
        const sanitizedMessage = errorObj?.message
          ? LogSanitizer.sanitizeString(String(errorObj.message))
          : 'Unknown error';
        console.error(
          `[NewRelicLogger] Failed to send log to New Relic: ${errorCodeStr} - ${sanitizedMessage}`,
        );
        this.errorRateLimitMap.set(errorKey, true);

        setTimeout(
          () => {
            this.errorRateLimitMap.delete(errorKey);
          },
          5 * 60 * 1000,
        );
      }
    }
  }

  log(message: string, context?: string): void {
    this.sendToNewRelic('info', message, context).catch(() => {});
    const sanitizedMessage = LogSanitizer.sanitizeString(message);
    const sanitizedContext = context
      ? LogSanitizer.sanitizeString(context)
      : 'Application';

    // Safe: sanitizedMessage and sanitizedContext are sanitized via LogSanitizer.sanitizeString()
    // which explicitly removes CRLF characters (\r\n, \r, \n) - see log-sanitizer.ts lines 135-138
    console.log('[' + sanitizedContext + '] ' + sanitizedMessage); // eslint-disable-line security-node/detect-crlf
  }

  error(message: string, trace?: string, context?: string): void {
    this.sendToNewRelic('error', message, context, { trace }).catch(() => {});
    const sanitizedMessage = LogSanitizer.sanitizeString(message);
    const sanitizedContext = context
      ? LogSanitizer.sanitizeString(context)
      : 'Application';
    const sanitizedTrace = trace
      ? LogSanitizer.sanitizeString(trace)
      : undefined;
    console.error(`[${sanitizedContext}] ${sanitizedMessage}`, sanitizedTrace);
  }

  warn(message: string, context?: string): void {
    this.sendToNewRelic('warn', message, context).catch(() => {});
    const sanitizedMessage = LogSanitizer.sanitizeString(message);
    const sanitizedContext = context
      ? LogSanitizer.sanitizeString(context)
      : 'Application';
    console.warn(`[${sanitizedContext}] ${sanitizedMessage}`);
  }

  debug(message: string, context?: string): void {
    if (process.env.NODE_ENV === 'development') {
      this.sendToNewRelic('debug', message, context).catch(() => {});
      const sanitizedMessage = LogSanitizer.sanitizeString(message);
      const sanitizedContext = context
        ? LogSanitizer.sanitizeString(context)
        : 'Application';
      console.debug(`[${sanitizedContext}] ${sanitizedMessage}`);
    }
  }

  verbose(message: string, context?: string): void {
    if (process.env.NODE_ENV === 'development') {
      this.sendToNewRelic('verbose', message, context).catch(() => {});
      const sanitizedMessage = LogSanitizer.sanitizeString(message);
      const sanitizedContext = context
        ? LogSanitizer.sanitizeString(context)
        : 'Application';

      // Safe: sanitizedMessage and sanitizedContext are sanitized via LogSanitizer.sanitizeString()
      // which explicitly removes CRLF characters (\r\n, \r, \n) - see log-sanitizer.ts lines 135-138
      console.log('[' + sanitizedContext + '] VERBOSE: ' + sanitizedMessage); // eslint-disable-line security-node/detect-crlf
    }
  }
}
