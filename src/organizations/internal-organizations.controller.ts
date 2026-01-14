import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { BotOnly } from '../common/decorators';
import { OrganizationService } from './organization.service';
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
@BotOnly()
export class InternalOrganizationsController {
  constructor(
    private organizationService: OrganizationService,
    private organizationMemberService: OrganizationMemberService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get organization (Bot only)' })
  @ApiResponse({ status: 200, description: 'Organization details' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  getOrganization(@Param('id') id: string) {
    return this.organizationService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create organization (Bot only)' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  createOrganization(
    @Body() createDto: CreateOrganizationDto & { userId: string },
  ) {
    return this.organizationService.create(createDto, createDto.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization (Bot only)' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  updateOrganization(
    @Param('id') id: string,
    @Body() updateDto: UpdateOrganizationDto,
  ) {
    return this.organizationService.update(id, updateDto, 'bot');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization (Bot only)' })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  deleteOrganization(@Param('id') id: string) {
    return this.organizationService.delete(id, 'bot');
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List organization members (Bot only)' })
  @ApiResponse({ status: 200, description: 'List of organization members' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  getOrganizationMembers(@Param('id') id: string) {
    return this.organizationMemberService.findMembers(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to organization (Bot only)' })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
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
  @ApiResponse({ status: 200, description: 'Member updated successfully' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  updateOrganizationMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() updateDto: UpdateOrganizationMemberDto,
  ) {
    return this.organizationMemberService.updateMember(
      memberId,
      updateDto,
      'bot',
    );
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove organization member (Bot only)' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  removeOrganizationMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.organizationMemberService.removeMember(memberId, 'bot');
  }
}
