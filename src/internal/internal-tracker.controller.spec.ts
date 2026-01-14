/**
 * InternalTrackerController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { InternalTrackerController } from './internal-tracker.controller';
import { TrackerProcessingService } from '../trackers/services/tracker-processing.service';
import { InternalRegisterTrackersDto } from './dto/register-trackers.dto';
import { InternalAddTrackerDto } from './dto/add-tracker.dto';
import { ProcessTrackersDto } from './dto/process-trackers.dto';

describe('InternalTrackerController', () => {
  let controller: InternalTrackerController;
  let mockTrackerProcessingService: TrackerProcessingService;

  beforeEach(async () => {
    mockTrackerProcessingService = {
      registerTrackers: vi.fn(),
      addTracker: vi.fn(),
      processPendingTrackers: vi.fn(),
      processPendingTrackersForGuild: vi.fn(),
    } as unknown as TrackerProcessingService;

    const module = await Test.createTestingModule({
      controllers: [InternalTrackerController],
      providers: [
        {
          provide: TrackerProcessingService,
          useValue: mockTrackerProcessingService,
        },
      ],
    }).compile();

    controller = module.get<InternalTrackerController>(
      InternalTrackerController,
    );
  });

  describe('registerTrackers', () => {
    it('should_register_trackers_when_valid_data_is_provided', async () => {
      const registerDto: InternalRegisterTrackersDto = {
        userId: 'user-123',
        urls: ['https://tracker.gg/profile/test'],
        userData: {
          username: 'testuser',
          globalName: 'Test User',
          avatar: 'avatar_hash',
        },
        channelId: 'channel-123',
        interactionToken: 'token-123',
      };

      const mockResult = { success: true };
      vi.spyOn(
        mockTrackerProcessingService,
        'registerTrackers',
      ).mockResolvedValue(mockResult as never);

      const result = await controller.registerTrackers(registerDto);

      expect(result).toEqual(mockResult);
      expect(
        mockTrackerProcessingService.registerTrackers,
      ).toHaveBeenCalledWith(
        'user-123',
        registerDto.urls,
        registerDto.userData,
        'channel-123',
        'token-123',
      );
    });
  });

  describe('addTracker', () => {
    it('should_add_tracker_when_valid_data_is_provided', async () => {
      const addDto: InternalAddTrackerDto = {
        userId: 'user-123',
        url: 'https://tracker.gg/profile/test',
        userData: {
          username: 'testuser',
          globalName: 'Test User',
          avatar: 'avatar_hash',
        },
        channelId: 'channel-123',
        interactionToken: 'token-123',
      };

      const mockResult = { success: true };
      vi.spyOn(mockTrackerProcessingService, 'addTracker').mockResolvedValue(
        mockResult as never,
      );

      const result = await controller.addTracker(addDto);

      expect(result).toEqual(mockResult);
      expect(mockTrackerProcessingService.addTracker).toHaveBeenCalledWith(
        'user-123',
        addDto.url,
        addDto.userData,
        'channel-123',
        'token-123',
      );
    });
  });

  describe('processPendingTrackers', () => {
    it('should_process_pending_trackers_when_called', async () => {
      const mockResult = { processed: 5 };
      vi.spyOn(
        mockTrackerProcessingService,
        'processPendingTrackers',
      ).mockResolvedValue(mockResult as never);

      const result = await controller.processPendingTrackers();

      expect(result).toEqual(mockResult);
      expect(
        mockTrackerProcessingService.processPendingTrackers,
      ).toHaveBeenCalled();
    });
  });

  describe('processTrackersForGuild', () => {
    it('should_process_trackers_for_guild_when_valid_data_is_provided', async () => {
      const processDto: ProcessTrackersDto = {
        guildId: 'guild-123',
      };

      const mockResult = { processed: 3 };
      vi.spyOn(
        mockTrackerProcessingService,
        'processPendingTrackersForGuild',
      ).mockResolvedValue(mockResult as never);

      const result = await controller.processTrackersForGuild(processDto);

      expect(result).toEqual(mockResult);
      expect(
        mockTrackerProcessingService.processPendingTrackersForGuild,
      ).toHaveBeenCalledWith('guild-123');
    });
  });
});
