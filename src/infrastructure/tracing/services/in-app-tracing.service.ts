import { Injectable } from '@nestjs/common';
import { ITracingService } from '../interfaces/tracing.interface';
import { getTraceId } from '../../../common/context/request-context.store';
import { randomUUID } from 'crypto';

/**
 * In-memory span structure
 */
interface Span {
  id: string;
  name: string;
  parentSpanId?: string;
  startTime: Date;
  endTime?: Date;
  finished: boolean;
  tags: Record<string, string>;
  error?: Error;
}

/**
 * InAppTracingService - In-app implementation of ITracingService
 *
 * Provides in-memory distributed tracing through the infrastructure abstraction
 * interface. This enables dependency inversion and allows tracing to be swapped
 * with service mesh or centralized tracing infrastructure (OpenTelemetry, Jaeger, Zipkin, etc.)
 * in the future.
 *
 * Implementation: In-memory span tracking using Map
 */
@Injectable()
export class InAppTracingService implements ITracingService {
  private readonly spans = new Map<string, Span>();

  /**
   * Get the current trace ID from the request context
   * @returns Trace ID or undefined if not in a traced context
   */
  getTraceId(): string | undefined {
    return getTraceId();
  }

  /**
   * Create a new span for tracing
   * @param name - Span name
   * @param parentSpanId - Optional parent span ID for span hierarchy
   * @returns Span ID for the created span
   */
  createSpan(name: string, parentSpanId?: string): string {
    const spanId = randomUUID();
    const span: Span = {
      id: spanId,
      name,
      parentSpanId,
      startTime: new Date(),
      finished: false,
      tags: {},
    };
    this.spans.set(spanId, span);
    return spanId;
  }

  /**
   * Finish/close a span
   * @param spanId - Span ID to finish
   */
  finishSpan(spanId: string): void {
    const span = this.spans.get(spanId);
    if (span) {
      span.finished = true;
      span.endTime = new Date();
    }
  }

  /**
   * Set a tag on a span
   * @param spanId - Span ID
   * @param key - Tag key
   * @param value - Tag value
   */
  setSpanTag(spanId: string, key: string, value: string): void {
    const span = this.spans.get(spanId);
    if (span) {
      span.tags[key] = value;
    }
  }

  /**
   * Record an error on a span
   * @param spanId - Span ID
   * @param error - Error to record
   */
  setSpanError(spanId: string, error: Error): void {
    const span = this.spans.get(spanId);
    if (span) {
      span.error = error;
      span.tags['error'] = 'true';
    }
  }
}
