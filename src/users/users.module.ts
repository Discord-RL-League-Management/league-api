import { Module, forwardRef } from '@nestjs/common';
import { InternalUsersController } from './internal-users.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserTransformer } from './transformers/user.transformer';
import { UserRepository } from './repositories/user.repository';
import { UserOrchestratorService } from './services/user-orchestrator.service';
import { EncryptionModule } from '../common/encryption.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TrackersModule } from '../trackers/trackers.module';
import { GuildsModule } from '../guilds/guilds.module';
import { DiscordModule } from '../discord/discord.module';
import { PermissionCheckModule } from '../permissions/modules/permission-check/permission-check.module';

@Module({
  imports: [
    EncryptionModule,
    PrismaModule,
    // INTENTIONAL: Circular dependency with TrackersModule is properly handled.
    // - UsersModule needs TrackerProcessingService for registerByStaff endpoint in InternalUsersController
    // - TrackersModule needs UsersService for tracker user operations (via TrackerUserOrchestratorService)
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => TrackersModule),
    // INTENTIONAL: Circular dependency with GuildsModule is properly handled.
    // - UsersModule needs GuildSettingsService for registerByStaff endpoint in InternalUsersController
    // - GuildsModule needs TokenManagementModule which depends on UsersModule, creating a cycle
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => GuildsModule),
    DiscordModule,
    PermissionCheckModule,
  ],
  controllers: [InternalUsersController, UsersController],
  providers: [
    UsersService,
    UserTransformer,
    UserRepository,
    UserOrchestratorService,
  ],
  exports: [UsersService, UserOrchestratorService, UserRepository],
})
export class UsersModule {}
