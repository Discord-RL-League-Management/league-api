import { Module } from '@nestjs/common';
import { InternalUsersController, UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [InternalUsersController, UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
