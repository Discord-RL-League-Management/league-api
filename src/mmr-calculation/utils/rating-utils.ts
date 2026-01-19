/**
 * Round number to nearest 25
 * Used for ASCENDANCY salary calculation
 *
 * @param value - Number to round
 * @returns Number rounded to nearest 25
 *
 * @example
 * roundToNearest25(1269.04) // Returns 1275
 * roundToNearest25(1692.525) // Returns 1700
 * roundToNearest25(1406.28) // Returns 1400
 */
export function roundToNearest25(value: number): number {
  return Math.round(value / 25) * 25;
}
