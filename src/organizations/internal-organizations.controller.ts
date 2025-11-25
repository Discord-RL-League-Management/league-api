import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { OrganizationService } from './services/organization.service';
import { OrganizationMemberService } from './services/organization-member.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddOrganizationMemberDto } from './dto/add-organization-member.dto';
import { UpdateOrganizationMemberDto } from './dto/update-organization-member.dto';
import { OrganizationMemberRole } from '@prisma/client';

@ApiTags('Internal - Organizations')
@Controller('internal/organizations')
@UseGuards(BotAuthGuard)
@SkipThrottle()
export class InternalOrganizationsController {
  constructor(
    private organizationService: OrganizationService,
    private organizationMemberService: OrganizationMemberService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get organization (Bot only)' })
  getOrganization(@Param('id') id: string) {
    return this.organizationService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create organization (Bot only)' })
  createOrganization(@Body() createDto: CreateOrganizationDto & { userId: string }) {
    return this.organizationService.create(createDto, createDto.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization (Bot only)' })
  updateOrganization(@Param('id') id: string, @Body() updateDto: UpdateOrganizationDto) {
    return this.organizationService.update(id, updateDto, 'bot');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization (Bot only)' })
  deleteOrganization(@Param('id') id: string) {
    return this.organizationService.delete(id, 'bot');
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List organization members (Bot only)' })
  getOrganizationMembers(@Param('id') id: string) {
    return this.organizationMemberService.findMembers(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to organization (Bot only)' })
  addOrganizationMember(
    @Param('id') id: string,
    @Body() addMemberDto: AddOrganizationMemberDto & { userId: string },
  ) {
    return this.organizationMemberService.addMember(
      id,
      addMemberDto.playerId,
      addMemberDto.role ?? OrganizationMemberRole.MEMBER,
      addMemberDto.userId,
    );
  }

  @Patch(':id/members/:memberId')
  @ApiOperation({ summary: 'Update organization member (Bot only)' })
  updateOrganizationMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() updateDto: UpdateOrganizationMemberDto,
  ) {
    return this.organizationMemberService.updateMember(memberId, updateDto, 'bot');
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove organization member (Bot only)' })
  removeOrganizationMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.organizationMemberService.removeMember(memberId, 'bot');
  }
}

