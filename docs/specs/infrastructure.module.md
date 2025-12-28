# InfrastructureModule - Behavioral Contract

## Module: InfrastructureModule
**Location**: `src/infrastructure/infrastructure.module.ts`

## Purpose
Provides infrastructure concerns including outbox pattern, idempotency, activity logging, settings storage, and visibility management.

## Behavioral Contract

### Responsibilities
1. **Outbox Pattern**: Reliable event publishing
2. **Idempotency**: Ensure idempotent operations
3. **Activity Logging**: Track system activities
4. **Settings Storage**: Generic settings storage
5. **Visibility Management**: Manage resource visibility

### Sub-modules

#### OutboxModule
- **Purpose**: Implements transactional outbox pattern for reliable event publishing
- **Exports**: OutboxService, OutboxEventDispatcherService, OutboxProcessorService

#### IdempotencyModule
- **Purpose**: Ensures operations are idempotent
- **Exports**: IdempotencyService

#### ActivityLogModule
- **Purpose**: Logs system activities for audit and tracking
- **Exports**: ActivityLogService

#### SettingsModule
- **Purpose**: Generic settings storage
- **Exports**: SettingsService

#### VisibilityModule
- **Purpose**: Manages resource visibility (public/private)
- **Exports**: VisibilityService

### Behavioral Rules

1. **Outbox Pattern**:
   - Events are written to outbox in same transaction
   - Outbox processor publishes events asynchronously
   - Events are marked as processed after successful publishing

2. **Idempotency**:
   - Operations can be safely retried
   - Idempotency keys prevent duplicate processing
   - Idempotency records track processed operations

3. **Activity Logging**:
   - All significant actions are logged
   - Logs include user, action, resource, and timestamp
   - Logs are used for audit trails

### Related Implementation
- `src/infrastructure/outbox/`
- `src/infrastructure/idempotency/`
- `src/infrastructure/activity-log/`
- `src/infrastructure/settings/`
- `src/infrastructure/visibility/`


