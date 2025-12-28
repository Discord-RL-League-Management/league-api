# League Management Flow
# Feature: League Creation and Management
# 
# As a league administrator
# I want to create and manage leagues
# So that players can organize competitive matches

@league-management
Feature: League Management

  Background:
    Given the API is running
    And an authenticated user with valid JWT token
    And the user is a member of guild "guild123"

  @league @list
  Scenario: User lists leagues in a guild
    Given a user is a member of guild "guild123"
    When the user requests "GET /api/leagues/guild/guild123"
    Then the API should validate user has access to the guild
    And the API should return paginated list of leagues
    And the response should include pagination metadata

  @league @list @filters
  Scenario: User filters leagues by status and game
    Given a user is a member of guild "guild123"
    When the user requests "GET /api/leagues/guild/guild123?status=ACTIVE&game=ROCKET_LEAGUE"
    Then the API should return only active Rocket League leagues
    And the response should be paginated

  @league @read
  Scenario: User retrieves league details
    Given a league exists with ID "league123"
    When the user requests "GET /api/leagues/league123"
    Then the API should return league details
    And the details should include league name, status, and game type

  @league @create @admin
  Scenario: Admin creates a new league
    Given a user is a member of guild "guild123"
    And the user has admin role in guild "guild123"
    When the user requests "POST /api/leagues" with league data
    Then the API should validate user has admin permissions
    And the API should create league with default settings
    And the API should set createdBy to user ID
    And the API should return the created league with 201 status

  @league @update @admin
  Scenario: Admin updates a league
    Given a league exists with ID "league123"
    And a user has admin role in the league's guild
    When the user requests "PATCH /api/leagues/league123" with updated data
    Then the API should validate user has admin permissions
    And the API should update the league
    And the API should return the updated league

  @league @status @admin
  Scenario: Admin updates league status
    Given a league exists with ID "league123" with status "ACTIVE"
    And a user has admin role in the league's guild
    When the user requests "PATCH /api/leagues/league123/status" with status "PAUSED"
    Then the API should validate user has admin permissions
    And the API should update the league status
    And the API should return the updated league

  @league @delete @admin
  Scenario: Admin deletes a league
    Given a league exists with ID "league123"
    And a user has admin role in the league's guild
    When the user requests "DELETE /api/leagues/league123"
    Then the API should validate user has admin permissions
    And the API should delete the league
    And the API should return 204 No Content

  @league @settings @read @admin
  Scenario: Admin retrieves league settings
    Given a league exists with ID "league123"
    And a user has admin role in the league's guild
    When the user requests "GET /api/leagues/league123/settings"
    Then the API should validate user has admin permissions
    And the API should return league settings

  @league @settings @update @admin
  Scenario: Admin updates league settings
    Given a league exists with ID "league123"
    And a user has admin role in the league's guild
    When the user requests "PATCH /api/leagues/league123/settings" with updated settings
    Then the API should validate user has admin permissions
    And the API should validate the settings structure
    And the API should update the league settings
    And the API should return the updated settings

  @league @permission
  Scenario: Non-admin user cannot create league
    Given a user is a member of guild "guild123"
    And the user does not have admin role
    When the user requests "POST /api/leagues" with league data
    Then the API should return 403 Forbidden
    And the error message should indicate admin access required

  # Bot API endpoints

  @bot @leagues @read
  Scenario: Bot retrieves a league
    Given an authenticated bot with valid API key
    And a league exists with ID "league123"
    When the bot requests "GET /internal/leagues/league123"
    Then the API should return the league data

  @bot @leagues @create
  Scenario: Bot creates a new league
    Given an authenticated bot with valid API key
    When the bot requests "POST /internal/leagues" with league data
    Then the API should create league with default settings
    And the API should return the created league with 201 status

  @bot @leagues @update
  Scenario: Bot updates a league
    Given an authenticated bot with valid API key
    And a league exists with ID "league123"
    When the bot requests "PATCH /internal/leagues/league123" with updated data
    Then the API should update the league
    And the API should return the updated league

  @bot @leagues @delete
  Scenario: Bot deletes a league
    Given an authenticated bot with valid API key
    And a league exists with ID "league123"
    When the bot requests "DELETE /internal/leagues/league123"
    Then the API should delete the league
    And the API should return 204 No Content

  @bot @leagues @settings
  Scenario: Bot manages league settings
    Given an authenticated bot with valid API key
    And a league exists with ID "league123"
    When the bot requests "GET /internal/leagues/league123/settings"
    Then the API should return league settings
    When the bot requests "PATCH /internal/leagues/league123/settings" with updated settings
    Then the API should update the league settings
    And the API should return the updated settings


