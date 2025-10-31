import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../../users/users.module';
import { TokenManagementService } from './token-management.service';

@Module({
  imports: [HttpModule, ConfigModule, UsersModule],
  providers: [TokenManagementService],
  exports: [TokenManagementService],
})
export class TokenManagementModule {}
