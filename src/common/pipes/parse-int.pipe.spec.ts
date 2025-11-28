import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ParseIntPipeWithError } from './parse-int.pipe';

describe('ParseIntPipeWithError', () => {
  let pipe: ParseIntPipeWithError;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParseIntPipeWithError],
    }).compile();

    pipe = module.get<ParseIntPipeWithError>(ParseIntPipeWithError);
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  describe('transform', () => {
    it('should return valid integer from string', () => {
      const result = pipe.transform('123', {} as any);
      expect(result).toBe(123);
    });

    it('should return valid negative integer', () => {
      const result = pipe.transform('-456', {} as any);
      expect(result).toBe(-456);
    });

    it('should return zero', () => {
      const result = pipe.transform('0', {} as any);
      expect(result).toBe(0);
    });

    it('should throw BadRequestException for non-numeric string', () => {
      expect(() => pipe.transform('abc', {} as any)).toThrow(BadRequestException);
      expect(() => pipe.transform('abc', {} as any)).toThrow(/Invalid integer/);
    });

    it('should throw BadRequestException for decimal number', () => {
      expect(() => pipe.transform('123.45', {} as any)).toThrow(BadRequestException);
      expect(() => pipe.transform('123.45', {} as any)).toThrow(/Invalid integer/);
    });

    it('should throw BadRequestException for empty string', () => {
      expect(() => pipe.transform('', {} as any)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for string with spaces', () => {
      expect(() => pipe.transform('  123  ', {} as any)).toThrow(BadRequestException);
    });

    it('should handle large integers', () => {
      const result = pipe.transform('999999999', {} as any);
      expect(result).toBe(999999999);
    });
  });
});

