/**
 * ParseEnumPipe Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ParseEnumPipe } from '@/common/pipes/parse-enum.pipe';

enum TestStringEnum {
  VALUE1 = 'value1',
  VALUE2 = 'value2',
  VALUE3 = 'value3',
}

enum TestNumericEnum {
  ZERO = 0,
  ONE = 1,
  TWO = 2,
}

describe('ParseEnumPipe', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('string enum', () => {
    it('should_return_enum_value_when_valid_string_provided', () => {
      // ARRANGE
      const pipe = new ParseEnumPipe(TestStringEnum);
      const value = 'value1';

      // ACT
      const result = pipe.transform(value, {} as any);

      // ASSERT
      expect(result).toBe(TestStringEnum.VALUE1);
    });

    it('should_return_undefined_when_value_is_undefined', () => {
      // ARRANGE
      const pipe = new ParseEnumPipe(TestStringEnum);
      const value = undefined;

      // ACT
      const result = pipe.transform(value, {} as any);

      // ASSERT
      expect(result).toBeUndefined();
    });

    it('should_return_undefined_when_value_is_null', () => {
      // ARRANGE
      const pipe = new ParseEnumPipe(TestStringEnum);
      const value = null as any;

      // ACT
      const result = pipe.transform(value, {} as any);

      // ASSERT
      expect(result).toBeUndefined();
    });

    it('should_throw_BadRequestException_when_invalid_string_provided', () => {
      // ARRANGE
      const pipe = new ParseEnumPipe(TestStringEnum);
      const value = 'invalid_value';

      // ACT & ASSERT
      expect(() => pipe.transform(value, {} as any)).toThrow(
        BadRequestException,
      );
      expect(() => pipe.transform(value, {} as any)).toThrow(
        'Invalid enum value: invalid_value',
      );
    });
  });

  describe('numeric enum', () => {
    it('should_return_enum_value_when_valid_number_string_provided', () => {
      // ARRANGE
      const pipe = new ParseEnumPipe(TestNumericEnum);
      const value = '1';

      // ACT
      const result = pipe.transform(value, {} as any);

      // ASSERT
      expect(result).toBe(TestNumericEnum.ONE);
    });

    it('should_return_enum_value_when_valid_number_provided', () => {
      // ARRANGE
      const pipe = new ParseEnumPipe(TestNumericEnum);
      const value = '0';

      // ACT
      const result = pipe.transform(value, {} as any);

      // ASSERT
      expect(result).toBe(TestNumericEnum.ZERO);
    });

    it('should_throw_BadRequestException_when_invalid_number_provided', () => {
      // ARRANGE
      const pipe = new ParseEnumPipe(TestNumericEnum);
      const value = '999';

      // ACT & ASSERT
      expect(() => pipe.transform(value, {} as any)).toThrow(
        BadRequestException,
      );
    });

    it('should_throw_BadRequestException_when_non_numeric_string_provided', () => {
      // ARRANGE
      const pipe = new ParseEnumPipe(TestNumericEnum);
      const value = 'not_a_number';

      // ACT & ASSERT
      expect(() => pipe.transform(value, {} as any)).toThrow(
        BadRequestException,
      );
    });
  });
});
