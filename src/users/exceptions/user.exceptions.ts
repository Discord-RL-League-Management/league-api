import {
  NotFoundException,
  ConflictException,
} from '../../common/exceptions/base.exception';

/**
 * UserNotFoundException - Domain-specific exception for user not found
 */
export class UserNotFoundException extends NotFoundException {
  constructor(userId: string) {
    super('User', userId);
  }
}

/**
 * UserAlreadyExistsException - Domain-specific exception for duplicate user
 */
export class UserAlreadyExistsException extends ConflictException {
  constructor(userId: string) {
    super(`User with ID '${userId}' already exists`, { userId });
  }
}
