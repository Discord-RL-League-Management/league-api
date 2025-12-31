import { Injectable } from '@nestjs/common';
import { IMetricsService } from '../interfaces/metrics.interface';

/**
 * In-memory metrics storage structure
 */
interface MetricsStorage {
  counters: Map<string, number>;
  gauges: Map<string, number>;
  histograms: Map<string, number[]>;
  timings: Map<string, number[]>;
}

/**
 * InAppMetricsService - In-app implementation of IMetricsService
 *
 * Provides in-memory metrics collection through the infrastructure abstraction
 * interface. This enables dependency inversion and allows metrics to be swapped
 * with service mesh or centralized metrics infrastructure (Prometheus, StatsD, etc.)
 * in the future.
 *
 * Implementation: In-memory storage using Maps
 * Note: This is a basic implementation - full metrics aggregation would require
 * external service integration
 */
@Injectable()
export class InAppMetricsService implements IMetricsService {
  private readonly metrics: MetricsStorage = {
    counters: new Map<string, number>(),
    gauges: new Map<string, number>(),
    histograms: new Map<string, number[]>(),
    timings: new Map<string, number[]>(),
  };

  /**
   * Build metric key with tags
   */
  private buildKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
    return `${name}#${tagString}`;
  }

  /**
   * Increment a counter metric
   * @param name - Metric name
   * @param value - Optional increment value (defaults to 1)
   * @param tags - Optional tags/labels for metric aggregation
   */
  incrementCounter(
    name: string,
    value: number = 1,
    tags?: Record<string, string>,
  ): void {
    const key = this.buildKey(name, tags);
    const current = this.metrics.counters.get(key) || 0;
    this.metrics.counters.set(key, current + value);
  }

  /**
   * Record a gauge metric (represents a value that can go up or down)
   * @param name - Metric name
   * @param value - Gauge value
   * @param tags - Optional tags/labels for metric aggregation
   */
  recordGauge(
    name: string,
    value: number,
    tags?: Record<string, string>,
  ): void {
    const key = this.buildKey(name, tags);
    this.metrics.gauges.set(key, value);
  }

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
  ): void {
    const key = this.buildKey(name, tags);
    const values = this.metrics.histograms.get(key) || [];
    values.push(value);
    this.metrics.histograms.set(key, values);
  }

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
  ): void {
    const key = this.buildKey(name, tags);
    const values = this.metrics.timings.get(key) || [];
    values.push(durationMs);
    this.metrics.timings.set(key, values);
  }
}
