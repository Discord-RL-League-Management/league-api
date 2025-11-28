import * as Joi from 'joi';
import { trackerSegmentStatsSchema } from './tracker-segment.schema';

describe('trackerSegmentStatsSchema', () => {
  afterEach(() => {
    // Cleanup: Clear all mock usage data
    jest.clearAllMocks();
  });

  describe('validation behavior', () => {
    it('should validate valid stats structure with all fields', () => {
      // ARRANGE
      const validStats = {
        tier: {
          value: 15,
          displayValue: '15',
          metadata: {
            name: 'Champion',
            iconUrl: 'https://example.com/icon.png',
          },
        },
        division: {
          value: 3,
          displayValue: 'III',
          metadata: {
            name: 'Division III',
          },
        },
        rating: {
          value: 1250,
          displayValue: '1250',
        },
        matchesPlayed: {
          value: 150,
          displayValue: '150',
        },
        winStreak: {
          value: 5,
          displayValue: '5',
        },
      };

      // ACT
      const result = trackerSegmentStatsSchema.validate(validStats);

      // ASSERT
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(validStats);
    });

    it('should validate stats structure with missing optional fields', () => {
      // ARRANGE
      const statsWithMissingFields = {
        tier: {
          value: 10,
        },
        rating: {
          value: 1000,
        },
      };

      // ACT
      const result = trackerSegmentStatsSchema.validate(statsWithMissingFields);

      // ASSERT
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(statsWithMissingFields);
    });

    it('should validate stats structure with null values', () => {
      const statsWithNulls = {
        tier: null,
        division: null,
        rating: null,
        matchesPlayed: null,
        winStreak: null,
      };

      const result = trackerSegmentStatsSchema.validate(statsWithNulls);

      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(statsWithNulls);
    });

    it('should validate stats structure with empty object', () => {
      const emptyStats = {};

      const result = trackerSegmentStatsSchema.validate(emptyStats);

      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(emptyStats);
    });

    it('should validate stats structure with additional unknown fields', () => {
      const statsWithExtras = {
        tier: {
          value: 10,
          metadata: {
            name: 'Champion',
          },
        },
        unknownField: 'should be allowed',
        anotherField: 123,
      };

      const result = trackerSegmentStatsSchema.validate(statsWithExtras, {
        allowUnknown: true,
      });

      expect(result.error).toBeUndefined();
      expect(result.value).toHaveProperty('unknownField');
      expect(result.value).toHaveProperty('anotherField');
    });

    it('should validate stat field with missing metadata', () => {
      const statsWithoutMetadata = {
        tier: {
          value: 10,
          displayValue: '10',
        },
      };

      const result = trackerSegmentStatsSchema.validate(statsWithoutMetadata);

      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(statsWithoutMetadata);
    });

    it('should validate stat field with empty metadata', () => {
      const statsWithEmptyMetadata = {
        tier: {
          value: 10,
          metadata: {},
        },
      };

      const result = trackerSegmentStatsSchema.validate(statsWithEmptyMetadata);

      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(statsWithEmptyMetadata);
    });

    it('should validate stat field with null metadata.name', () => {
      const statsWithNullName = {
        tier: {
          value: 10,
          metadata: {
            name: null,
          },
        },
      };

      const result = trackerSegmentStatsSchema.validate(statsWithNullName);

      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(statsWithNullName);
    });

    it('should validate stat field with empty string metadata.name', () => {
      const statsWithEmptyName = {
        tier: {
          value: 10,
          metadata: {
            name: '',
          },
        },
      };

      const result = trackerSegmentStatsSchema.validate(statsWithEmptyName);

      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(statsWithEmptyName);
    });

    it('should validate stat field with null value', () => {
      const statsWithNullValue = {
        tier: {
          value: null,
          displayValue: 'N/A',
        },
      };

      const result = trackerSegmentStatsSchema.validate(statsWithNullValue);

      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(statsWithNullValue);
    });

    it('should validate stat field with additional metadata properties', () => {
      const statsWithExtraMetadata = {
        tier: {
          value: 10,
          metadata: {
            name: 'Champion',
            iconUrl: 'https://example.com/icon.png',
            tierName: 'Champion',
            customProperty: 'custom value',
          },
        },
      };

      const result = trackerSegmentStatsSchema.validate(statsWithExtraMetadata);

      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(statsWithExtraMetadata);
    });

    it('should invalidate stats when value is not a number or null', () => {
      // ARRANGE
      const invalidStats = {
        tier: {
          value: 'not-a-number',
          metadata: {
            name: 'Champion',
          },
        },
      };

      // ACT
      const result = trackerSegmentStatsSchema.validate(invalidStats, {
        abortEarly: false,
      });

      // ASSERT
      expect(result.error).toBeDefined();
      expect(result.error?.details).toBeDefined();
      expect(result.error?.details.length).toBeGreaterThan(0);
    });

    it('should invalidate stats when metadata.name is not a string or null', () => {
      const invalidStats = {
        tier: {
          value: 10,
          metadata: {
            name: 123, // Should be string or null
          },
        },
      };

      const result = trackerSegmentStatsSchema.validate(invalidStats, {
        abortEarly: false,
      });

      expect(result.error).toBeDefined();
      expect(result.error?.details).toBeDefined();
    });

    it('should invalidate stats when stat field is not an object', () => {
      const invalidStats = {
        tier: 'not-an-object',
      };

      const result = trackerSegmentStatsSchema.validate(invalidStats, {
        abortEarly: false,
      });

      expect(result.error).toBeDefined();
      expect(result.error?.details).toBeDefined();
    });

    it('should invalidate stats when stats is not an object', () => {
      const invalidStats = 'not-an-object';

      const result = trackerSegmentStatsSchema.validate(invalidStats, {
        abortEarly: false,
      });

      expect(result.error).toBeDefined();
      expect(result.error?.details).toBeDefined();
    });

    it('should provide detailed error messages for validation failures', () => {
      const invalidStats = {
        tier: {
          value: 'invalid',
          metadata: {
            name: 123,
          },
        },
      };

      const result = trackerSegmentStatsSchema.validate(invalidStats, {
        abortEarly: false,
      });

      expect(result.error).toBeDefined();
      expect(result.error?.details).toBeDefined();
      expect(result.error?.details.length).toBeGreaterThan(0);
      expect(result.error?.details[0].message).toBeDefined();
    });
  });
});
