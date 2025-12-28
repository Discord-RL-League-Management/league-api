# MatchesModule - Behavioral Contract

## Module: MatchesModule
**Location**: `src/matches/matches.module.ts`

## Purpose
Manages competitive matches between teams, including match creation, score recording, and match status management.

## Behavioral Contract

### Responsibilities
1. **Match CRUD Operations**: Create, read, update, delete matches
2. **Score Management**: Record and update match scores
3. **Match Status Management**: Track match status (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
4. **Statistics Updates**: Update team and player statistics based on match results

### Exported Services

#### MatchService
- **Purpose**: Core match management logic
- **Key Methods**:
  - `create(leagueId, createMatchDto, userId)`: Creates match (admin only)
  - `findAll(leagueId, filters)`: Lists matches in league
  - `findOne(id)`: Retrieves match by ID
  - `update(id, updateMatchDto, userId)`: Updates match (admin only)
  - `recordScore(id, scoreData, userId)`: Records match score (admin only)
  - `delete(id, userId)`: Deletes match (admin only)

### Controllers

#### MatchesController (User-facing)
- **Endpoints**:
  - `GET /api/leagues/:leagueId/matches`: Lists matches in league
  - `GET /api/matches/:id`: Returns match details
  - `POST /api/leagues/:leagueId/matches`: Creates match (admin only)
  - `PATCH /api/matches/:id`: Updates match (admin only)
  - `PATCH /api/matches/:id/score`: Records score (admin only)
  - `DELETE /api/matches/:id`: Deletes match (admin only)

### Behavioral Rules

1. **Match Creation**:
   - Only league admins can create matches
   - Teams must belong to the league
   - Match must have valid teams and scheduled time

2. **Score Recording**:
   - Only league admins can record scores
   - Score recording updates match status to COMPLETED
   - Statistics are updated for teams and players

3. **Match Status**:
   - Initial status is PENDING
   - Status transitions: PENDING → IN_PROGRESS → COMPLETED
   - Status can be set to CANCELLED at any time

4. **Match Updates**:
   - Only league admins can update matches
   - Updates must validate match state

### Related Features
- `features/match-management.feature`

### Related Implementation
- `src/matches/matches.controller.ts`
- `src/matches/services/match.service.ts`
- `src/matches/repositories/match.repository.ts`


