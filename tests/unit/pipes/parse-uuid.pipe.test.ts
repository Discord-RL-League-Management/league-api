/**
 * ParseUuidPipe Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ParseUUIDPipe } from '@/common/pipes/parse-uuid.pipe';

describe('ParseUUIDPipe', () => {
  let pipe: ParseUUIDPipe;

  beforeEach(() => {
    pipe = new ParseUUIDPipe();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should_return_valid_uuid_v4', () => {
    const value = '550e8400-e29b-41d4-a716-446655440000';

    const result = pipe.transform(value);

    expect(result).toBe(value);
  });

  it('should_return_valid_uuid_v1', () => {
    const value = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

    const result = pipe.transform(value);

    expect(result).toBe(value);
  });

  it('should_throw_BadRequestException_when_uuid_invalid_format', () => {
    const value = 'not-a-uuid';

    expect(() => pipe.transform(value)).toThrow(BadRequestException);
    expect(() => pipe.transform(value)).toThrow('Invalid UUID format');
  });

  it('should_throw_BadRequestException_when_uuid_missing_segments', () => {
    const value = '550e8400-e29b-41d4-a716';

    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });

  it('should_throw_BadRequestException_when_uuid_has_invalid_characters', () => {
    const value = '550e8400-e29b-41d4-a716-44665544000g';

    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });

  it('should_throw_BadRequestException_when_uuid_too_short', () => {
    const value = '550e8400-e29b-41d4-a716-44665544000';

    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
