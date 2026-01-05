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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';
import { OrganizationService } from './organization.service';
import { OrganizationMemberService } from './services/organization-member.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddOrganizationMemberDto } from './dto/add-organization-member.dto';
import { UpdateOrganizationMemberDto } from './dto/update-organization-member.dto';
import { TransferTeamDto } from './dto/transfer-team.dto';
import { OrganizationGmGuard } from './guards/organization-gm.guard';
import { OrganizationMemberRole } from '@prisma/client';
import { ParseCUIDPipe } from '../common/pipes';

@ApiTags('Organizations')
@Controller('api')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class OrganizationsController {
  constructor(
    private organizationService: OrganizationService,
    private organizationMemberService: OrganizationMemberService,
  ) {}

  @Get('leagues/:leagueId/organizations')
  @ApiOperation({ summary: 'List organizations in league' })
  @ApiParam({ name: 'leagueId', description: 'League ID' })
  getOrganizations(@Param('leagueId', ParseCUIDPipe) leagueId: string) {
    return this.organizationService.findByLeagueId(leagueId);
  }

  @Get('organizations/:id')
  @ApiOperation({ summary: 'Get organization details' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  getOrganization(@Param('id', ParseCUIDPipe) id: string) {
    return this.organizationService.findOne(id);
  }

  @Get('organizations/:id/teams')
  @ApiOperation({ summary: 'List teams in organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  getOrganizationTeams(@Param('id', ParseCUIDPipe) id: string) {
    return this.organizationService.findTeams(id);
  }

  @Get('organizations/:id/stats')
  @ApiOperation({ summary: 'Get organization statistics' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  getOrganizationStats(@Param('id', ParseCUIDPipe) id: string) {
    return this.organizationService.getOrganizationStats(id);
  }

  @Post('leagues/:leagueId/organizations')
  @ApiOperation({ summary: 'Create organization (creator becomes GM)' })
  @ApiParam({ name: 'leagueId', description: 'League ID' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  createOrganization(
    @Param('leagueId', ParseCUIDPipe) leagueId: string,
    @Body() createDto: CreateOrganizationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationService.create({ ...createDto, leagueId }, user.id);
  }

  @Patch('organizations/:id')
  @UseGuards(OrganizationGmGuard)
  @ApiOperation({ summary: 'Update organization (GM only)' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({ status: 403, description: 'Must be General Manager' })
  updateOrganization(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() updateDto: UpdateOrganizationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationService.update(id, updateDto, user.id);
  }

  @Delete('organizations/:id')
  @UseGuards(OrganizationGmGuard)
  @ApiOperation({
    summary: 'Delete organization (GM only, must have no teams)',
  })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Must be General Manager' })
  @ApiResponse({ status: 400, description: 'Organization has teams' })
  deleteOrganization(
    @Param('id', ParseCUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationService.delete(id, user.id);
  }

  @Post('organizations/:id/teams/:teamId/transfer')
  @ApiOperation({
    summary:
      'Transfer team to different organization (GM of source or target org)',
  })
  @ApiParam({ name: 'id', description: 'Source Organization ID' })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  @ApiResponse({ status: 200, description: 'Team transferred successfully' })
  transferTeam(
    @Param('id', ParseCUIDPipe) id: string,
    @Param('teamId', ParseCUIDPipe) teamId: string,
    @Body() transferDto: TransferTeamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationService.transferTeam(
      teamId,
      transferDto.targetOrganizationId,
      user.id,
    );
  }

  @Get('organizations/:id/members')
  @ApiOperation({ summary: 'List organization members' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  getOrganizationMembers(@Param('id', ParseCUIDPipe) id: string) {
    return this.organizationMemberService.findMembers(id);
  }

  @Post('organizations/:id/members')
  @UseGuards(OrganizationGmGuard)
  @ApiOperation({ summary: 'Add member to organization (GM only)' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  @ApiResponse({ status: 403, description: 'Must be General Manager' })
  addOrganizationMember(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() addMemberDto: AddOrganizationMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationMemberService.addMember(
      id,
      addMemberDto.playerId,
      addMemberDto.role ?? OrganizationMemberRole.MEMBER,
      user.id,
    );
  }

  @Patch('organizations/:id/members/:memberId')
  @UseGuards(OrganizationGmGuard)
  @ApiOperation({ summary: 'Update member role/status (GM only)' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Member updated successfully' })
  @ApiResponse({ status: 403, description: 'Must be General Manager' })
  @ApiResponse({
    status: 400,
    description: 'Cannot remove last General Manager',
  })
  updateOrganizationMember(
    @Param('id', ParseCUIDPipe) id: string,
    @Param('memberId', ParseCUIDPipe) memberId: string,
    @Body() updateDto: UpdateOrganizationMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationMemberService.updateMember(
      memberId,
      updateDto,
      user.id,
    );
  }

  @Delete('organizations/:id/members/:memberId')
  @UseGuards(OrganizationGmGuard)
  @ApiOperation({
    summary: 'Remove member from organization (GM only, cannot remove last GM)',
  })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 403, description: 'Must be General Manager' })
  @ApiResponse({
    status: 400,
    description: 'Cannot remove last General Manager',
  })
  removeOrganizationMember(
    @Param('id', ParseCUIDPipe) id: string,
    @Param('memberId', ParseCUIDPipe) memberId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationMemberService.removeMember(memberId, user.id);
  }
}
