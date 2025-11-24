import { NotFoundException, ConflictException, ForbiddenException, ValidationException } from '../../common/exceptions/base.exception';

/**
 * LeagueNotFoundException - Domain-specific exception for league not found
 */
export class LeagueNotFoundException extends NotFoundException {
  constructor(leagueId: string) {
    super('League', leagueId);
  }
}

/**
 * LeagueAlreadyExistsException - Domain-specific exception for duplicate league
 */
export class LeagueAlreadyExistsException extends ConflictException {
  constructor(leagueId: string) {
    super(`League with ID '${leagueId}' already exists`, { leagueId });
  }
}

/**
 * LeagueAccessDeniedException - User does not have access to league
 */
export class LeagueAccessDeniedException extends ForbiddenException {
  constructor(leagueId: string, userId?: string) {
    const message = userId
      ? `User ${userId} does not have access to league ${leagueId}`
      : `Access denied to league ${leagueId}`;
    super(message);
  }
}

/**
 * InvalidLeagueStatusException - Invalid league status or status transition
 */
export class InvalidLeagueStatusException extends ValidationException {
  constructor(message: string) {
    super(`Invalid league status: ${message}`, { message });
  }
}

/**
 * LeagueValidationException - League validation error
 */
export class LeagueValidationException extends ValidationException {
  constructor(message: string) {
    super(`League validation failed: ${message}`, { message });
  }
}

