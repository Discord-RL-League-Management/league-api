/**
 * InAppTracingService Unit Tests
 *
 * Tests for in-app tracing service implementation.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InAppTracingService } from '@/infrastructure/tracing/services/in-app-tracing.service';
import * as requestContextStore from '@/common/context/request-context.store';

describe('InAppTracingService', () => {
  let service: InAppTracingService;

  beforeEach(() => {
    service = new InAppTracingService();
    vi.spyOn(requestContextStore, 'getTraceId').mockReturnValue('trace-123');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTraceId', () => {
    it('should_return_trace_id_from_request_context', () => {
      const result = service.getTraceId();

      expect(result).toBe('trace-123');
      expect(requestContextStore.getTraceId).toHaveBeenCalled();
    });

    it('should_return_undefined_when_no_trace_id_in_context', () => {
      vi.mocked(requestContextStore.getTraceId).mockReturnValue(undefined);

      const result = service.getTraceId();

      expect(result).toBeUndefined();
    });
  });

  describe('createSpan', () => {
    it('should_create_span_and_return_span_id', () => {
      const name = 'test-span';

      const spanId = service.createSpan(name);

      expect(spanId).toBeDefined();
      expect(typeof spanId).toBe('string');
      const spans = (service as any).spans;
      expect(spans.has(spanId)).toBe(true);
      expect(spans.get(spanId).name).toBe(name);
    });

    it('should_create_span_with_parent', () => {
      const parentName = 'parent-span';
      const childName = 'child-span';

      const parentSpanId = service.createSpan(parentName);
      const childSpanId = service.createSpan(childName, parentSpanId);

      const spans = (service as any).spans;
      expect(spans.get(childSpanId).parentSpanId).toBe(parentSpanId);
    });

    it('should_set_start_time_on_span_creation', () => {
      const name = 'test-span';

      const spanId = service.createSpan(name);

      const spans = (service as any).spans;
      const span = spans.get(spanId);
      expect(span.startTime).toBeDefined();
      expect(span.startTime).toBeInstanceOf(Date);
    });
  });

  describe('finishSpan', () => {
    it('should_mark_span_as_finished', () => {
      const name = 'test-span';
      const spanId = service.createSpan(name);

      service.finishSpan(spanId);

      const spans = (service as any).spans;
      const span = spans.get(spanId);
      expect(span.finished).toBe(true);
      expect(span.endTime).toBeDefined();
    });

    it('should_set_end_time_on_finish', () => {
      const name = 'test-span';
      const spanId = service.createSpan(name);
      const beforeFinish = new Date();

      service.finishSpan(spanId);

      const spans = (service as any).spans;
      const span = spans.get(spanId);
      expect(span.endTime).toBeInstanceOf(Date);
      expect(span.endTime.getTime()).toBeGreaterThanOrEqual(
        beforeFinish.getTime(),
      );
    });

    it('should_handle_finishing_non_existent_span_gracefully', () => {
      const nonExistentSpanId = 'non-existent';

      expect(() => service.finishSpan(nonExistentSpanId)).not.toThrow();
    });
  });

  describe('setSpanTag', () => {
    it('should_set_tag_on_span', () => {
      const name = 'test-span';
      const spanId = service.createSpan(name);
      const key = 'http.method';
      const value = 'GET';

      service.setSpanTag(spanId, key, value);

      const spans = (service as any).spans;
      const span = spans.get(spanId);
      expect(span.tags[key]).toBe(value);
    });

    it('should_accumulate_multiple_tags', () => {
      const name = 'test-span';
      const spanId = service.createSpan(name);

      service.setSpanTag(spanId, 'tag1', 'value1');
      service.setSpanTag(spanId, 'tag2', 'value2');

      const spans = (service as any).spans;
      const span = spans.get(spanId);
      expect(span.tags.tag1).toBe('value1');
      expect(span.tags.tag2).toBe('value2');
    });

    it('should_overwrite_existing_tag', () => {
      const name = 'test-span';
      const spanId = service.createSpan(name);

      service.setSpanTag(spanId, 'tag', 'value1');
      service.setSpanTag(spanId, 'tag', 'value2');

      const spans = (service as any).spans;
      const span = spans.get(spanId);
      expect(span.tags.tag).toBe('value2');
    });
  });

  describe('setSpanError', () => {
    it('should_record_error_on_span', () => {
      const name = 'test-span';
      const spanId = service.createSpan(name);
      const error = new Error('Test error');

      service.setSpanError(spanId, error);

      const spans = (service as any).spans;
      const span = spans.get(spanId);
      expect(span.error).toBe(error);
      expect(span.tags['error']).toBe('true');
    });

    it('should_set_error_tag_when_error_recorded', () => {
      const name = 'test-span';
      const spanId = service.createSpan(name);
      const error = new Error('Test error');

      service.setSpanError(spanId, error);

      const spans = (service as any).spans;
      const span = spans.get(spanId);
      expect(span.tags['error']).toBe('true');
    });
  });
});
