import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * GuildErrorHandlerService - Single Responsibility: Error information extraction and normalization
 *
 * Handles Prisma errors and other error types to provide consistent error structure.
 * Extracted from GuildsService to improve separation of concerns.
 */
@Injectable()
export class GuildErrorHandlerService {
  /**
   * Extract error information from various error types
   * Single Responsibility: Error information extraction and normalization
   *
   * Handles Prisma errors and other error types to provide consistent error structure.
   *
   * @param error - The error to extract information from
   * @param contextId - Optional context ID (e.g., guildId) for logging purposes
   * @returns Structured error information with message, code, and details
   */
  extractErrorInfo(
    error: unknown,
    contextId?: string,
  ): { message: string; code?: string; details?: Record<string, unknown> } {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        message: error.message,
        code: `PRISMA_${error.code}`,
        details: {
          prismaCode: error.code,
          meta: error.meta,
          cause: error.cause,
        },
      };
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return {
        message: error.message,
        code: 'PRISMA_VALIDATION_ERROR',
        details: {
          cause: error.cause,
        },
      };
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return {
        message: error.message,
        code: 'PRISMA_INITIALIZATION_ERROR',
        details: {
          errorCode: error.errorCode,
          clientVersion: error.clientVersion,
        },
      };
    }

    if (error instanceof Prisma.PrismaClientRustPanicError) {
      return {
        message: error.message,
        code: 'PRISMA_RUST_PANIC_ERROR',
        details: {
          cause: error.cause,
        },
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        code: 'UNKNOWN_ERROR',
        details: {
          name: error.name,
          stack: error.stack,
        },
      };
    }

    return {
      message: 'Unknown error occurred during guild operation',
      code: 'UNKNOWN_ERROR',
      details: {
        errorType: typeof error,
        error: String(error),
        contextId,
      },
    };
  }
}
