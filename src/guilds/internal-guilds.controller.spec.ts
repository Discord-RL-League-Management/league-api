import { Test, TestingModule } from '@nestjs/testing';
import { InternalGuildsController } from './internal-guilds.controller';
import { GuildsService } from './guilds.service';
import { GuildSettingsService } from './guild-settings.service';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { createMockGuildsService, createMockGuildSettingsService } from '../../test/setup/test-helpers';

describe('InternalGuildsController', () => {
  let controller: InternalGuildsController;
  let guildsService: jest.Mocked<GuildsService>;
  let guildSettingsService: jest.Mocked<GuildSettingsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalGuildsController],
      providers: [
        {
          provide: GuildsService,
          useValue: createMockGuildsService(),
        },
        {
          provide: GuildSettingsService,
          useValue: createMockGuildSettingsService(),
        },
      ],
    })
      .overrideGuard(BotAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<InternalGuildsController>(InternalGuildsController);
    guildsService = module.get<GuildsService>(GuildsService) as jest.Mocked<GuildsService>;
    guildSettingsService = module.get<GuildSettingsService>(GuildSettingsService) as jest.Mocked<GuildSettingsService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication and Authorization', () => {
    it('should have BotAuthGuard applied', () => {
      // Arrange
      const guards = Reflect.getMetadata('__guards__', InternalGuildsController);

      // Assert
      expect(guards).toContain(BotAuthGuard);
    });

    it('should skip throttling', () => {
      // Arrange
      const skipThrottle = Reflect.getMetadata('__skipThrottle__', InternalGuildsController);

      // Assert
      expect(skipThrottle).toBe(true);
    });
  });
});
