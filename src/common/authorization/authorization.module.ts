import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthorizationService } from './services/authorization/authorization.service';
import { SystemAdminGuard } from './guards/system-admin/system-admin.guard';
import { ResourceOwnershipGuard } from './guards/resource-ownership/resource-ownership.guard';
import { InfrastructureModule } from '../../infrastructure/infrastructure.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { RequestContextModule } from '../request-context/request-context.module';

@Module({
  imports: [
    ConfigModule,
    InfrastructureModule, // For ActivityLogService
    PrismaModule,
    RequestContextModule, // For RequestContextService
  ],
  providers: [AuthorizationService, SystemAdminGuard, ResourceOwnershipGuard],
  exports: [AuthorizationService, SystemAdminGuard, ResourceOwnershipGuard],
})
export class AuthorizationModule {}
