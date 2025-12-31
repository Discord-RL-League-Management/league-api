import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

@Global()
@Module({
  imports: [InfrastructureModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
