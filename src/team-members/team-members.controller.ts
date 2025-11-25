import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMemberService } from './services/team-member.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';

@ApiTags('Team Members')
@Controller('api/teams/:teamId/members')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TeamMembersController {
  constructor(private teamMemberService: TeamMemberService) {}

  @Get()
  @ApiOperation({ summary: 'List team members' })
  getMembers(@Param('teamId') teamId: string) {
    return this.teamMemberService.findByTeamId(teamId);
  }

  @Post()
  @ApiOperation({ summary: 'Add team member' })
  addMember(@Param('teamId') teamId: string, @Body() createDto: CreateTeamMemberDto) {
    return this.teamMemberService.addMember({ ...createDto, teamId });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update team member' })
  updateMember(@Param('id') id: string, @Body() updateDto: UpdateTeamMemberDto) {
    return this.teamMemberService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove team member' })
  removeMember(@Param('id') id: string) {
    return this.teamMemberService.removeMember(id);
  }
}

