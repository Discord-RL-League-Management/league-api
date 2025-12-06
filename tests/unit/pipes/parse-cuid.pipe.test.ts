/**
 * ParseCuidPipe Unit Tests
 * 
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ParseCUIDPipe } from '@/common/pipes/parse-cuid.pipe';

describe('ParseCUIDPipe', () => {
  let pipe: ParseCUIDPipe;

  beforeEach(() => {
    // ARRANGE: Setup test dependencies
    pipe = new ParseCUIDPipe();
  });

  it('should_return_valid_cuid', () => {
    // ARRANGE
    const value = 'clx1234567890abcdefghijkl';

    // ACT
    const result = pipe.transform(value);

    // ASSERT
    expect(result).toBe(value);
  });

  it('should_throw_BadRequestException_when_cuid_too_short', () => {
    // ARRANGE
    const value = 'clx123';

    // ACT & ASSERT
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
    expect(() => pipe.transform(value)).toThrow('Invalid CUID format');
  });

  it('should_throw_BadRequestException_when_cuid_too_long', () => {
    // ARRANGE
    const value = 'clx1234567890abcdefghijklmnop';

    // ACT & ASSERT
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });

  it('should_throw_BadRequestException_when_cuid_does_not_start_with_c', () => {
    // ARRANGE
    const value = 'xlx1234567890abcdefghijkl';

    // ACT & ASSERT
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });

  it('should_throw_BadRequestException_when_cuid_contains_invalid_characters', () => {
    // ARRANGE
    const value = 'clx1234567890ABCDEFGHIJKL';

    // ACT & ASSERT
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });

  it('should_throw_BadRequestException_when_cuid_contains_special_characters', () => {
    // ARRANGE
    const value = 'clx1234567890-abcdefghijkl';

    // ACT & ASSERT
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});

