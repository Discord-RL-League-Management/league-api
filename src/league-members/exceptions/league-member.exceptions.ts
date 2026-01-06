import {
  NotFoundException,
  ConflictException,
  ValidationException,
} from '../../common/exceptions/base.exception';

/**
 * LeagueMemberNotFoundException - Domain-specific exception for league member not found
 */
export class LeagueMemberNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super('LeagueMember', identifier);
  }
}

/**
 * LeagueMemberAlreadyExistsException - Domain-specific exception for duplicate league member
 */
export class LeagueMemberAlreadyExistsException extends ConflictException {
  constructor(playerId: string, leagueId: string) {
    super(`Player ${playerId} is already a member of league ${leagueId}`, {
      playerId,
      leagueId,
    });
  }
}

/**
 * LeagueJoinValidationException - League join validation error
 */
export class LeagueJoinValidationException extends ValidationException {
  constructor(message: string) {
    super(`League join validation failed: ${message}`, { message });
  }
}

/**
 * LeagueCooldownException - Player is in cooldown period
 */
export class LeagueCooldownException extends ValidationException {
  constructor(daysRemaining: number) {
    super(`Player is in cooldown period. ${daysRemaining} day(s) remaining.`, {
      daysRemaining,
    });
  }
}

/**
 * InvalidLeagueMemberStatusException - Invalid league member status or status transition
 */
export class InvalidLeagueMemberStatusException extends ValidationException {
  constructor(message: string) {
    super(`Invalid league member status: ${message}`, { message });
  }
}
