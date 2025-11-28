import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

export class OrganizationNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Organization with ID ${id} not found`);
  }
}

export class OrganizationMemberNotFoundException extends NotFoundException {
  constructor(memberId: string) {
    super(`Organization member with ID ${memberId} not found`);
  }
}

export class OrganizationHasTeamsException extends BadRequestException {
  constructor(organizationId: string) {
    super(
      `Cannot delete organization ${organizationId} because it has teams assigned`,
    );
  }
}

export class NoGeneralManagerException extends BadRequestException {
  constructor(organizationId: string) {
    super(
      `Organization ${organizationId} must have at least one General Manager`,
    );
  }
}

export class CannotRemoveLastGeneralManagerException extends BadRequestException {
  constructor(organizationId: string) {
    super(
      `Cannot remove the last General Manager from organization ${organizationId}`,
    );
  }
}

export class PlayerAlreadyInOrganizationException extends BadRequestException {
  constructor(playerId: string, leagueId: string) {
    super(
      `Player ${playerId} is already in an organization in league ${leagueId}`,
    );
  }
}

export class NotGeneralManagerException extends ForbiddenException {
  constructor(organizationId: string) {
    super(`User is not a General Manager of organization ${organizationId}`);
  }
}

export class OrganizationCapacityExceededException extends BadRequestException {
  constructor(organizationId: string, maxTeams: number) {
    super(
      `Organization ${organizationId} has reached maximum capacity of ${maxTeams} teams`,
    );
  }
}

export class LeagueOrganizationCapacityExceededException extends BadRequestException {
  constructor(leagueId: string, maxOrganizations: number) {
    super(
      `League ${leagueId} has reached maximum capacity of ${maxOrganizations} organizations`,
    );
  }
}
