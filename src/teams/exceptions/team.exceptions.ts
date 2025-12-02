import {
  NotFoundException,
  ConflictException,
  ValidationException,
} from '../../common/exceptions/base.exception';

/**
 * TeamNotFoundException - Domain-specific exception for team not found
 */
export class TeamNotFoundException extends NotFoundException {
  constructor(teamId: string) {
    super('Team', teamId);
  }
}

/**
 * TeamMemberNotFoundException - Domain-specific exception for team member not found
 */
export class TeamMemberNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super('TeamMember', identifier);
  }
}

/**
 * TeamCapacityException - Team capacity limit reached
 */
export class TeamCapacityException extends ValidationException {
  constructor(message: string) {
    super(`Team capacity error: ${message}`, { message });
  }
}

/**
 * TeamMemberAlreadyExistsException - Player is already a member of the team
 */
export class TeamMemberAlreadyExistsException extends ConflictException {
  constructor(playerId: string, teamId: string) {
    super(`Player ${playerId} is already a member of team ${teamId}`, {
      playerId,
      teamId,
    });
  }
}


