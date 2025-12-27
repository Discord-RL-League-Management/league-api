import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../../users/users.module';
import { TokenManagementService } from './token-management.service';
import { TokenProviderAdapter } from '../../auth/adapters/token-provider.adapter';

@Module({
  imports: [HttpModule, ConfigModule, UsersModule],
  providers: [TokenManagementService, TokenProviderAdapter],
  exports: [TokenManagementService, TokenProviderAdapter],
})
export class TokenManagementModule {}
