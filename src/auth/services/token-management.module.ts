import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../../common/common.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { TokenManagementService } from './token-management.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    CommonModule,
    PrismaModule,
  ],
  providers: [TokenManagementService],
  exports: [TokenManagementService],
})
export class TokenManagementModule {}
