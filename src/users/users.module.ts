import { Module } from '@nestjs/common';
import { InternalUsersController, UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [InternalUsersController, UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
