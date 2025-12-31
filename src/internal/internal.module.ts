import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { InternalTrackerController } from './internal-tracker.controller';
import { InternalScheduledProcessingController } from './controllers/internal-scheduled-processing.controller';
import { TrackersModule } from '../trackers/trackers.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

@Module({
  imports: [TrackersModule, InfrastructureModule],
  controllers: [
    InternalController,
    InternalTrackerController,
    InternalScheduledProcessingController,
  ],
})
export class InternalModule {}
