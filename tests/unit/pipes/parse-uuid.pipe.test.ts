/**
 * ParseUuidPipe Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ParseUUIDPipe } from '@/common/pipes/parse-uuid.pipe';

describe('ParseUUIDPipe', () => {
  let pipe: ParseUUIDPipe;

  beforeEach(() => {
    // ARRANGE: Setup test dependencies
    pipe = new ParseUUIDPipe();
  });

  it('should_return_valid_uuid_v4', () => {
    // ARRANGE
    const value = '550e8400-e29b-41d4-a716-446655440000';

    // ACT
    const result = pipe.transform(value);

    // ASSERT
    expect(result).toBe(value);
  });

  it('should_return_valid_uuid_v1', () => {
    // ARRANGE
    const value = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

    // ACT
    const result = pipe.transform(value);

    // ASSERT
    expect(result).toBe(value);
  });

  it('should_throw_BadRequestException_when_uuid_invalid_format', () => {
    // ARRANGE
    const value = 'not-a-uuid';

    // ACT & ASSERT
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
    expect(() => pipe.transform(value)).toThrow('Invalid UUID format');
  });

  it('should_throw_BadRequestException_when_uuid_missing_segments', () => {
    // ARRANGE
    const value = '550e8400-e29b-41d4-a716';

    // ACT & ASSERT
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });

  it('should_throw_BadRequestException_when_uuid_has_invalid_characters', () => {
    // ARRANGE
    const value = '550e8400-e29b-41d4-a716-44665544000g';

    // ACT & ASSERT
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });

  it('should_throw_BadRequestException_when_uuid_too_short', () => {
    // ARRANGE
    const value = '550e8400-e29b-41d4-a716-44665544000';

    // ACT & ASSERT
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
