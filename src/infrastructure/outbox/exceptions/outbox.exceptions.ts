import {
  NotFoundException,
  ValidationException,
} from '../../../common/exceptions/base.exception';

/**
 * OutboxNotFoundException - Domain-specific exception for outbox event not found
 */
export class OutboxNotFoundException extends NotFoundException {
  constructor(outboxId: string) {
    super('Outbox', outboxId);
  }
}

/**
 * InvalidOutboxStatusException - Invalid outbox status or status transition
 */
export class InvalidOutboxStatusException extends ValidationException {
  constructor(message: string) {
    super(`Invalid outbox status: ${message}`, { message });
  }
}
