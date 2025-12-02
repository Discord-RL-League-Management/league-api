import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ParseUUIDPipe } from './parse-uuid.pipe';

describe('ParseUUIDPipe', () => {
  let pipe: ParseUUIDPipe;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParseUUIDPipe],
    }).compile();

    pipe = module.get<ParseUUIDPipe>(ParseUUIDPipe);
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  describe('transform', () => {
    it('should return valid UUID v4', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const result = pipe.transform(validUUID);
      expect(result).toBe(validUUID);
    });

    it('should return valid UUID v1', () => {
      const validUUID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      const result = pipe.transform(validUUID);
      expect(result).toBe(validUUID);
    });

    it('should throw BadRequestException for invalid UUID format', () => {
      const invalidUUID = 'not-a-uuid';
      expect(() => pipe.transform(invalidUUID)).toThrow(BadRequestException);
      expect(() => pipe.transform(invalidUUID)).toThrow(
        'Invalid UUID format: not-a-uuid',
      );
    });

    it('should throw BadRequestException for empty string', () => {
      expect(() => pipe.transform('')).toThrow(BadRequestException);
      expect(() => pipe.transform('')).toThrow('Invalid UUID format: ');
    });

    it('should throw BadRequestException for malformed UUID', () => {
      const malformedUUID = '550e8400-e29b-41d4-a716';
      expect(() => pipe.transform(malformedUUID)).toThrow(BadRequestException);
      expect(() => pipe.transform(malformedUUID)).toThrow(
        `Invalid UUID format: ${malformedUUID}`,
      );
    });

    it('should throw BadRequestException for UUID with invalid characters', () => {
      const invalidUUID = '550e8400-e29b-41d4-a716-44665544000g';
      expect(() => pipe.transform(invalidUUID)).toThrow(BadRequestException);
    });
  });
});
