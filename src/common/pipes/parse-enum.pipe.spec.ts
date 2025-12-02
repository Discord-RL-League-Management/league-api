import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ArgumentMetadata } from '@nestjs/common';
import { ParseEnumPipe } from './parse-enum.pipe';

enum TestEnum {
  VALUE1 = 'VALUE1',
  VALUE2 = 'VALUE2',
  VALUE3 = 'VALUE3',
}

enum NumberEnum {
  ONE = 1,
  TWO = 2,
  THREE = 3,
}

describe('ParseEnumPipe', () => {
  let pipe: ParseEnumPipe<typeof TestEnum>;
  const mockMetadata: ArgumentMetadata = {
    type: 'query',
    data: undefined,
    metatype: String,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ParseEnumPipe,
          useFactory: () => new ParseEnumPipe(TestEnum),
        },
      ],
    }).compile();

    pipe = module.get<ParseEnumPipe<typeof TestEnum>>(ParseEnumPipe);
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  describe('transform', () => {
    it('should return valid enum value', () => {
      const result = pipe.transform('VALUE1', mockMetadata);
      expect(result).toBe(TestEnum.VALUE1);
    });

    it('should return valid enum value for different cases', () => {
      const result1 = pipe.transform('VALUE2', mockMetadata);
      expect(result1).toBe(TestEnum.VALUE2);

      const result2 = pipe.transform('VALUE3', mockMetadata);
      expect(result2).toBe(TestEnum.VALUE3);
    });

    it('should return undefined for undefined input', () => {
      const result = pipe.transform(undefined, mockMetadata);
      expect(result).toBeUndefined();
    });

    it('should return undefined for null input', () => {
      const result = pipe.transform(null as any, mockMetadata);
      expect(result).toBeUndefined();
    });

    it('should throw BadRequestException for invalid enum value', () => {
      expect(() => pipe.transform('INVALID_VALUE', mockMetadata)).toThrow(
        BadRequestException,
      );
      expect(() => pipe.transform('INVALID_VALUE', mockMetadata)).toThrow(
        'Invalid enum value: INVALID_VALUE',
      );
    });

    it('should throw BadRequestException for empty string', () => {
      expect(() => pipe.transform('', mockMetadata)).toThrow(BadRequestException);
      expect(() => pipe.transform('', mockMetadata)).toThrow('Invalid enum value: ');
    });

    it('should work with different enum types', () => {
      const numberPipe = new ParseEnumPipe(NumberEnum);
      const result = numberPipe.transform('1', mockMetadata);
      expect(result).toBe(NumberEnum.ONE);
    });

    it('should handle case-sensitive enum values', () => {
      expect(() => pipe.transform('value1', mockMetadata)).toThrow(BadRequestException);
      expect(() => pipe.transform('VALUE1', mockMetadata)).not.toThrow();
    });
  });
});
