import {
  NotFoundException,
  ConflictException,
  ValidationException,
} from '../../common/exceptions/base.exception';

/**
 * PlayerNotFoundException - Domain-specific exception for player not found
 */
export class PlayerNotFoundException extends NotFoundException {
  constructor(playerId: string) {
    super('Player', playerId);
  }
}

/**
 * PlayerAlreadyExistsException - Domain-specific exception for duplicate player
 */
export class PlayerAlreadyExistsException extends ConflictException {
  constructor(userId: string, guildId: string) {
    super(
      `Player with userId '${userId}' and guildId '${guildId}' already exists`,
      { userId, guildId },
    );
  }
}

/**
 * InvalidPlayerStatusException - Invalid player status or status transition
 */
export class InvalidPlayerStatusException extends ValidationException {
  constructor(message: string) {
    super(`Invalid player status: ${message}`, { message });
  }
}

/**
 * PlayerValidationException - Player validation error
 */
export class PlayerValidationException extends ValidationException {
  constructor(message: string) {
    super(`Player validation failed: ${message}`, { message });
  }
}

