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
import { TeamMemberService } from './services/team-member.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';

@ApiTags('Internal - Team Members')
@Controller('internal/team-members')
@UseGuards(BotAuthGuard)
@SkipThrottle()
@BotOnly()
export class InternalTeamMembersController {
  constructor(private teamMemberService: TeamMemberService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get team member (Bot only)' })
  @ApiResponse({ status: 200, description: 'Team member details' })
  @ApiResponse({ status: 404, description: 'Team member not found' })
  getMember(@Param('id') id: string) {
    return this.teamMemberService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Add team member (Bot only)' })
  @ApiResponse({ status: 201, description: 'Team member added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  addMember(@Body() createDto: CreateTeamMemberDto) {
    return this.teamMemberService.addMember(createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update team member (Bot only)' })
  @ApiResponse({ status: 200, description: 'Team member updated successfully' })
  @ApiResponse({ status: 404, description: 'Team member not found' })
  updateMember(
    @Param('id') id: string,
    @Body() updateDto: UpdateTeamMemberDto,
  ) {
    return this.teamMemberService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove team member (Bot only)' })
  @ApiResponse({ status: 200, description: 'Team member removed successfully' })
  @ApiResponse({ status: 404, description: 'Team member not found' })
  removeMember(@Param('id') id: string) {
    return this.teamMemberService.removeMember(id);
  }
}
