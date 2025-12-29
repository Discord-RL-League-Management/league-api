# Team Management Flow
# Feature: Team Creation and Management
# 
# As a league participant
# I want to create and manage teams
# So that players can compete together in leagues

@team-management
Feature: Team Management

  Background:
    Given the API is running
    And an authenticated user with valid JWT token
    And a league exists with ID "league123"

  @team @list
  Scenario: User lists teams in a league
    Given a user has access to league "league123"
    When the user requests "GET /api/leagues/league123/teams"
    Then the API should return list of teams in the league

  @team @read
  Scenario: User retrieves team details
    Given a team exists with ID "team123"
    When the user requests "GET /api/teams/team123"
    Then the API should return team details
    And the details should include team name, tag, and members

  @team @create
  Scenario: User creates a new team
    Given a user has access to league "league123"
    When the user requests "POST /api/leagues/league123/teams" with team data
    Then the API should validate team requirements
    And the API should create the team
    And the API should assign the creator as team member
    And the API should return the created team with 201 status

  @team @update
  Scenario: User updates team information
    Given a team exists with ID "team123"
    And the authenticated user is a member of team "team123"
    When the user requests "PATCH /api/teams/team123" with updated data
    Then the API should validate user is team member
    And the API should update the team
    And the API should return the updated team

  @team @delete
  Scenario: User deletes a team
    Given a team exists with ID "team123"
    And the authenticated user is team owner
    When the user requests "DELETE /api/teams/team123"
    Then the API should validate user is team owner
    And the API should delete the team
    And the API should return 204 No Content

  @team @members @list
  Scenario: User lists team members
    Given a team exists with ID "team123"
    When the user requests "GET /api/teams/team123/members"
    Then the API should return list of team members

  @team @members @add
  Scenario: User adds member to team
    Given a team exists with ID "team123"
    And the authenticated user is team owner
    When the user requests "POST /api/teams/team123/members" with member data
    Then the API should validate user is team owner
    And the API should validate team size limits
    And the API should add the member
    And the API should return the created member with 201 status

  @team @members @remove
  Scenario: User removes member from team
    Given a team exists with ID "team123"
    And the authenticated user is team owner
    When the user requests "DELETE /api/teams/team123/members/member123"
    Then the API should validate user is team owner
    And the API should remove the member
    And the API should return 204 No Content

  @team @permission
  Scenario: Non-team member cannot update team
    Given a team exists with ID "team123"
    And the authenticated user is not a member of team "team123"
    When the user requests "PATCH /api/teams/team123" with updated data
    Then the API should return 403 Forbidden
    And the error message should indicate team membership required

  # Bot API endpoints

  @bot @teams @read
  Scenario: Bot retrieves a team
    Given an authenticated bot with valid API key
    And a team exists with ID "team123"
    When the bot requests "GET /internal/teams/team123"
    Then the API should return the team data

  @bot @teams @create
  Scenario: Bot creates a new team
    Given an authenticated bot with valid API key
    When the bot requests "POST /internal/teams" with team data
    Then the API should create the team
    And the API should return the created team with 201 status

  @bot @teams @update
  Scenario: Bot updates a team
    Given an authenticated bot with valid API key
    And a team exists with ID "team123"
    When the bot requests "PATCH /internal/teams/team123" with updated data
    Then the API should update the team
    And the API should return the updated team

  @bot @teams @delete
  Scenario: Bot deletes a team
    Given an authenticated bot with valid API key
    And a team exists with ID "team123"
    When the bot requests "DELETE /internal/teams/team123"
    Then the API should delete the team
    And the API should return 204 No Content


