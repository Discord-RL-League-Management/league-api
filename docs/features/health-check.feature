# Health Check Flow
# Feature: System Health Monitoring
# 
# As a system administrator
# I want to check system health
# So that I can monitor API availability and dependencies

@health-check
Feature: System Health Monitoring

  Background:
    Given the API is running

  @health @public
  Scenario: Public user checks API health
    When a request is made to "GET /health"
    Then the API should return health status
    And the response should include status "ok"
    And the response should include timestamp
    And the response should include uptime
    And the response should include environment
    And the response should include version

  @health @bot
  Scenario: Bot checks internal health
    Given an authenticated bot with valid API key
    When the bot requests "GET /internal/health"
    Then the API should return bot-specific health status
    And the response should include system status


