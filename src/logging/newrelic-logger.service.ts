import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as os from 'os';
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

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('newrelic.apiKey') || '';
    this.enabled = this.configService.get<boolean>('newrelic.enabled') ?? true;
    this.serviceName = process.env.NEW_RELIC_APP_NAME || 'League API';
    this.hostname = os.hostname();
    // Support EU region: use log-api.eu.newrelic.com for EU accounts
    const region = process.env.NEW_RELIC_REGION || 'us';
    this.logEndpoint = region === 'eu' 
      ? 'https://log-api.eu.newrelic.com/log/v1'
      : 'https://log-api.newrelic.com/log/v1';
  }


  /**
   * Send log to New Relic Logs API
   */
  private async sendToNewRelic(level: string, message: string, context?: string, metadata?: any): Promise<void> {
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

      await axios.post(
        this.logEndpoint,
        [logEntry],
        {
          headers: {
            'X-License-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 5000, // 5 second timeout
        },
      );
    } catch (error: any) {
      // Silently fail to avoid log recursion
      // Only log connection errors in development, and only once to avoid spam
      if (process.env.NODE_ENV === 'development' && error?.code === 'ECONNREFUSED') {
        // Only log the first connection error to avoid spam
        if (!(this as any)._connectionErrorLogged) {
          console.warn('⚠️  New Relic connection failed. This may be a network/firewall issue. Logs will continue to console only.');
          (this as any)._connectionErrorLogged = true;
        }
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

