import { Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { ResourceOwnershipGuard } from './guards/resource-ownership.guard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [EncryptionService, ResourceOwnershipGuard],
  exports: [EncryptionService, ResourceOwnershipGuard],
})
export class CommonModule {}
