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
import { TeamService } from './services/team.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { ParseCUIDPipe } from '../common/pipes';

@ApiTags('Teams')
@Controller('api/leagues/:leagueId/teams')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TeamsController {
  constructor(private teamService: TeamService) {}

  @Get()
  @ApiOperation({ summary: 'List teams in league' })
  @ApiResponse({ status: 200, description: 'List of teams' })
  getTeams(@Param('leagueId', ParseCUIDPipe) leagueId: string) {
    return this.teamService.findByLeagueId(leagueId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team details' })
  @ApiResponse({ status: 200, description: 'Team details' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  getTeam(@Param('id', ParseCUIDPipe) id: string) {
    return this.teamService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create team' })
  @ApiResponse({ status: 201, description: 'Team created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  createTeam(
    @Param('leagueId', ParseCUIDPipe) leagueId: string,
    @Body() createDto: CreateTeamDto,
  ) {
    return this.teamService.create({ ...createDto, leagueId });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update team' })
  @ApiResponse({ status: 200, description: 'Team updated successfully' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  updateTeam(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() updateDto: UpdateTeamDto,
  ) {
    return this.teamService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete team' })
  @ApiResponse({ status: 200, description: 'Team deleted successfully' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  deleteTeam(@Param('id', ParseCUIDPipe) id: string) {
    return this.teamService.delete(id);
  }
}
