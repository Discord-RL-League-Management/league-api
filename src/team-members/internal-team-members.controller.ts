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
import { TeamMemberService } from './services/team-member.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';

@ApiTags('Internal - Team Members')
@Controller('internal/team-members')
@UseGuards(BotAuthGuard)
@SkipThrottle()
export class InternalTeamMembersController {
  constructor(private teamMemberService: TeamMemberService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get team member (Bot only)' })
  getMember(@Param('id') id: string) {
    return this.teamMemberService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Add team member (Bot only)' })
  addMember(@Body() createDto: CreateTeamMemberDto) {
    return this.teamMemberService.addMember(createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update team member (Bot only)' })
  updateMember(
    @Param('id') id: string,
    @Body() updateDto: UpdateTeamMemberDto,
  ) {
    return this.teamMemberService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove team member (Bot only)' })
  removeMember(@Param('id') id: string) {
    return this.teamMemberService.removeMember(id);
  }
}


