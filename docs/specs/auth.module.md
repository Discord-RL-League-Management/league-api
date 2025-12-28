# AuthModule - Behavioral Contract

## Module: AuthModule
**Location**: `src/auth/auth.module.ts`

## Purpose
Provides authentication and authorization services for the League Management API, including Discord OAuth2 integration, JWT token management, and user session handling.

## Behavioral Contract

### Responsibilities
1. **OAuth Flow Management**: Handle Discord OAuth2 authentication flow (initiation, callback, token exchange)
2. **User Authentication**: Validate Discord users and create/update user records
3. **Token Management**: Generate, refresh, and invalidate JWT tokens
4. **User Session Management**: Manage user sessions and authentication state
5. **Guild Synchronization**: Sync user guild memberships and roles during OAuth callback

### Exported Services

#### AuthService
- **Purpose**: Core authentication logic
- **Key Methods**:
  - `validateDiscordUser(data)`: Validates and creates/updates user from Discord profile
  - `login(user)`: Generates JWT token for authenticated user
  - `validateUser(userId)`: Validates user exists and is active

#### DiscordOAuthService
- **Purpose**: Discord OAuth2 integration
- **Key Methods**:
  - `getAuthorizationUrl()`: Generates Discord authorization URL
  - `exchangeCode(code)`: Exchanges authorization code for access/refresh tokens
  - `getUserProfile(accessToken)`: Fetches user profile from Discord API

#### TokenManagementService
- **Purpose**: JWT token lifecycle management
- **Key Methods**:
  - `generateTokens(user)`: Generates JWT access and refresh tokens
  - `refreshToken(refreshToken)`: Validates and refreshes JWT token
  - `invalidateToken(token)`: Invalidates a token (logout)

### Controllers

#### AuthController
- **Endpoints**:
  - `GET /auth/discord`: Initiates OAuth flow
  - `GET /auth/discord/callback`: Handles OAuth callback
  - `GET /auth/me`: Returns current authenticated user profile
  - `GET /auth/guilds`: Returns user's available guilds
  - `POST /auth/refresh`: Refreshes JWT token
  - `POST /auth/logout`: Invalidates refresh token

### Guards

#### JwtAuthGuard
- **Purpose**: Validates JWT token on protected routes
- **Behavior**: Extracts JWT from Authorization header, validates token, attaches user to request

#### BotAuthGuard
- **Purpose**: Validates bot API key on internal routes
- **Behavior**: Validates API key from Authorization header

### Dependencies
- **DiscordModule**: For Discord API access
- **UserGuildsModule**: For guild membership synchronization
- **GuildsService**: For guild validation
- **ConfigService**: For OAuth configuration

### Behavioral Rules

1. **OAuth Callback**:
   - Must exchange authorization code for tokens
   - Must fetch user profile from Discord
   - Must create or update user in database
   - Must sync guild memberships with roles
   - Must generate JWT token
   - Must redirect to frontend with token or error

2. **Token Generation**:
   - JWT must include user ID, username, and Discord ID
   - Refresh token must be stored securely
   - Tokens must have expiration times

3. **Authentication**:
   - User profile endpoint (`/auth/me`) must not include guild information
   - Guild information must be separate endpoint (`/auth/guilds`)
   - OAuth errors must be logged and user redirected to error page

### Related Features
- `features/authentication.feature`

### Related Implementation
- `src/auth/auth.service.ts`
- `src/auth/auth.controller.ts`
- `src/auth/services/discord-oauth.service.ts`
- `src/auth/services/token-management.service.ts`
- `src/auth/guards/jwt-auth.guard.ts`
- `src/auth/guards/bot-auth.guard.ts`


