import {
  NotFoundException,
  ConflictException,
} from '../../common/exceptions/base.exception';

/**
 * GuildNotFoundException - Domain-specific exception for guild not found
 */
export class GuildNotFoundException extends NotFoundException {
  constructor(guildId: string) {
    super('Guild', guildId);
  }
}

/**
 * GuildAlreadyExistsException - Domain-specific exception for duplicate guild
 */
export class GuildAlreadyExistsException extends ConflictException {
  constructor(guildId: string) {
    super(`Guild with ID '${guildId}' already exists`, { guildId });
  }
}
