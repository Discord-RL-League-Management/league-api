import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { InternalTrackerController } from './internal-tracker.controller';
import { TrackersModule } from '../trackers/trackers.module';

@Module({
  imports: [TrackersModule],
  controllers: [InternalController, InternalTrackerController],
})
export class InternalModule {}
