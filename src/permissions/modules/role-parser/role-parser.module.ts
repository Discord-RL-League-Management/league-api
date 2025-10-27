import { Module } from '@nestjs/common';
import { RoleParserService } from './role-parser.service';

@Module({
  providers: [RoleParserService],
  exports: [RoleParserService],
})
export class RoleParserModule {}

