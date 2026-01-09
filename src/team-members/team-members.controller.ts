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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMemberService } from './services/team-member.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { ParseCUIDPipe } from '../common/pipes';

@ApiTags('Team Members')
@Controller('api/teams/:teamId/members')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TeamMembersController {
  constructor(private teamMemberService: TeamMemberService) {}

  @Get()
  @ApiOperation({ summary: 'List team members' })
  @ApiResponse({ status: 200, description: 'List of team members' })
  getMembers(@Param('teamId', ParseCUIDPipe) teamId: string) {
    return this.teamMemberService.findByTeamId(teamId);
  }

  @Post()
  @ApiOperation({ summary: 'Add team member' })
  @ApiResponse({ status: 201, description: 'Team member added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  addMember(
    @Param('teamId', ParseCUIDPipe) teamId: string,
    @Body() createDto: CreateTeamMemberDto,
  ) {
    return this.teamMemberService.addMember({ ...createDto, teamId });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update team member' })
  @ApiResponse({ status: 200, description: 'Team member updated successfully' })
  @ApiResponse({ status: 404, description: 'Team member not found' })
  updateMember(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() updateDto: UpdateTeamMemberDto,
  ) {
    return this.teamMemberService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove team member' })
  @ApiResponse({ status: 200, description: 'Team member removed successfully' })
  @ApiResponse({ status: 404, description: 'Team member not found' })
  removeMember(@Param('id', ParseCUIDPipe) id: string) {
    return this.teamMemberService.removeMember(id);
  }
}
