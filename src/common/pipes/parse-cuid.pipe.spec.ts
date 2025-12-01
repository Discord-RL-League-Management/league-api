import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ParseCUIDPipe } from './parse-cuid.pipe';

describe('ParseCUIDPipe', () => {
  let pipe: ParseCUIDPipe;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParseCUIDPipe],
    }).compile();

    pipe = module.get<ParseCUIDPipe>(ParseCUIDPipe);
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  describe('transform', () => {
    it('should return valid CUID', () => {
      const validCUID = 'clx1234567890abcdefghijkl';
      const result = pipe.transform(validCUID);
      expect(result).toBe(validCUID);
    });

    it('should return valid CUID with all lowercase letters', () => {
      const validCUID = 'cabcdefghijklmnopqrstuvwx';
      const result = pipe.transform(validCUID);
      expect(result).toBe(validCUID);
    });

    it('should return valid CUID with numbers', () => {
      const validCUID = 'c123456789012345678901234';
      const result = pipe.transform(validCUID);
      expect(result).toBe(validCUID);
    });

    it('should throw BadRequestException for invalid CUID format - missing c prefix', () => {
      const invalidCUID = 'lx1234567890abcdefghijkl';
      expect(() => pipe.transform(invalidCUID)).toThrow(BadRequestException);
      expect(() => pipe.transform(invalidCUID)).toThrow(
        'Invalid CUID format: lx1234567890abcdefghijkl',
      );
    });

    it('should throw BadRequestException for invalid CUID format - uppercase letters', () => {
      const invalidCUID = 'cLX1234567890ABCDEFGHIJKL';
      expect(() => pipe.transform(invalidCUID)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid CUID format - wrong length', () => {
      const invalidCUID = 'clx1234567890abcdefghijk'; // 24 chars instead of 25
      expect(() => pipe.transform(invalidCUID)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid CUID format - too long', () => {
      const invalidCUID = 'clx1234567890abcdefghijklm'; // 26 chars
      expect(() => pipe.transform(invalidCUID)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for empty string', () => {
      expect(() => pipe.transform('')).toThrow(BadRequestException);
      expect(() => pipe.transform('')).toThrow('Invalid CUID format: ');
    });

    it('should throw BadRequestException for UUID format', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(() => pipe.transform(uuid)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid characters', () => {
      const invalidCUID = 'clx1234567890abcdefghij-k';
      expect(() => pipe.transform(invalidCUID)).toThrow(BadRequestException);
    });
  });
});


