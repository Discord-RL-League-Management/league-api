import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { UserStatisticsService } from './services/user-statistics.service';
import { UserSettingsService } from './services/user-settings.service';
import { UsersModule } from '../users/users.module';
import { GuildMembersModule } from '../guild-members/guild-members.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [UsersModule, GuildMembersModule, PrismaModule],
  controllers: [ProfileController],
  providers: [ProfileService, UserStatisticsService, UserSettingsService],
  exports: [ProfileService],
})
export class ProfileModule {}
