# Match Management Flow
# Feature: Match Creation and Tracking
# 
# As a league administrator
# I want to create and track matches
# So that league standings and statistics can be maintained

@match-management
Feature: Match Management

  Background:
    Given the API is running
    And an authenticated user with valid JWT token
    And a league exists with ID "league123"

  @match @list
  Scenario: User lists matches in a league
    Given a user has access to league "league123"
    When the user requests "GET /api/leagues/league123/matches"
    Then the API should return list of matches in the league
    And the response should be paginated

  @match @read
  Scenario: User retrieves match details
    Given a match exists with ID "match123"
    When the user requests "GET /api/matches/match123"
    Then the API should return match details
    And the details should include teams, scores, and status

  @match @create @admin
  Scenario: Admin creates a new match
    Given a user has admin role in league "league123"
    And two teams exist in the league
    When the user requests "POST /api/leagues/league123/matches" with match data
    Then the API should validate user has admin permissions
    And the API should validate teams belong to the league
    And the API should create the match
    And the API should return the created match with 201 status

  @match @update @admin
  Scenario: Admin updates match information
    Given a match exists with ID "match123"
    And the authenticated user has admin role in the league
    When the user requests "PATCH /api/matches/match123" with updated data
    Then the API should validate user has admin permissions
    And the API should update the match
    And the API should return the updated match

  @match @score @admin
  Scenario: Admin records match score
    Given a match exists with ID "match123" with status "PENDING"
    And the authenticated user has admin role in the league
    When the user requests "PATCH /api/matches/match123/score" with score data
    Then the API should validate user has admin permissions
    And the API should update the match score
    And the API should update match status to "COMPLETED"
    And the API should update team statistics
    And the API should return the updated match

  @match @delete @admin
  Scenario: Admin deletes a match
    Given a match exists with ID "match123"
    And the authenticated user has admin role in the league
    When the user requests "DELETE /api/matches/match123"
    Then the API should validate user has admin permissions
    And the API should delete the match
    And the API should return 204 No Content

  @match @permission
  Scenario: Non-admin user cannot create match
    Given a user does not have admin role in league "league123"
    When the user requests "POST /api/leagues/league123/matches" with match data
    Then the API should return 403 Forbidden
    And the error message should indicate admin access required

  # Bot API endpoints

  @bot @matches @read
  Scenario: Bot retrieves a match
    Given an authenticated bot with valid API key
    And a match exists with ID "match123"
    When the bot requests "GET /internal/matches/match123"
    Then the API should return the match data

  @bot @matches @create
  Scenario: Bot creates a new match
    Given an authenticated bot with valid API key
    When the bot requests "POST /internal/matches" with match data
    Then the API should create the match
    And the API should return the created match with 201 status

  @bot @matches @update
  Scenario: Bot updates a match
    Given an authenticated bot with valid API key
    And a match exists with ID "match123"
    When the bot requests "PATCH /internal/matches/match123" with updated data
    Then the API should update the match
    And the API should return the updated match

  @bot @matches @delete
  Scenario: Bot deletes a match
    Given an authenticated bot with valid API key
    And a match exists with ID "match123"
    When the bot requests "DELETE /internal/matches/match123"
    Then the API should delete the match
    And the API should return 204 No Content


