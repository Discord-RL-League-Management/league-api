# User Management Flow
# Feature: User Profile and Data Management
# 
# As a user
# I want to manage my profile and user data
# So that I can keep my information up to date

@user-management
Feature: User Profile Management

  Background:
    Given the API is running
    And an authenticated user with valid JWT token

  @profile @read
  Scenario: User retrieves their own profile
    Given an authenticated user
    When the user requests "GET /api/profile"
    Then the API should return the user's profile data
    And the profile should include username, avatar, and email

  @profile @stats
  Scenario: User retrieves their statistics
    Given an authenticated user
    When the user requests "GET /api/profile/stats"
    Then the API should return user statistics
    And the statistics should include games played, wins, losses, and win rate

  @profile @update
  Scenario: User updates their profile settings
    Given an authenticated user
    When the user requests "PATCH /api/profile/settings" with new settings
    Then the API should update the user's settings
    And the API should return the updated settings

  @user-data @read
  Scenario: User retrieves their own user data
    Given an authenticated user with ID "user123"
    When the user requests "GET /api/users/me"
    Then the API should return the user's data
    And the user ID should match "user123"

  @user-data @update
  Scenario: User updates their own user data
    Given an authenticated user
    When the user requests "PATCH /api/users/me" with updated username
    Then the API should update the user's username
    And the API should return the updated user data

  @user-data @security
  Scenario: User tries to access another user's data
    Given an authenticated user with ID "user123"
    When the user requests "GET /api/users/user456"
    Then the API should return 403 Forbidden
    And the error message should indicate access denied

  # Bot API endpoints

  @bot @users @list
  Scenario: Bot lists all users
    Given an authenticated bot with valid API key
    When the bot requests "GET /internal/users"
    Then the API should return a list of all users

  @bot @users @read
  Scenario: Bot retrieves a specific user
    Given an authenticated bot with valid API key
    And a user exists with ID "user123"
    When the bot requests "GET /internal/users/user123"
    Then the API should return the user data

  @bot @users @create
  Scenario: Bot creates a new user
    Given an authenticated bot with valid API key
    When the bot requests "POST /internal/users" with user data
    Then the API should create a new user
    And the API should return the created user with 201 status

  @bot @users @update
  Scenario: Bot updates a user
    Given an authenticated bot with valid API key
    And a user exists with ID "user123"
    When the bot requests "PATCH /internal/users/user123" with updated data
    Then the API should update the user
    And the API should return the updated user

  @bot @users @delete
  Scenario: Bot deletes a user
    Given an authenticated bot with valid API key
    And a user exists with ID "user123"
    When the bot requests "DELETE /internal/users/user123"
    Then the API should delete the user
    And the API should return 204 No Content


