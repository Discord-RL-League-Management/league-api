/**
 * InAppMetricsService Unit Tests
 *
 * Tests for in-app metrics service implementation.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InAppMetricsService } from '@/infrastructure/metrics/services/in-app-metrics.service';

describe('InAppMetricsService', () => {
  let service: InAppMetricsService;

  beforeEach(() => {
    service = new InAppMetricsService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('incrementCounter', () => {
    it('should_increment_counter_by_default_value', () => {
      const name = 'test.counter';

      service.incrementCounter(name);

      const metrics = (service as any).metrics;
      expect(metrics.counters.get(name)).toBe(1);
    });

    it('should_increment_counter_by_specified_value', () => {
      const name = 'test.counter';
      const value = 5;

      service.incrementCounter(name, value);

      const metrics = (service as any).metrics;
      expect(metrics.counters.get(name)).toBe(5);
    });

    it('should_accumulate_counter_values', () => {
      const name = 'test.counter';

      service.incrementCounter(name, 3);
      service.incrementCounter(name, 2);

      const metrics = (service as any).metrics;
      expect(metrics.counters.get(name)).toBe(5);
    });

    it('should_handle_tags_in_metric_key', () => {
      const name = 'test.counter';
      const tags = { env: 'production', service: 'api' };

      service.incrementCounter(name, 1, tags);

      const metrics = (service as any).metrics;
      const key = `${name}#env=production,service=api`;
      expect(metrics.counters.get(key)).toBe(1);
    });
  });

  describe('recordGauge', () => {
    it('should_record_gauge_value', () => {
      const name = 'test.gauge';
      const value = 42.5;

      service.recordGauge(name, value);

      const metrics = (service as any).metrics;
      expect(metrics.gauges.get(name)).toBe(value);
    });

    it('should_overwrite_previous_gauge_value', () => {
      const name = 'test.gauge';

      service.recordGauge(name, 10);
      service.recordGauge(name, 20);

      const metrics = (service as any).metrics;
      expect(metrics.gauges.get(name)).toBe(20);
    });

    it('should_handle_tags_in_gauge_key', () => {
      const name = 'test.gauge';
      const value = 100;
      const tags = { region: 'us-east' };

      service.recordGauge(name, value, tags);

      const metrics = (service as any).metrics;
      const key = `${name}#region=us-east`;
      expect(metrics.gauges.get(key)).toBe(value);
    });
  });

  describe('recordHistogram', () => {
    it('should_record_histogram_value', () => {
      const name = 'test.histogram';
      const value = 50;

      service.recordHistogram(name, value);

      const metrics = (service as any).metrics;
      const values = metrics.histograms.get(name);
      expect(values).toContain(value);
      expect(values.length).toBe(1);
    });

    it('should_accumulate_histogram_values', () => {
      const name = 'test.histogram';

      service.recordHistogram(name, 10);
      service.recordHistogram(name, 20);
      service.recordHistogram(name, 30);

      const metrics = (service as any).metrics;
      const values = metrics.histograms.get(name);
      expect(values).toEqual([10, 20, 30]);
    });

    it('should_handle_tags_in_histogram_key', () => {
      const name = 'test.histogram';
      const value = 75;
      const tags = { endpoint: '/api/users' };

      service.recordHistogram(name, value, tags);

      const metrics = (service as any).metrics;
      const key = `${name}#endpoint=/api/users`;
      expect(metrics.histograms.get(key)).toContain(value);
    });
  });

  describe('recordTiming', () => {
    it('should_record_timing_value', () => {
      const name = 'test.timing';
      const durationMs = 150;

      service.recordTiming(name, durationMs);

      const metrics = (service as any).metrics;
      const values = metrics.timings.get(name);
      expect(values).toContain(durationMs);
    });

    it('should_accumulate_timing_values', () => {
      const name = 'test.timing';

      service.recordTiming(name, 100);
      service.recordTiming(name, 200);
      service.recordTiming(name, 300);

      const metrics = (service as any).metrics;
      const values = metrics.timings.get(name);
      expect(values).toEqual([100, 200, 300]);
    });

    it('should_handle_tags_in_timing_key', () => {
      const name = 'test.timing';
      const durationMs = 250;
      const tags = { method: 'GET', status: '200' };

      service.recordTiming(name, durationMs, tags);

      const metrics = (service as any).metrics;
      const key = `${name}#method=GET,status=200`;
      expect(metrics.timings.get(key)).toContain(durationMs);
    });
  });
});
