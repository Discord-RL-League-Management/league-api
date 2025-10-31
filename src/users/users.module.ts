import { Module } from '@nestjs/common';
import { InternalUsersController } from './internal-users.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserTransformer } from './transformers/user.transformer';
import { UserRepository } from './repositories/user.repository';
import { UserOrchestratorService } from './services/user-orchestrator.service';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [CommonModule, PrismaModule],
  controllers: [InternalUsersController, UsersController],
  providers: [
    UsersService,
    UserTransformer,
    UserRepository,
    UserOrchestratorService,
  ],
  exports: [UsersService, UserOrchestratorService],
})
export class UsersModule {}
