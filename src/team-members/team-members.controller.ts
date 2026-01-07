import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TeamMemberService } from './services/team-member.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { ParseCUIDPipe } from '../common/pipes';

@ApiTags('Team Members')
@Controller('api/teams/:teamId/members')
@ApiBearerAuth('JWT-auth')
export class TeamMembersController {
  constructor(private teamMemberService: TeamMemberService) {}

  @Get()
  @ApiOperation({ summary: 'List team members' })
  getMembers(@Param('teamId', ParseCUIDPipe) teamId: string) {
    return this.teamMemberService.findByTeamId(teamId);
  }

  @Post()
  @ApiOperation({ summary: 'Add team member' })
  addMember(
    @Param('teamId', ParseCUIDPipe) teamId: string,
    @Body() createDto: CreateTeamMemberDto,
  ) {
    return this.teamMemberService.addMember({ ...createDto, teamId });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update team member' })
  updateMember(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() updateDto: UpdateTeamMemberDto,
  ) {
    return this.teamMemberService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove team member' })
  removeMember(@Param('id', ParseCUIDPipe) id: string) {
    return this.teamMemberService.removeMember(id);
  }
}
