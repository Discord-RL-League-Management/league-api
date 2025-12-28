# Authentication Flow
# Feature: User Authentication and Authorization
# 
# As a Discord user
# I want to authenticate with the League Management API
# So that I can access my leagues, trackers, and profile

@authentication
Feature: User Authentication

  Background:
    Given the API is running
    And Discord OAuth is configured

  @oauth
  Scenario: User initiates Discord OAuth login
    Given a user wants to authenticate
    When the user visits "/auth/discord"
    Then they should be redirected to Discord authorization page
    And the OAuth flow should be initiated

  @oauth @callback
  Scenario: User completes Discord OAuth callback successfully
    Given a user has authorized the application on Discord
    When Discord redirects to "/auth/discord/callback" with authorization code
    Then the API should exchange the code for access and refresh tokens
    And the API should fetch user profile from Discord
    And the API should create or update the user in the database
    And the API should sync user guild memberships with roles
    And the API should generate a JWT token
    And the user should be redirected to frontend with JWT token

  @oauth @error
  Scenario: User denies authorization on Discord
    Given a user has denied authorization on Discord
    When Discord redirects to "/auth/discord/callback" with error
    Then the API should log the error
    And the user should be redirected to frontend error page

  @oauth @error
  Scenario: OAuth callback received without authorization code
    Given Discord has redirected to callback endpoint
    When the callback URL does not contain an authorization code
    Then the API should log an error
    And the user should be redirected to frontend error page

  @jwt
  Scenario: Authenticated user retrieves their profile
    Given an authenticated user with valid JWT token
    When the user requests "/auth/me"
    Then the API should return user profile data
    And the response should not include guild information

  @jwt
  Scenario: Authenticated user retrieves their guilds
    Given an authenticated user with valid JWT token
    When the user requests "/auth/guilds"
    Then the API should return user's available guilds
    And the guilds should include membership information

  @jwt @refresh
  Scenario: User refreshes expired JWT token
    Given an authenticated user with expired JWT token
    When the user requests "/auth/refresh" with refresh token
    Then the API should validate the refresh token
    And the API should generate a new JWT token
    And the API should return the new token

  @jwt @logout
  Scenario: User logs out
    Given an authenticated user with valid JWT token
    When the user requests "/auth/logout"
    Then the API should invalidate the refresh token
    And the API should return success response


