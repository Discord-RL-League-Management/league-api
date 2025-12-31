/**
 * Guild Factory
 *
 * Synthetic data factory for creating test guild data.
 * Aligned with ISO/IEC/IEEE 29119 standards for Test Data Management.
 */

export interface GuildFactoryData {
  id?: string;
  name?: string;
  icon?: string;
  ownerId?: string;
  isActive?: boolean;
}

/**
 * Creates synthetic guild data for testing
 *
 * @param overrides - Optional overrides for default values
 * @returns Guild data object
 */
export function createGuildData(
  overrides: GuildFactoryData = {},
): GuildFactoryData {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10000);

  return {
    id: `guild_${timestamp}_${randomSuffix}`,
    name: `Test Guild ${randomSuffix}`,
    icon: `guild_icon_${randomSuffix}`,
    ownerId: `owner_${timestamp}_${randomSuffix}`,
    isActive: true,
    ...overrides,
  };
}

/**
 * Creates multiple synthetic guilds
 *
 * @param count - Number of guilds to create
 * @returns Array of guild data objects
 */
export function createMultipleGuilds(count: number): GuildFactoryData[] {
  return Array.from({ length: count }, () => createGuildData());
}

