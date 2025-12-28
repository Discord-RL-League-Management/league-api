# UsersModule - Behavioral Contract

## Module: UsersModule
**Location**: `src/users/users.module.ts`

## Purpose
Manages user accounts and profile data, providing both user-facing and bot-facing endpoints for user management operations.

## Behavioral Contract

### Responsibilities
1. **User CRUD Operations**: Create, read, update, delete user accounts
2. **Profile Management**: Manage user profile information
3. **User Data Access**: Provide access to user data with proper authorization
4. **User Orchestration**: Coordinate user creation and updates across system

### Exported Services

#### UsersService
- **Purpose**: Core user management logic
- **Key Methods**:
  - `findAll()`: Retrieves all users (bot only)
  - `findOne(id)`: Retrieves user by ID
  - `create(createUserDto)`: Creates new user
  - `update(id, updateUserDto)`: Updates user information
  - `delete(id)`: Deletes user account

#### UserOrchestratorService
- **Purpose**: Coordinates user-related operations across modules
- **Key Methods**:
  - `ensureUserExists(userId, userData)`: Ensures user exists, creates if needed
  - `syncUserData(userId, data)`: Synchronizes user data from external sources

### Controllers

#### UsersController (User-facing)
- **Endpoints**:
  - `GET /api/users/me`: Returns current user's data
  - `PATCH /api/users/me`: Updates current user's data
  - `GET /api/users/:id`: Returns user data (only if ID matches authenticated user)

#### InternalUsersController (Bot-facing)
- **Endpoints**:
  - `GET /internal/users`: Lists all users
  - `GET /internal/users/:id`: Retrieves user by ID
  - `POST /internal/users`: Creates new user
  - `PATCH /internal/users/:id`: Updates user
  - `DELETE /internal/users/:id`: Deletes user

### Behavioral Rules

1. **User Data Access**:
   - Users can only access their own data via `/api/users/:id`
   - Attempting to access another user's data returns 403 Forbidden
   - Bot endpoints bypass user-level authorization

2. **Profile Updates**:
   - Users can only update allowed fields (e.g., username)
   - Sensitive fields require additional authorization
   - Updates must validate input data

3. **User Creation**:
   - User ID must be Discord user ID (snowflake)
   - Username must be provided or default to user ID
   - Email is optional and encrypted if provided

4. **User Deletion**:
   - Soft delete preferred over hard delete
   - Cascading rules must be defined for related data
   - Bot can perform hard delete if needed

### Dependencies
- **PrismaModule**: For database access
- **CommonModule**: For encryption services
- **InfrastructureModule**: For activity logging

### Related Features
- `features/user-management.feature`

### Related Implementation
- `src/users/users.service.ts`
- `src/users/users.controller.ts`
- `src/users/internal-users.controller.ts`
- `src/users/services/user-orchestrator.service.ts`
- `src/users/repositories/user.repository.ts`


