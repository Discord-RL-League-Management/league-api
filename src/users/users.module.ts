import { Module } from '@nestjs/common';
import { InternalUsersController } from './internal-users.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserTransformer } from './transformers/user.transformer';
import { UserRepository } from './repositories/user.repository';
import { UserOrchestratorService } from './services/user-orchestrator.service';
import { EncryptionModule } from '../common/encryption.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

@Module({
  imports: [EncryptionModule, PrismaModule, InfrastructureModule],
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
