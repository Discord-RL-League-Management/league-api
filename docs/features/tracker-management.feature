# Tracker Management Flow
# Feature: Tracker Registration and Processing
# 
# As a user
# I want to register and manage my game tracker profiles
# So that my stats can be tracked for league participation

@tracker-management
Feature: Tracker Management

  Background:
    Given the API is running
    And an authenticated user with valid JWT token

  @tracker @register
  Scenario: User registers initial trackers (1-4 trackers)
    Given an authenticated user without existing trackers
    When the user requests "POST /api/trackers/register" with 1-4 tracker URLs
    Then the API should validate the URLs
    And the API should ensure user exists in database
    And the API should create tracker records
    And the API should enqueue trackers for scraping
    And the API should return the created trackers with 201 status

  @tracker @register @validation
  Scenario: User tries to register when trackers already exist
    Given an authenticated user with existing active trackers
    When the user requests "POST /api/trackers/register" with tracker URLs
    Then the API should return 400 Bad Request
    And the error message should indicate user already has trackers
    And the error message should suggest using add endpoint

  @tracker @add
  Scenario: User adds additional tracker (up to 4 total)
    Given an authenticated user with 1-3 existing trackers
    When the user requests "POST /api/trackers/add" with a new tracker URL
    Then the API should validate the URL
    And the API should validate tracker count limit (max 4)
    And the API should create the tracker record
    And the API should enqueue tracker for scraping
    And the API should return the created tracker with 201 status

  @tracker @add @limit
  Scenario: User tries to add tracker exceeding limit of 4
    Given an authenticated user with 4 existing trackers
    When the user requests "POST /api/trackers/add" with a new tracker URL
    Then the API should return 400 Bad Request
    And the error message should indicate maximum tracker limit reached

  @tracker @read
  Scenario: User retrieves their own trackers
    Given an authenticated user with trackers
    When the user requests "GET /api/trackers/me"
    Then the API should return the user's trackers
    And the trackers should include season information

  @tracker @read @filter
  Scenario: User filters trackers by guild
    Given an authenticated user
    When the user requests "GET /api/trackers?guildId=guild123"
    Then the API should return trackers for the specified guild

  @tracker @detail
  Scenario: User retrieves tracker details with seasons
    Given a tracker exists with ID "tracker123"
    When the user requests "GET /api/trackers/tracker123/detail"
    Then the API should return tracker details
    And the response should include seasons as a separate property

  @tracker @status
  Scenario: User checks tracker scraping status
    Given a tracker exists with ID "tracker123"
    When the user requests "GET /api/trackers/tracker123/status"
    Then the API should return scraping status
    And the status should include current scraping state

  @tracker @seasons
  Scenario: User retrieves tracker seasons
    Given a tracker exists with ID "tracker123"
    When the user requests "GET /api/trackers/tracker123/seasons"
    Then the API should return all seasons for the tracker
    And seasons should be ordered by season number

  @tracker @refresh
  Scenario: User triggers manual tracker refresh
    Given a tracker exists with ID "tracker123"
    And the tracker belongs to the authenticated user
    When the user requests "POST /api/trackers/tracker123/refresh"
    Then the API should validate user owns the tracker
    And the API should enqueue tracker for scraping
    And the API should return refresh job information

  @tracker @refresh @permission
  Scenario: User tries to refresh another user's tracker
    Given a tracker exists with ID "tracker123"
    And the tracker belongs to a different user
    When the authenticated user requests "POST /api/trackers/tracker123/refresh"
    Then the API should return 403 Forbidden
    And the error message should indicate ownership requirement

  @tracker @update
  Scenario: User updates tracker information
    Given a tracker exists with ID "tracker123"
    And the tracker belongs to the authenticated user
    When the user requests "PUT /api/trackers/tracker123" with updated data
    Then the API should validate user owns the tracker
    And the API should update the tracker
    And the API should return the updated tracker

  @tracker @delete
  Scenario: User deletes (soft deletes) their tracker
    Given a tracker exists with ID "tracker123"
    And the tracker belongs to the authenticated user
    When the user requests "DELETE /api/trackers/tracker123"
    Then the API should validate user owns the tracker
    And the API should soft delete the tracker (set isDeleted=true)
    And the API should return 204 No Content

  # Bot API endpoints

  @bot @trackers @register-multiple
  Scenario: Bot registers multiple trackers for a user
    Given an authenticated bot with valid API key
    When the bot requests "POST /internal/trackers/register-multiple" with user ID and URLs
    Then the API should ensure user exists
    And the API should create tracker records
    And the API should enqueue trackers for scraping
    And the API should return created trackers

  @bot @trackers @add
  Scenario: Bot adds a tracker for a user
    Given an authenticated bot with valid API key
    When the bot requests "POST /internal/trackers/add" with tracker data
    Then the API should validate tracker count limit
    And the API should create the tracker
    And the API should enqueue tracker for scraping

  @bot @trackers @process
  Scenario: Bot processes all pending trackers
    Given an authenticated bot with valid API key
    And there are pending trackers
    When the bot requests "POST /internal/trackers/process-pending"
    Then the API should enqueue all pending trackers for processing

  @bot @trackers @process-guild
  Scenario: Bot processes pending trackers for a guild
    Given an authenticated bot with valid API key
    And there are pending trackers for guild "guild123"
    When the bot requests "POST /internal/trackers/process" with guild ID
    Then the API should enqueue pending trackers for the specified guild

  @bot @trackers @schedule
  Scenario: Bot schedules tracker processing for a guild
    Given an authenticated bot with valid API key
    When the bot requests "POST /internal/trackers/schedule" with schedule data
    Then the API should create a scheduled processing job
    And the API should return the scheduled job details

  @bot @trackers @schedule-list
  Scenario: Bot retrieves scheduled processing jobs for a guild
    Given an authenticated bot with valid API key
    And there are scheduled jobs for guild "guild123"
    When the bot requests "GET /internal/trackers/schedule/guild/guild123"
    Then the API should return scheduled jobs for the guild
    And the response can be filtered by status

  @bot @trackers @schedule-cancel
  Scenario: Bot cancels a scheduled processing job
    Given an authenticated bot with valid API key
    And a scheduled job exists with ID "schedule123"
    When the bot requests "POST /internal/trackers/schedule/schedule123/cancel"
    Then the API should cancel the scheduled job
    And the API should return success response


