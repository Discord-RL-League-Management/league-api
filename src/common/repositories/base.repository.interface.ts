/**
 * Base repository interface for CRUD operations
 * Single Responsibility: Define standard repository contract
 * 
 * This interface provides a consistent contract for all repositories,
 * making the codebase more maintainable and testable.
 */
export interface BaseRepository<T, CreateDto, UpdateDto> {
  /**
   * Find entity by ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find all entities with optional pagination
   */
  findAll(options?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: T[]; total: number; page: number; limit: number }>;

  /**
   * Create a new entity
   */
  create(data: CreateDto): Promise<T>;

  /**
   * Update an existing entity
   */
  update(id: string, data: UpdateDto): Promise<T>;

  /**
   * Delete an entity
   */
  delete(id: string): Promise<T>;

  /**
   * Check if entity exists
   */
  exists(id: string): Promise<boolean>;
}
