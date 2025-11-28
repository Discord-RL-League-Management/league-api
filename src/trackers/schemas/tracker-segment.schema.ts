import * as Joi from 'joi';

// Validates stat field structure to prevent runtime errors when accessing nested properties
const statFieldSchema = Joi.object({
  value: Joi.number().optional().allow(null),
  displayValue: Joi.string().optional().allow(null, ''),
  metadata: Joi.object({
    name: Joi.string().optional().allow(null, ''),
    iconUrl: Joi.string().optional().allow(null, ''),
    tierName: Joi.string().optional().allow(null, ''),
  })
    .unknown(true) // Allow other metadata properties
    .optional()
    .allow(null),
}).unknown(true); // Allow other properties on stat fields

// Validates stats structure before accessing nested properties to prevent runtime errors from API changes
export const trackerSegmentStatsSchema = Joi.object({
  tier: statFieldSchema.optional().allow(null),
  division: statFieldSchema.optional().allow(null),
  rating: statFieldSchema.optional().allow(null),
  matchesPlayed: statFieldSchema.optional().allow(null),
  winStreak: statFieldSchema.optional().allow(null),
}).unknown(true); // Allow other stat fields that we don't explicitly validate
