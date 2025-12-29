# CommonModule - Behavioral Contract

## Module: CommonModule
**Location**: `src/common/common.module.ts`

## Purpose
Provides shared utilities, guards, interceptors, and cross-cutting concerns used across the application.

## Behavioral Contract

### Responsibilities
1. **Authentication Guards**: Provide authorization guards (AdminGuard, SystemAdminGuard, ResourceOwnershipGuard)
2. **Encryption Services**: Provide encryption/decryption utilities
3. **Request Context**: Manage request context for audit logging
4. **Dependency Inversion**: Use adapter pattern to break circular dependencies

### Exported Services

#### EncryptionService
- **Purpose**: Encrypt/decrypt sensitive data
- **Key Methods**:
  - `encrypt(data)`: Encrypts sensitive data
  - `decrypt(encryptedData)`: Decrypts data

#### AdminGuard
- **Purpose**: Validates admin permissions in guilds
- **Behavior**: Uses dependency inversion with interfaces (IPermissionProvider, IAuditProvider, etc.)
- **Adapters**: PermissionProviderAdapter, AuditProviderAdapter, DiscordProviderAdapter, TokenProviderAdapter, GuildAccessProviderAdapter

#### SystemAdminGuard
- **Purpose**: Validates system-wide admin permissions
- **Behavior**: Checks against configured system admin user IDs

#### ResourceOwnershipGuard
- **Purpose**: Validates resource ownership
- **Behavior**: Ensures users can only access their own resources

### Behavioral Rules

1. **AdminGuard**:
   - Uses dependency inversion pattern
   - Depends on adapters implementing interfaces
   - Validates admin roles using Discord API when required
   - Performs audit logging for admin actions

2. **Dependency Inversion**:
   - Uses factory functions to create adapters
   - Breaks circular dependencies between modules
   - Provides injection tokens for interface providers

3. **Encryption**:
   - Encrypts sensitive user data (e.g., email, tokens)
   - Uses secure encryption algorithms
   - Handles encryption/decryption errors gracefully

### Dependencies
- **AuditModule**: For audit logging (forwardRef)
- **PermissionCheckModule**: For permission checking
- **GuildsModule**: For guild access (forwardRef)
- **DiscordModule**: For Discord API access
- **TokenManagementModule**: For token validation

### Related Implementation
- `src/common/guards/admin.guard.ts`
- `src/common/guards/system-admin.guard.ts`
- `src/common/encryption.service.ts`
- `src/common/interceptors/request-context.interceptor.ts`


