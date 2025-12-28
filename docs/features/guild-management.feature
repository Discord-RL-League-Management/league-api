# Guild Management Flow
# Feature: Discord Guild Management and Settings
# 
# As a guild administrator
# I want to manage guild settings and view guild information
# So that I can configure league management for my Discord server

@guild-management
Feature: Guild Management

  Background:
    Given the API is running
    And an authenticated user with valid JWT token
    And the user is a member of guild "guild123"

  @guild @read
  Scenario: User retrieves guild details
    Given a user is a member of guild "guild123"
    When the user requests "GET /api/guilds/guild123"
    Then the API should validate user has access to the guild
    And the API should validate bot has access to the guild
    And the API should return guild details
    And the response should include member count

  @guild @settings @read @admin
  Scenario: Admin retrieves guild settings
    Given a user is a member of guild "guild123"
    And the user has admin role in guild "guild123"
    When the user requests "GET /api/guilds/guild123/settings"
    Then the API should validate user has access to the guild
    And the API should validate user has admin permissions
    And the API should ensure settings exist (creating defaults if needed)
    And the API should return guild settings

  @guild @channels @admin
  Scenario: Admin retrieves Discord channels for guild
    Given a user is a member of guild "guild123"
    And the user has admin role in guild "guild123"
    When the user requests "GET /api/guilds/guild123/channels"
    Then the API should validate user has access to the guild
    And the API should validate user has admin permissions
    And the API should fetch channels from Discord API
    And the API should return list of Discord channels

  @guild @roles @admin
  Scenario: Admin retrieves Discord roles for guild
    Given a user is a member of guild "guild123"
    And the user has admin role in guild "guild123"
    When the user requests "GET /api/guilds/guild123/roles"
    Then the API should validate user has access to the guild
    And the API should validate user has admin permissions
    And the API should fetch roles from Discord API
    And the API should return list of Discord roles

  @guild @access @validation
  Scenario: User without guild access is denied
    Given a user is not a member of guild "guild123"
    When the user requests "GET /api/guilds/guild123"
    Then the API should return 403 Forbidden
    And the error message should indicate access denied

  @guild @settings @permission
  Scenario: Non-admin user cannot access guild settings
    Given a user is a member of guild "guild123"
    And the user does not have admin role
    When the user requests "GET /api/guilds/guild123/settings"
    Then the API should return 403 Forbidden
    And the error message should indicate admin access required

  # Bot API endpoints

  @bot @guilds @read
  Scenario: Bot retrieves a guild
    Given an authenticated bot with valid API key
    And a guild exists with ID "guild123"
    When the bot requests "GET /internal/guilds/guild123"
    Then the API should return the guild data

  @bot @guilds @create
  Scenario: Bot creates a new guild
    Given an authenticated bot with valid API key
    When the bot requests "POST /internal/guilds" with guild data
    Then the API should validate guild does not already exist
    And the API should create guild with default settings
    And the API should return the created guild with 201 status

  @bot @guilds @update
  Scenario: Bot updates a guild
    Given an authenticated bot with valid API key
    And a guild exists with ID "guild123"
    When the bot requests "PATCH /internal/guilds/guild123" with updated data
    Then the API should update the guild
    And the API should return the updated guild

  @bot @guilds @delete
  Scenario: Bot deletes a guild
    Given an authenticated bot with valid API key
    And a guild exists with ID "guild123"
    When the bot requests "DELETE /internal/guilds/guild123"
    Then the API should delete the guild
    And the API should return 204 No Content


