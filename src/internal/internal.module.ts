import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { InternalTrackerController } from './internal-tracker.controller';
import { InternalScheduledProcessingController } from './controllers/internal-scheduled-processing.controller';
import { TrackersModule } from '../trackers/trackers.module';

@Module({
  imports: [TrackersModule],
  controllers: [
    InternalController,
    InternalTrackerController,
    InternalScheduledProcessingController,
  ],
})
export class InternalModule {}
