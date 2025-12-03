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
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { TeamService } from './services/team.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { ParseCUIDPipe } from '../common/pipes';

@ApiTags('Internal - Teams')
@Controller('internal/teams')
@UseGuards(BotAuthGuard)
@SkipThrottle()
export class InternalTeamsController {
  constructor(private teamService: TeamService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get team (Bot only)' })
  getTeam(@Param('id', ParseCUIDPipe) id: string) {
    return this.teamService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create team (Bot only)' })
  createTeam(@Body() createDto: CreateTeamDto) {
    return this.teamService.create(createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update team (Bot only)' })
  updateTeam(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() updateDto: UpdateTeamDto,
  ) {
    return this.teamService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete team (Bot only)' })
  deleteTeam(@Param('id', ParseCUIDPipe) id: string) {
    return this.teamService.delete(id);
  }
}

