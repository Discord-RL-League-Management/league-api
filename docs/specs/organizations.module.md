# OrganizationsModule - Behavioral Contract

## Module: OrganizationsModule
**Location**: `src/organizations/organizations.module.ts`

## Purpose
Manages organizations within leagues, providing structure for teams and members with role-based access control.

## Behavioral Contract

### Responsibilities
1. **Organization CRUD Operations**: Create, read, update, delete organizations
2. **Member Management**: Add, update, remove organization members
3. **Role Management**: Manage General Manager and Member roles
4. **Team Transfer**: Transfer teams between organizations
5. **Statistics**: Provide organization statistics

### Exported Services

#### OrganizationService
- **Purpose**: Core organization management logic
- **Key Methods**:
  - `create(leagueId, createOrgDto, userId)`: Creates organization and assigns creator as GM
  - `findAll(leagueId)`: Lists organizations in league
  - `findOne(id)`: Retrieves organization by ID
  - `update(id, updateOrgDto, userId)`: Updates organization (GM only)
  - `delete(id, userId)`: Deletes organization (GM only, must have no teams)

#### OrganizationMemberService
- **Purpose**: Organization member management
- **Key Methods**:
  - `addMember(orgId, memberData, userId)`: Adds member (GM only)
  - `updateMember(orgId, memberId, data, userId)`: Updates member (GM only)
  - `removeMember(orgId, memberId, userId)`: Removes member (GM only, cannot remove last GM)

### Controllers

#### OrganizationsController (User-facing)
- **Endpoints**:
  - `GET /api/leagues/:leagueId/organizations`: Lists organizations in league
  - `GET /api/organizations/:id`: Returns organization details
  - `GET /api/organizations/:id/teams`: Lists teams in organization
  - `GET /api/organizations/:id/stats`: Returns organization statistics
  - `POST /api/leagues/:leagueId/organizations`: Creates organization
  - `PATCH /api/organizations/:id`: Updates organization (GM only)
  - `DELETE /api/organizations/:id`: Deletes organization (GM only, no teams)
  - `POST /api/organizations/:id/teams/:teamId/transfer`: Transfers team (GM of source/target)
  - `GET /api/organizations/:id/members`: Lists organization members
  - `POST /api/organizations/:id/members`: Adds member (GM only)
  - `PATCH /api/organizations/:id/members/:memberId`: Updates member (GM only)
  - `DELETE /api/organizations/:id/members/:memberId`: Removes member (GM only)

#### InternalOrganizationsController (Bot-facing)
- **Endpoints**: Full CRUD operations for organizations and members

### Behavioral Rules

1. **Organization Creation**:
   - Creator automatically becomes General Manager
   - Organization must belong to a league
   - Organization name and tag must be unique within league

2. **General Manager Permissions**:
   - GM can update organization
   - GM can manage members
   - GM can transfer teams (source or target org)
   - Last GM cannot be removed

3. **Organization Deletion**:
   - Organization must have no teams to be deleted
   - Only GM can delete organization
   - Attempt to delete with teams returns 400 Bad Request

4. **Team Transfer**:
   - GM of source organization can transfer team
   - GM of target organization can accept transfer
   - Transfer must validate both organizations exist in same league

5. **Member Management**:
   - GM can add/update/remove members
   - Cannot remove last General Manager
   - Member roles: GENERAL_MANAGER, MEMBER
   - Member statuses: ACTIVE, INACTIVE, SUSPENDED, REMOVED

### Related Features
- `features/organization-management.feature`

### Related Implementation
- `src/organizations/organizations.controller.ts`
- `src/organizations/services/organization.service.ts`
- `src/organizations/services/organization-member.service.ts`
- `src/organizations/repositories/organization.repository.ts`


