/**
 * ITransactionClient - Interface for transaction client operations
 *
 * Abstracts the transaction client to remove dependency on Prisma.TransactionClient.
 * This allows business logic to work with transactions without being coupled to
 * the specific ORM implementation.
 */
export interface ITransactionClient {
  /**
   * Transaction client interface for executing operations within a transaction.
   * Concrete implementations will provide access to database operations through
   * the transaction context.
   */
  [key: string]: unknown;
}

/**
 * ITransactionService - Interface for transaction management operations
 *
 * Abstracts database transaction functionality to enable dependency inversion and
 * database abstraction. This interface allows business logic to depend on abstractions
 * rather than concrete implementations (e.g., Prisma.$transaction), enabling the
 * database layer to be abstracted and potentially swapped when scaling to microservices
 * architecture.
 *
 * Future extraction target: Database Abstraction Layer (abstracted from Prisma to support multiple databases/ORMs)
 */
export interface ITransactionService {
  /**
   * Execute a callback function within a database transaction
   * @param callback - Function to execute within the transaction context
   * @returns Result of the callback function
   */
  executeTransaction<T>(
    callback: (tx: ITransactionClient) => Promise<T>,
  ): Promise<T>;
}
