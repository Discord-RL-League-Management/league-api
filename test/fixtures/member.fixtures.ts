/**
 * API Test Fixtures
 * Factory functions for creating mock Prisma data and API responses
 * Used across all API tests for consistent test data
 */

export const apiFixtures = {
  /**
   * Create a mock Prisma member record
   */
  createMockMember: (overrides: any = {}): any => ({
    id: 'member_123',
    userId: '123456789012345678',
    guildId: '987654321098765432',
    username: 'testuser',
    roles: ['111111111111111111', '222222222222222222'],
    joinedAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    user: {
      id: '123456789012345678',
      username: 'testuser',
      globalName: 'Test User',
      avatar: 'avatar_hash',
      lastLoginAt: new Date('2024-01-01T00:00:00Z'),
    },
    ...overrides,
  }),

  /**
   * Create a member without avatar
   */
  createMemberWithoutAvatar: (): any => ({
    id: 'member_123',
    userId: '123456789012345678',
    guildId: '987654321098765432',
    username: 'testuser',
    roles: ['111111111111111111'],
    joinedAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    user: {
      id: '123456789012345678',
      username: 'testuser',
      globalName: 'Test User',
      avatar: null,
      lastLoginAt: new Date('2024-01-01T00:00:00Z'),
    },
  }),

  /**
   * Create a member with no roles
   */
  createMemberWithNoRoles: (): any => ({
    id: 'member_123',
    userId: '123456789012345678',
    guildId: '987654321098765432',
    username: 'testuser',
    roles: [],
    joinedAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    user: {
      id: '123456789012345678',
      username: 'testuser',
      globalName: 'Test User',
      avatar: 'avatar_hash',
      lastLoginAt: new Date('2024-01-01T00:00:00Z'),
    },
  }),

  /**
   * Create an array of members for pagination testing
   */
  createMemberList: (count: number = 5): any[] => {
    const members: any[] = [];
    for (let i = 0; i < count; i++) {
      members.push(apiFixtures.createMockMember({
        id: `member_${i + 1}`,
        userId: `${123456789012345678 + i}`,
        username: `user${i + 1}`,
        user: {
          id: `${123456789012345678 + i}`,
          username: `user${i + 1}`,
          globalName: `User ${i + 1}`,
          avatar: `avatar_${i + 1}`,
          lastLoginAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`),
        },
      }));
    }
    return members;
  },

  /**
   * Create pagination metadata
   */
  createPaginationResponse: (page: number = 1, limit: number = 20, total: number = 100): any => ({
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  }),

  /**
   * Create a complete paginated member list response
   */
  createMemberListResponse: (page: number = 1, limit: number = 20, total: number = 100): any => ({
    members: apiFixtures.createMemberList(Math.min(limit, total - (page - 1) * limit)),
    pagination: apiFixtures.createPaginationResponse(page, limit, total),
  }),

  /**
   * Create member statistics response
   */
  createMemberStats: (overrides: any = {}): any => ({
    totalMembers: 100,
    activeMembers: 75, // Updated in last 7 days
    newThisWeek: 5, // Joined in last 7 days
    ...overrides,
  }),

  /**
   * Create empty member statistics
   */
  createEmptyMemberStats: (): any => ({
    totalMembers: 0,
    activeMembers: 0,
    newThisWeek: 0,
  }),

  /**
   * Create search results with query
   */
  createSearchResults: (query: string, count: number = 3): any => ({
    members: apiFixtures.createMemberList(count).map((member, index) => ({
      ...member,
      username: `${query}_user${index + 1}`,
      user: {
        ...member.user,
        username: `${query}_user${index + 1}`,
      },
    })),
    pagination: apiFixtures.createPaginationResponse(1, 20, count),
  }),

  /**
   * Create empty search results
   */
  createEmptySearchResults: (): any => ({
    members: [],
    pagination: apiFixtures.createPaginationResponse(1, 20, 0),
  }),

  /**
   * Create valid CreateGuildMemberDto
   */
  createCreateMemberDTO: (overrides: any = {}): any => ({
    userId: '123456789012345678',
    guildId: '987654321098765432',
    username: 'testuser',
    roles: ['111111111111111111', '222222222222222222'],
    ...overrides,
  }),

  /**
   * Create invalid CreateGuildMemberDto (missing required fields)
   */
  createInvalidCreateMemberDTO: (): any => ({
    username: 'testuser',
    // Missing userId, guildId
  }),

  /**
   * Create valid UpdateGuildMemberDto
   */
  createUpdateMemberDTO: (overrides: any = {}): any => ({
    username: 'updateduser',
    roles: ['111111111111111111', '333333333333333333'],
    ...overrides,
  }),

  /**
   * Create mock guild for validation
   */
  createMockGuild: (overrides: any = {}): any => ({
    id: '987654321098765432',
    name: 'Test Guild',
    ...overrides,
  }),

  /**
   * Create mock user for validation
   */
  createMockUser: (overrides: any = {}): any => ({
    id: '123456789012345678',
    username: 'testuser',
    ...overrides,
  }),

  /**
   * Create mock Prisma transaction
   */
  createMockTransaction: (): any => ({
    guildMember: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  }),

  /**
   * Create mock Prisma service with common methods
   */
  createMockPrismaService: (): any => ({
    guild: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    guildMember: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  }),

  /**
   * Create mock GuildsService
   */
  createMockGuildsService: (): any => ({
    exists: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findActiveGuildIds: jest.fn(),
    upsert: jest.fn(),
    syncGuildWithMembers: jest.fn(),
  }),

  /**
   * Create mock UsersService
   */
  createMockUsersService: (): any => ({
    exists: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  }),

  /**
   * Create API error response
   */
  createApiError: (statusCode: number = 500, message: string = 'Internal Server Error'): any => ({
    statusCode,
    message,
    error: 'Internal Server Error',
  }),

  /**
   * Create validation error response
   */
  createValidationError: (): any => ({
    statusCode: 400,
    message: 'Validation failed',
    error: 'Bad Request',
    details: [
      {
        field: 'userId',
        message: 'userId should not be empty',
      },
    ],
  }),

  /**
   * Create not found error response
   */
  createNotFoundError: (resource: string = 'Member'): any => ({
    statusCode: 404,
    message: `${resource} not found`,
    error: 'Not Found',
  }),

  /**
   * Create unauthorized error response
   */
  createUnauthorizedError: (): any => ({
    statusCode: 401,
    message: 'Unauthorized',
    error: 'Unauthorized',
  }),

  /**
   * Create forbidden error response
   */
  createForbiddenError: (): any => ({
    statusCode: 403,
    message: 'Forbidden',
    error: 'Forbidden',
  }),

  /**
   * Create sync members data for bulk operations
   */
  createSyncMembersData: (count: number = 3): any => ({
    members: Array.from({ length: count }, (_, i) => ({
      userId: `${123456789012345678 + i}`,
      username: `user${i + 1}`,
      roles: [`11111111111111111${i}`],
    })),
  }),

  /**
   * Create mock request object for controller tests
   */
  createMockRequest: (overrides: any = {}): any => ({
    params: {
      guildId: '987654321098765432',
      userId: '123456789012345678',
    },
    query: {
      page: '1',
      limit: '20',
      q: 'test',
    },
    body: {},
    user: {
      id: '123456789012345678',
      username: 'testuser',
    },
    ...overrides,
  }),

  /**
   * Create mock response object for controller tests
   */
  createMockResponse: (): any => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  }),

  /**
   * Create dates for testing 7-day windows
   */
  createDateRange: () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    
    return {
      now,
      sevenDaysAgo,
      threeDaysAgo,
      oneDayAgo,
    };
  },

  /**
   * Create members with different activity dates
   */
  createMembersWithActivityDates: (): any[] => {
    const dates = apiFixtures.createDateRange();
    
    return [
      // Active member (updated recently)
      apiFixtures.createMockMember({
        id: 'member_active',
        updatedAt: dates.oneDayAgo,
      }),
      // Inactive member (updated long ago)
      apiFixtures.createMockMember({
        id: 'member_inactive',
        updatedAt: dates.sevenDaysAgo,
      }),
      // New member (joined recently)
      apiFixtures.createMockMember({
        id: 'member_new',
        joinedAt: dates.threeDaysAgo,
        updatedAt: dates.threeDaysAgo,
      }),
    ];
  },
};
