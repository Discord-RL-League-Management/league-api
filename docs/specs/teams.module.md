# TeamsModule - Behavioral Contract

## Module: TeamsModule
**Location**: `src/teams/teams.module.ts`

## Purpose
Manages teams within leagues and organizations, including team creation, member management, and team operations.

## Behavioral Contract

### Responsibilities
1. **Team CRUD Operations**: Create, read, update, delete teams
2. **Team Member Management**: Add and remove team members
3. **Team Validation**: Validate team requirements and constraints
4. **Organization Assignment**: Assign teams to organizations

### Exported Services

#### TeamService
- **Purpose**: Core team management logic
- **Key Methods**:
  - `create(leagueId, createTeamDto, userId)`: Creates team and assigns creator
  - `findAll(leagueId)`: Lists teams in league
  - `findOne(id)`: Retrieves team by ID
  - `update(id, updateTeamDto, userId)`: Updates team (member only)
  - `delete(id, userId)`: Deletes team (owner only)

#### TeamValidationService
- **Purpose**: Team validation logic
- **Key Methods**:
  - `validateTeamSize(team, newMemberCount)`: Validates team size limits
  - `validateTeamRequirements(team)`: Validates team meets league requirements

### Controllers

#### TeamsController (User-facing)
- **Endpoints**:
  - `GET /api/leagues/:leagueId/teams`: Lists teams in league
  - `GET /api/teams/:id`: Returns team details
  - `POST /api/leagues/:leagueId/teams`: Creates team
  - `PATCH /api/teams/:id`: Updates team (member only)
  - `DELETE /api/teams/:id`: Deletes team (owner only)
  - `GET /api/teams/:id/members`: Lists team members
  - `POST /api/teams/:id/members`: Adds team member (owner only)
  - `DELETE /api/teams/:id/members/:memberId`: Removes team member (owner only)

#### InternalTeamsController (Bot-facing)
- **Endpoints**: Full CRUD operations for teams

### Behavioral Rules

1. **Team Creation**:
   - Creator is automatically assigned as team member
   - Team must belong to a league
   - Team may belong to an organization

2. **Team Updates**:
   - Only team members can update team information
   - Updates must validate team constraints

3. **Team Deletion**:
   - Only team owner can delete team
   - Deletion may have cascading effects on related entities

4. **Member Management**:
   - Only team owner can add/remove members
   - Team size must respect league limits
   - Members must meet league requirements (if applicable)

### Related Features
- `features/team-management.feature`

### Related Implementation
- `src/teams/teams.controller.ts`
- `src/teams/services/team.service.ts`
- `src/teams/services/team-validation.service.ts`
- `src/teams/repositories/team.repository.ts`


