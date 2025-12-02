import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as os from 'os';
import * as dns from 'dns';
import * as https from 'https';
import { getTraceId } from '../common/context/request-context.store';

/**
 * New Relic Logger Service
 * Sends logs to New Relic Logs API with full field support
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
    // Support EU region: use log-api.eu.newrelic.com for EU accounts
    const region = process.env.NEW_RELIC_REGION || 'us';
    const hostname =
      region === 'eu' ? 'log-api.eu.newrelic.com' : 'log-api.newrelic.com';
    this.logEndpoint = `https://${hostname}/log/v1`;

    // Create axios instance with custom DNS lookup to handle WSL2 DNS issues
    // WSL2 DNS may resolve to 0.0.0.0, so we use a custom lookup that falls back to Google DNS
    this.axiosInstance = axios.create({
      timeout: 5000,
      httpsAgent: new https.Agent({
        lookup: (hostname, options, callback) => {
          // Try system DNS first
          dns.lookup(hostname, options, (err, address, family) => {
            if (err || address === '0.0.0.0' || address === '::') {
              // Fallback to Google DNS if system DNS fails or returns invalid address
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
    metadata?: any,
  ): Promise<void> {
    if (!this.enabled || !this.apiKey) {
      return;
    }

    try {
      const traceId = getTraceId();
      const logEntry: any = {
        timestamp: Date.now(),
        level,
        message,
        'service.name': this.serviceName,
        hostname: this.hostname,
        'labels.name': context || 'Application',
        ...metadata,
      };

      // Add trace.id if available
      if (traceId) {
        logEntry['trace.id'] = traceId;
      }

      await this.axiosInstance.post(this.logEndpoint, [logEntry], {
        headers: {
          'X-License-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });
    } catch (error: any) {
      // Log error details for debugging, but don't throw to avoid disrupting application
      // Only log once per error type to avoid spam
      const errorCode = error?.code || error?.response?.status;
      const errorKey = `_error_${errorCode}_logged`;

      if (!(this as any)[errorKey]) {
        // Use console.error directly to avoid recursion (don't use this.error)
        console.error(
          `[NewRelicLogger] Failed to send log to New Relic: ${errorCode || 'unknown'} - ${error?.message || 'Unknown error'}`,
        );
        (this as any)[errorKey] = true;

        // Reset error flag after 5 minutes to allow retry logging
        setTimeout(
          () => {
            (this as any)[errorKey] = false;
          },
          5 * 60 * 1000,
        );
      }
    }
  }

  log(message: string, context?: string): void {
    this.sendToNewRelic('info', message, context).catch(() => {
      // Silently handle errors to avoid log recursion and unhandled promise rejections
    });
    console.log(`[${context || 'Application'}] ${message}`);
  }

  error(message: string, trace?: string, context?: string): void {
    this.sendToNewRelic('error', message, context, { trace }).catch(() => {
      // Silently handle errors to avoid log recursion and unhandled promise rejections
    });
    console.error(`[${context || 'Application'}] ${message}`, trace);
  }

  warn(message: string, context?: string): void {
    this.sendToNewRelic('warn', message, context).catch(() => {
      // Silently handle errors to avoid log recursion and unhandled promise rejections
    });
    console.warn(`[${context || 'Application'}] ${message}`);
  }

  debug(message: string, context?: string): void {
    if (process.env.NODE_ENV === 'development') {
      this.sendToNewRelic('debug', message, context).catch(() => {
        // Silently handle errors to avoid log recursion and unhandled promise rejections
      });
      console.debug(`[${context || 'Application'}] ${message}`);
    }
  }

  verbose(message: string, context?: string): void {
    if (process.env.NODE_ENV === 'development') {
      this.sendToNewRelic('verbose', message, context).catch(() => {
        // Silently handle errors to avoid log recursion and unhandled promise rejections
      });
      console.log(`[${context || 'Application'}] VERBOSE: ${message}`);
    }
  }
}
