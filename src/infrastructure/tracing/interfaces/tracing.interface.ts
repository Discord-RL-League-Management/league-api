import type { InjectionToken } from '@nestjs/common';

/**
 * ITracingService - Interface for distributed tracing operations
 *
 * Abstracts distributed tracing functionality to enable dependency inversion and service mesh integration.
 * This interface allows business logic to depend on abstractions rather than concrete
 * implementations, enabling tracing to be handled by a service mesh or centralized
 * tracing infrastructure (OpenTelemetry, Jaeger, Zipkin, etc.) when scaling to
 * microservices architecture.
 *
 * Future extraction target: Service Mesh (distributed tracing handled by service mesh observability)
 */
export interface ITracingService {
  /**
   * Get the current trace ID from the request context
   * @returns Trace ID or undefined if not in a traced context
   */
  getTraceId(): string | undefined;

  /**
   * Create a new span for tracing
   * @param name - Span name
   * @param parentSpanId - Optional parent span ID for span hierarchy
   * @returns Span ID for the created span
   */
  createSpan(name: string, parentSpanId?: string): string;

  /**
   * Finish/close a span
   * @param spanId - Span ID to finish
   */
  finishSpan(spanId: string): void;

  /**
   * Set a tag on a span
   * @param spanId - Span ID
   * @param key - Tag key
   * @param value - Tag value
   */
  setSpanTag(spanId: string, key: string, value: string): void;

  /**
   * Record an error on a span
   * @param spanId - Span ID
   * @param error - Error to record
   */
  setSpanError(spanId: string, error: Error): void;
}

export const ITracingService = Symbol(
  'ITracingService',
) as InjectionToken<ITracingService>;
