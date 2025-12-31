import type { InjectionToken } from '@nestjs/common';

/**
 * IMetricsService - Interface for metrics collection operations
 *
 * Abstracts metrics collection to enable dependency inversion and service mesh integration.
 * This interface allows business logic to depend on abstractions rather than concrete
 * implementations, enabling metrics to be handled by a service mesh or centralized
 * metrics infrastructure (Prometheus, StatsD, etc.) when scaling to microservices architecture.
 *
 * Future extraction target: Service Mesh (metrics handled by service mesh observability)
 */
export interface IMetricsService {
  /**
   * Increment a counter metric
   * @param name - Metric name
   * @param value - Optional increment value (defaults to 1)
   * @param tags - Optional tags/labels for metric aggregation
   */
  incrementCounter(
    name: string,
    value?: number,
    tags?: Record<string, string>,
  ): void;

  /**
   * Record a gauge metric (represents a value that can go up or down)
   * @param name - Metric name
   * @param value - Gauge value
   * @param tags - Optional tags/labels for metric aggregation
   */
  recordGauge(name: string, value: number, tags?: Record<string, string>): void;

  /**
   * Record a histogram metric (distribution of values over time)
   * @param name - Metric name
   * @param value - Histogram value
   * @param tags - Optional tags/labels for metric aggregation
   */
  recordHistogram(
    name: string,
    value: number,
    tags?: Record<string, string>,
  ): void;

  /**
   * Record a timing/duration metric
   * @param name - Metric name
   * @param durationMs - Duration in milliseconds
   * @param tags - Optional tags/labels for metric aggregation
   */
  recordTiming(
    name: string,
    durationMs: number,
    tags?: Record<string, string>,
  ): void;
}

export const IMetricsService = Symbol(
  'IMetricsService',
) as InjectionToken<IMetricsService>;
