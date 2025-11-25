# NestJS Framework Usage Review - league-api

**Review Date:** November 25, 2025  
**NestJS Version:** 11.0.1  
**Reviewer:** AI Code Auditor

---

## Executive Summary

The `league-api` project demonstrates **strong foundational usage** of NestJS 11, with well-structured modules, proper dependency injection, and good separation of concerns. However, there are several areas where NestJS capabilities could be better leveraged, and some best practices are not fully implemented.

**Overall Assessment:** ⭐⭐⭐⭐ (4/5) - Good implementation with room for improvement

---

## 1. Current NestJS Version & Capabilities

### Version Information
- **@nestjs/common:** 11.0.1
- **@nestjs/core:** 11.0.1
- **@nestjs/cli:** 11.0.0
- **TypeScript:** 5.7.3

### NestJS 11 Key Features Available
- Enhanced JWT authentication support
- Improved dependency injection system
- Enhanced security features
- Better TypeScript support
- Microservices support
- WebSocket support
- GraphQL support
- Task scheduling
- Caching
- Rate limiting (Throttler)

---

## 2. What You're Doing Well ✅

### 2.1 Module Architecture
**Status:** ✅ Excellent

- **Well-organized modules** with clear separation of concerns
- **Proper use of `@Module()` decorator** with imports, controllers, providers, and exports
- **Circular dependencies properly handled** with `forwardRef()` where needed
- **Barrel modules** (e.g., `InfrastructureModule`) for clean imports

**Example:**
```typescript
@Module({
  imports: [PrismaModule, AuthModule, TrackersModule],
  controllers: [PlayersController, InternalPlayersController],
  providers: [PlayerService, PlayerValidationService, PlayerRepository],
  exports: [PlayerService, PlayerValidationService, PlayerRepository],
})
export class PlayersModule {}
```

### 2.2 Dependency Injection
**Status:** ✅ Excellent

- **Proper use of `@Injectable()` decorator** throughout services
- **Constructor injection** used consistently
- **Singleton providers** by default (NestJS best practice)
- **Proper use of `@Inject()` with `forwardRef()`** for circular dependencies

### 2.3 Lifecycle Hooks
**Status:** ✅ Good

- **Proper implementation** of `OnModuleInit` and `OnModuleDestroy`:
  - `PrismaService` - Connects/disconnects database
  - `OutboxProcessorService` - Starts/stops polling interval

**Example:**
```typescript
@Injectable()
export class PrismaService extends PrismaClient 
  implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### 2.4 Global Configuration
**Status:** ✅ Excellent

- **Proper use of `ConfigModule`** with validation schema (Joi)
- **Global configuration** with `isGlobal: true`
- **Environment-based configuration** with proper validation

### 2.5 Exception Handling
**Status:** ✅ Good

- **Custom exception filters** implemented:
  - `GlobalExceptionFilter` - Catches all exceptions
  - `PrismaExceptionFilter` - Handles Prisma-specific errors
- **Proper use of `@Catch()` decorator**
- **Global filters** registered in `main.ts`

### 2.6 Guards
**Status:** ✅ Good

- **Custom guards** implemented:
  - `JwtAuthGuard` - JWT authentication
  - `BotAuthGuard` - Bot API key authentication
  - `AdminGuard` - Admin permission checking
  - `ResourceOwnershipGuard` - Resource ownership validation
- **Proper use of `CanActivate` interface**
- **Guards applied at controller and route levels**

### 2.7 Interceptors
**Status:** ✅ Good

- **Custom interceptor** (`RequestContextInterceptor`) for request context management
- **Proper use of `APP_INTERCEPTOR`** for global registration
- **Uses RxJS `defer()`** for proper async context handling

### 2.8 Middleware
**Status:** ✅ Good

- **Custom middleware** (`AuthLoggerMiddleware`) implemented
- **Proper use of `NestMiddleware` interface**
- **Middleware registered** via `NestModule.configure()`

### 2.9 Testing
**Status:** ✅ Good

- **Proper use of `@nestjs/testing`** utilities
- **E2E tests** using `Test.createTestingModule()`
- **Test helpers** for reducing boilerplate
- **Proper test app bootstrapping** with production-like configuration

---

## 3. Areas for Improvement 🔧

### 3.1 Missing Global Pipes Registration via APP_PIPE
**Status:** ⚠️ Could Be Better

**Current Implementation:**
```typescript
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

**Recommendation:**
Use `APP_PIPE` token for better testability and consistency:

```typescript
// app.module.ts
providers: [
  {
    provide: APP_PIPE,
    useClass: ValidationPipe,
    useValue: new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  },
]
```

**Benefits:**
- Easier to test (can be overridden in tests)
- Consistent with how guards and interceptors are registered
- Better alignment with NestJS patterns

### 3.2 Missing Global Filters Registration via APP_FILTER
**Status:** ⚠️ Could Be Better

**Current Implementation:**
```typescript
// main.ts
app.useGlobalFilters(
  new PrismaExceptionFilter(),
  new GlobalExceptionFilter(configService),
);
```

**Recommendation:**
Use `APP_FILTER` token:

```typescript
// app.module.ts
providers: [
  {
    provide: APP_FILTER,
    useClass: PrismaExceptionFilter,
  },
  {
    provide: APP_FILTER,
    useClass: GlobalExceptionFilter,
  },
]
```

**Benefits:**
- Better testability
- Consistent with other global providers
- Easier to conditionally enable/disable

### 3.3 Missing Custom Pipes
**Status:** ⚠️ Missing Feature

**Observation:** No custom pipes found in the codebase.

**Recommendation:**
Create custom pipes for:
- **UUID validation** - Instead of validating in services
- **Enum validation** - For status fields, etc.
- **Transform pipes** - For data transformation

**Example:**
```typescript
@Injectable()
export class ParseUUIDPipe implements PipeTransform {
  transform(value: string): string {
    if (!isUUID(value)) {
      throw new BadRequestException('Invalid UUID format');
    }
    return value;
  }
}

// Usage:
@Get(':id')
findOne(@Param('id', ParseUUIDPipe) id: string) {
  return this.service.findOne(id);
}
```

### 3.4 Limited Use of Custom Decorators
**Status:** ⚠️ Underutilized

**Current Usage:**
- Only one custom decorator: `@CurrentUser()`

**Recommendation:**
Create additional decorators for:
- **Roles** - `@Roles('admin', 'user')`
- **Permissions** - `@RequirePermission('read:guild')`
- **Public routes** - `@Public()` (to skip auth)
- **API versioning** - `@ApiVersion('1')`

**Example:**
```typescript
// roles.decorator.ts
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// public.decorator.ts
export const Public = () => SetMetadata('isPublic', true);
```

### 3.5 Missing Task Scheduling Usage
**Status:** ⚠️ Module Imported But Not Used

**Observation:**
- `ScheduleModule.forRoot()` is imported in `app.module.ts`
- No `@Cron()`, `@Interval()`, or `@Timeout()` decorators found

**Recommendation:**
If scheduling is needed, use it:
```typescript
@Injectable()
export class TrackerRefreshScheduler {
  @Cron('0 */6 * * *') // Every 6 hours
  async refreshTrackers() {
    // Refresh logic
  }
}
```

If not needed, remove `ScheduleModule` to reduce dependencies.

### 3.6 Missing OnApplicationShutdown Hook
**Status:** ⚠️ Could Be Better

**Observation:**
- `app.enableShutdownHooks()` is called in `main.ts`
- No services implement `OnApplicationShutdown`

**Recommendation:**
Implement graceful shutdown for:
- **Database connections** - Ensure Prisma disconnects properly
- **Background jobs** - Stop BullMQ queues gracefully
- **WebSocket connections** - Close connections
- **File handles** - Close open files

**Example:**
```typescript
@Injectable()
export class OutboxProcessorService 
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown {
  
  onApplicationShutdown(signal?: string) {
    this.logger.log(`Application shutting down: ${signal}`);
    this.stopPolling();
    // Additional cleanup
  }
}
```

### 3.7 Missing Microservices Support (If Needed)
**Status:** ℹ️ Not Applicable (Unless Needed)

**Observation:**
- No microservices configuration found
- Single monolithic application

**Recommendation:**
If you need microservices in the future:
- Use `@nestjs/microservices` package
- Implement message patterns with `@MessagePattern()`
- Use event patterns with `@EventPattern()`

### 3.8 Missing WebSocket Support (If Needed)
**Status:** ℹ️ Not Applicable (Unless Needed)

**Observation:**
- No WebSocket implementation found
- REST API only

**Recommendation:**
If real-time features are needed:
- Use `@nestjs/websockets` package
- Implement Gateway classes with `@WebSocketGateway()`
- Use `@SubscribeMessage()` for message handling

### 3.9 ValidationPipe Configuration Could Be Enhanced
**Status:** ⚠️ Could Be Better

**Current Configuration:**
```typescript
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  disableErrorMessages: configService.get<string>('app.nodeEnv') === 'production',
})
```

**Recommendation:**
Add additional options:
```typescript
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true, // Auto-convert types
  },
  disableErrorMessages: configService.get<string>('app.nodeEnv') === 'production',
  exceptionFactory: (errors) => {
    // Custom error formatting
    return new BadRequestException(errors);
  },
  stopAtFirstError: true, // Stop validation on first error
})
```

### 3.10 Missing Request Scoping (If Needed)
**Status:** ℹ️ Not Currently Needed

**Observation:**
- All providers are singletons (default)
- No request-scoped providers found

**Recommendation:**
If you need request-scoped services (e.g., per-request caching):
```typescript
@Injectable({ scope: Scope.REQUEST })
export class RequestScopedService {
  // Service instance created per request
}
```

---

## 4. Best Practices Compliance

### 4.1 ✅ Followed Best Practices

1. **Modular Architecture** - Well-structured modules
2. **Dependency Injection** - Proper use throughout
3. **Separation of Concerns** - Services, controllers, repositories separated
4. **Error Handling** - Custom exception filters
5. **Configuration Management** - Proper use of ConfigModule
6. **Testing** - Good test structure
7. **Security** - Guards, validation, rate limiting
8. **Documentation** - Swagger/OpenAPI integration

### 4.2 ⚠️ Partially Followed

1. **Global Providers** - Using `useGlobal*` instead of `APP_*` tokens
2. **Custom Pipes** - Not used (validation done in services)
3. **Custom Decorators** - Limited usage
4. **Lifecycle Hooks** - Missing `OnApplicationShutdown`

### 4.3 ❌ Not Followed (But May Not Be Needed)

1. **Microservices** - Not implemented (may not be needed)
2. **WebSockets** - Not implemented (may not be needed)
3. **GraphQL** - Not implemented (may not be needed)
4. **Task Scheduling** - Module imported but not used

---

## 5. Specific Recommendations

### Priority 1: High Impact, Low Effort

1. **Move Global Pipes to APP_PIPE**
   - File: `app.module.ts`
   - Impact: Better testability, consistency
   - Effort: Low

2. **Move Global Filters to APP_FILTER**
   - File: `app.module.ts`
   - Impact: Better testability, consistency
   - Effort: Low

3. **Add Custom Pipes for Common Validations**
   - Files: Create `src/common/pipes/`
   - Impact: Cleaner code, reusable validation
   - Effort: Medium

### Priority 2: Medium Impact, Medium Effort

4. **Create Additional Custom Decorators**
   - Files: Create `src/common/decorators/`
   - Impact: Cleaner controllers, better readability
   - Effort: Medium

5. **Implement OnApplicationShutdown Hooks**
   - Files: Services with resources (PrismaService, OutboxProcessorService)
   - Impact: Better graceful shutdown
   - Effort: Low

6. **Enhance ValidationPipe Configuration**
   - File: `app.module.ts` or `main.ts`
   - Impact: Better error messages, type conversion
   - Effort: Low

### Priority 3: Low Priority (If Needed)

7. **Remove or Use ScheduleModule**
   - File: `app.module.ts`
   - Impact: Cleaner dependencies
   - Effort: Low

8. **Consider Microservices** (if scaling needed)
   - Impact: Better scalability
   - Effort: High

9. **Consider WebSockets** (if real-time needed)
   - Impact: Real-time features
   - Effort: High

---

## 6. Code Examples for Improvements

### Example 1: Global Pipe via APP_PIPE

```typescript
// app.module.ts
import { APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

@Module({
  providers: [
    {
      provide: APP_PIPE,
      useFactory: (configService: ConfigService) => {
        return new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          disableErrorMessages: configService.get<string>('app.nodeEnv') === 'production',
        });
      },
      inject: [ConfigService],
    },
  ],
})
export class AppModule {}
```

### Example 2: Custom UUID Pipe

```typescript
// src/common/pipes/parse-uuid.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';

@Injectable()
export class ParseUUIDPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isUUID(value)) {
      throw new BadRequestException(`Invalid UUID format: ${value}`);
    }
    return value;
  }
}

// Usage in controller:
@Get(':id')
findOne(@Param('id', ParseUUIDPipe) id: string) {
  return this.service.findOne(id);
}
```

### Example 3: Public Route Decorator

```typescript
// src/common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Usage:
@Public()
@Get('health')
healthCheck() {
  return { status: 'ok' };
}

// In JwtAuthGuard:
if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
  context.getHandler(),
  context.getClass(),
])) {
  return true;
}
```

### Example 4: OnApplicationShutdown Hook

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, OnApplicationShutdown, Logger } from '@nestjs/common';

@Injectable()
export class PrismaService extends PrismaClient 
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown {
  
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('✅ Database disconnected');
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Application shutting down: ${signal}`);
    await this.$disconnect();
    this.logger.log('✅ Database disconnected on shutdown');
  }
}
```

---

## 7. Summary

### Strengths
- ✅ Excellent module architecture
- ✅ Proper dependency injection
- ✅ Good use of guards, interceptors, and filters
- ✅ Proper lifecycle hook usage
- ✅ Good testing practices
- ✅ Security best practices followed

### Weaknesses
- ⚠️ Global providers not using APP_* tokens
- ⚠️ Missing custom pipes
- ⚠️ Limited custom decorators
- ⚠️ Missing OnApplicationShutdown hooks
- ⚠️ ScheduleModule imported but unused

### Overall Assessment

The codebase demonstrates **strong understanding and proper usage** of NestJS core features. The architecture is well-designed, and the code follows most best practices. The main areas for improvement are:

1. **Consistency** - Using APP_* tokens for global providers
2. **Completeness** - Adding custom pipes and more decorators
3. **Resource Management** - Implementing OnApplicationShutdown hooks

**Recommendation:** Address Priority 1 and Priority 2 items to bring the codebase to excellent NestJS standards.

---

## 8. Next Steps

1. Review this document with the team
2. Prioritize improvements based on project needs
3. Create GitHub issues for high-priority items
4. Implement improvements incrementally
5. Update this document as improvements are made

---

**Review Completed:** November 25, 2025

