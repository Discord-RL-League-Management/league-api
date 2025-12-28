# Organization Management Flow
# Feature: Organization Creation and Management
# 
# As a league participant
# I want to create and manage organizations
# So that teams can be organized within leagues

@organization-management
Feature: Organization Management

  Background:
    Given the API is running
    And an authenticated user with valid JWT token
    And a league exists with ID "league123"

  @organization @list
  Scenario: User lists organizations in a league
    Given a user has access to league "league123"
    When the user requests "GET /api/leagues/league123/organizations"
    Then the API should return list of organizations in the league

  @organization @read
  Scenario: User retrieves organization details
    Given an organization exists with ID "org123"
    When the user requests "GET /api/organizations/org123"
    Then the API should return organization details
    And the details should include name, tag, and description

  @organization @teams
  Scenario: User lists teams in an organization
    Given an organization exists with ID "org123"
    When the user requests "GET /api/organizations/org123/teams"
    Then the API should return list of teams in the organization

  @organization @stats
  Scenario: User retrieves organization statistics
    Given an organization exists with ID "org123"
    When the user requests "GET /api/organizations/org123/stats"
    Then the API should return organization statistics
    And the statistics should include team count and member count

  @organization @create
  Scenario: User creates a new organization
    Given a user has access to league "league123"
    When the user requests "POST /api/leagues/league123/organizations" with organization data
    Then the API should create the organization
    And the API should assign the creator as General Manager
    And the API should return the created organization with 201 status

  @organization @update @gm
  Scenario: General Manager updates organization
    Given an organization exists with ID "org123"
    And the authenticated user is General Manager of organization "org123"
    When the user requests "PATCH /api/organizations/org123" with updated data
    Then the API should validate user is General Manager
    And the API should update the organization
    And the API should return the updated organization

  @organization @delete @gm
  Scenario: General Manager deletes organization without teams
    Given an organization exists with ID "org123"
    And the organization has no teams
    And the authenticated user is General Manager of organization "org123"
    When the user requests "DELETE /api/organizations/org123"
    Then the API should validate user is General Manager
    And the API should validate organization has no teams
    And the API should delete the organization
    And the API should return 204 No Content

  @organization @delete @teams
  Scenario: General Manager cannot delete organization with teams
    Given an organization exists with ID "org123"
    And the organization has teams
    And the authenticated user is General Manager of organization "org123"
    When the user requests "DELETE /api/organizations/org123"
    Then the API should return 400 Bad Request
    And the error message should indicate organization has teams

  @organization @transfer-team
  Scenario: General Manager transfers team to another organization
    Given an organization "org123" with team "team123"
    And an organization "org456" exists
    And the authenticated user is General Manager of either "org123" or "org456"
    When the user requests "POST /api/organizations/org123/teams/team123/transfer" with target organization
    Then the API should validate user is GM of source or target organization
    And the API should transfer the team
    And the API should return success response

  @organization @members @list
  Scenario: User lists organization members
    Given an organization exists with ID "org123"
    When the user requests "GET /api/organizations/org123/members"
    Then the API should return list of organization members

  @organization @members @add @gm
  Scenario: General Manager adds member to organization
    Given an organization exists with ID "org123"
    And the authenticated user is General Manager of organization "org123"
    When the user requests "POST /api/organizations/org123/members" with member data
    Then the API should validate user is General Manager
    And the API should add the member
    And the API should return the created member with 201 status

  @organization @members @update @gm
  Scenario: General Manager updates organization member
    Given an organization member exists with ID "member123"
    And the authenticated user is General Manager of the organization
    When the user requests "PATCH /api/organizations/org123/members/member123" with updated data
    Then the API should validate user is General Manager
    And the API should update the member
    And the API should return the updated member

  @organization @members @remove @gm
  Scenario: General Manager removes member from organization
    Given an organization member exists with ID "member123"
    And the authenticated user is General Manager of the organization
    And the organization has more than one General Manager
    When the user requests "DELETE /api/organizations/org123/members/member123"
    Then the API should validate user is General Manager
    And the API should validate not removing last GM
    And the API should remove the member
    And the API should return 204 No Content

  @organization @members @remove @last-gm
  Scenario: General Manager cannot remove last General Manager
    Given an organization exists with ID "org123"
    And the organization has only one General Manager
    And the authenticated user is that General Manager
    When the user requests "DELETE /api/organizations/org123/members/member123" where member is the last GM
    Then the API should return 400 Bad Request
    And the error message should indicate cannot remove last GM

  @organization @permission
  Scenario: Non-General Manager cannot update organization
    Given an organization exists with ID "org123"
    And the authenticated user is not General Manager
    When the user requests "PATCH /api/organizations/org123" with updated data
    Then the API should return 403 Forbidden
    And the error message should indicate GM access required

  # Bot API endpoints

  @bot @organizations @read
  Scenario: Bot retrieves an organization
    Given an authenticated bot with valid API key
    And an organization exists with ID "org123"
    When the bot requests "GET /internal/organizations/org123"
    Then the API should return the organization data

  @bot @organizations @create
  Scenario: Bot creates a new organization
    Given an authenticated bot with valid API key
    When the bot requests "POST /internal/organizations" with organization data
    Then the API should create the organization
    And the API should return the created organization with 201 status

  @bot @organizations @update
  Scenario: Bot updates an organization
    Given an authenticated bot with valid API key
    And an organization exists with ID "org123"
    When the bot requests "PATCH /internal/organizations/org123" with updated data
    Then the API should update the organization
    And the API should return the updated organization

  @bot @organizations @delete
  Scenario: Bot deletes an organization
    Given an authenticated bot with valid API key
    And an organization exists with ID "org123"
    When the bot requests "DELETE /internal/organizations/org123"
    Then the API should delete the organization
    And the API should return 204 No Content

  @bot @organizations @members
  Scenario: Bot manages organization members
    Given an authenticated bot with valid API key
    And an organization exists with ID "org123"
    When the bot requests "GET /internal/organizations/org123/members"
    Then the API should return organization members
    When the bot requests "POST /internal/organizations/org123/members" with member data
    Then the API should add the member
    When the bot requests "PATCH /internal/organizations/org123/members/member123" with updated data
    Then the API should update the member
    When the bot requests "DELETE /internal/organizations/org123/members/member123"
    Then the API should remove the member


