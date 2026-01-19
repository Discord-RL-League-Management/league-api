import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../../users/users.module';
import { TokenManagementService } from './token-management.service';
import { TokenProviderAdapter } from '../../auth/adapters/token-provider.adapter';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    // INTENTIONAL: Circular dependency with UsersModule is properly handled.
    // - TokenManagementModule needs UsersService for token operations (getUserTokens, updateUserTokens)
    // - UsersModule needs TokenManagementService indirectly through GuildsModule which imports TokenManagementModule
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => UsersModule),
  ],
  providers: [TokenManagementService, TokenProviderAdapter],
  exports: [TokenManagementService, TokenProviderAdapter],
})
export class TokenManagementModule {}
