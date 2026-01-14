/**
 * InternalGuildMembersController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { InternalGuildMembersController } from './internal-guild-members.controller';
import { GuildMembersService } from './guild-members.service';
import { CreateGuildMemberDto } from './dto/create-guild-member.dto';
import { UpdateGuildMemberDto } from './dto/update-guild-member.dto';

describe('InternalGuildMembersController', () => {
  let controller: InternalGuildMembersController;
  let mockGuildMembersService: GuildMembersService;

  const mockGuildMember = {
    id: 'member-123',
    userId: 'user-123',
    guildId: 'guild-123',
    username: 'testuser',
    nickname: 'Test Nickname',
    roles: ['role-1'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockGuildMembersService = {
      create: vi.fn(),
      syncGuildMembers: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    } as unknown as GuildMembersService;

    const module = await Test.createTestingModule({
      controllers: [InternalGuildMembersController],
      providers: [
        { provide: GuildMembersService, useValue: mockGuildMembersService },
      ],
    }).compile();

    controller = module.get<InternalGuildMembersController>(
      InternalGuildMembersController,
    );
  });

  describe('createMember', () => {
    it('should_create_member_when_valid_data_is_provided', async () => {
      const createDto: CreateGuildMemberDto = {
        userId: 'user-123',
        guildId: 'guild-123',
        username: 'testuser',
        nickname: 'Test Nickname',
        roles: ['role-1'],
      };

      vi.spyOn(mockGuildMembersService, 'create').mockResolvedValue(
        mockGuildMember as never,
      );

      const result = await controller.createMember(createDto);

      expect(result).toEqual(mockGuildMember);
      expect(mockGuildMembersService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('syncMembers', () => {
    it('should_sync_members_when_valid_data_is_provided', async () => {
      const syncData = {
        members: [
          {
            userId: 'user-123',
            username: 'testuser',
            nickname: 'Test Nickname',
            roles: ['role-1'],
          },
        ],
      };

      const mockResult = { synced: 1 };
      vi.spyOn(mockGuildMembersService, 'syncGuildMembers').mockResolvedValue(
        mockResult as never,
      );

      const result = await controller.syncMembers('guild-123', syncData);

      expect(result).toEqual(mockResult);
      expect(mockGuildMembersService.syncGuildMembers).toHaveBeenCalledWith(
        'guild-123',
        syncData.members,
      );
    });
  });

  describe('updateMember', () => {
    it('should_update_member_when_valid_data_is_provided', async () => {
      const updateDto: UpdateGuildMemberDto = {
        nickname: 'Updated Nickname',
        roles: ['role-1', 'role-2'],
      };

      const updatedMember = {
        ...mockGuildMember,
        ...updateDto,
      };

      vi.spyOn(mockGuildMembersService, 'update').mockResolvedValue(
        updatedMember as never,
      );

      const result = await controller.updateMember(
        'guild-123',
        'user-123',
        updateDto,
      );

      expect(result).toEqual(updatedMember);
      expect(mockGuildMembersService.update).toHaveBeenCalledWith(
        'user-123',
        'guild-123',
        updateDto,
      );
    });
  });

  describe('removeMember', () => {
    it('should_remove_member_when_ids_are_provided', async () => {
      vi.spyOn(mockGuildMembersService, 'remove').mockResolvedValue(
        undefined as never,
      );

      const result = await controller.removeMember('guild-123', 'user-123');

      expect(result).toEqual({ message: 'Member removed successfully' });
      expect(mockGuildMembersService.remove).toHaveBeenCalledWith(
        'user-123',
        'guild-123',
      );
    });
  });
});
