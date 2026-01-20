# Discord Bot Integration Guide: Webhook-Based Notifications

## Overview

The API sends all notifications to the bot service via webhooks. The bot service is responsible for constructing and sending all Discord messages. The API never directly calls Discord's API.

**The bot's responsibility:** 
- Receive webhook notifications from the API
- Parse structured data from webhooks
- Construct and send Discord messages (DMs, channel messages, ephemeral follow-ups)

**The API's responsibility:** 
- Provide structured data via webhook POST requests
- Handle webhook failures gracefully (log but don't throw)

---

## Webhook Endpoints

The bot service must implement the following webhook endpoints:

### 1. POST `/webhooks/tracker-scraping-complete`

Sent when a tracker finishes scraping successfully.

**Headers:**
- `Authorization: Bearer {botApiKey}`
- `Content-Type: application/json`

**Payload:**
```json
{
  "type": "tracker_scraping_complete",
  "userId": "user_123",
  "trackerId": "tracker_123",
  "tracker": {
    "url": "https://rocketleague.tracker.network/rocket-league/profile/steam/user1/overview",
    "platform": "STEAM",
    "game": "ROCKET_LEAGUE",
    "username": "user1"
  },
  "user": {
    "id": "user_123",
    "username": "testuser",
    "globalName": "Test User"
  },
  "seasonsScraped": 5,
  "seasonsFailed": 0,
  "frontendUrl": "https://example.com"
}
```

**Bot Action:** Send a DM to the user with a success notification embed.

---

### 2. POST `/webhooks/tracker-scraping-failed`

Sent when a tracker fails to scrape.

**Headers:**
- `Authorization: Bearer {botApiKey}`
- `Content-Type: application/json`

**Payload:**
```json
{
  "type": "tracker_scraping_failed",
  "userId": "user_123",
  "trackerId": "tracker_123",
  "tracker": {
    "url": "https://rocketleague.tracker.network/rocket-league/profile/steam/user1/overview",
    "platform": "STEAM",
    "game": "ROCKET_LEAGUE",
    "username": "user1",
    "registrationInteractionToken": "token_123",
    "registrationChannelId": "channel_123"
  },
  "user": {
    "id": "user_123",
    "username": "testuser",
    "globalName": "Test User"
  },
  "error": "Tracker profile not found or inaccessible",
  "frontendUrl": "https://example.com"
}
```

**Bot Action:** 
- If `registrationInteractionToken` is present, send an ephemeral follow-up message in the channel
- Otherwise, send a DM to the user with an error notification embed

---

### 3. POST `/webhooks/registration-summary`

Sent when all trackers from a force-processed registration complete (either successfully or with failures).

**When the Summary is Sent:**

The summary is sent **automatically** by the API when:
1. `forceProcess: true` was passed in the initial registration request
2. `interactionToken` was provided in the initial registration request
3. **All trackers** from that registration have completed processing (status is `COMPLETED` or `FAILED`)

**Important:** The summary is sent asynchronously - it may arrive seconds or minutes after the initial HTTP response, depending on how long tracker processing takes.

**Headers:**
- `Authorization: Bearer {botApiKey}`
- `Content-Type: application/json`

**Payload:**
```json
{
  "interactionToken": "discord_interaction_token",
  "applicationId": "discord_application_id",
  "summary": {
    "total": 3,
    "successful": 2,
    "failed": 1,
    "trackers": [
      {
        "url": "https://rocketleague.tracker.network/rocket-league/profile/steam/user1/overview",
        "platform": "STEAM",
        "status": "COMPLETED"
      },
      {
        "url": "https://rocketleague.tracker.network/rocket-league/profile/epic/user1/overview",
        "platform": "EPIC",
        "status": "COMPLETED"
      },
      {
        "url": "https://rocketleague.tracker.network/rocket-league/profile/xbox/user1/overview",
        "platform": "XBOX",
        "status": "FAILED",
        "error": "Tracker profile not found or inaccessible"
      }
    ]
  }
}
```

**Bot Action:** Send an ephemeral follow-up message using the `interactionToken` with a formatted embed showing the registration summary.

---

## Webhook Implementation Requirements

### 1. Authentication

All webhook endpoints must:
- Verify the `Authorization: Bearer {botApiKey}` header
- Reject requests with invalid or missing API keys
- Return `401 Unauthorized` for authentication failures

### 2. Error Handling

- Return appropriate HTTP status codes:
  - `200 OK` - Webhook processed successfully
  - `400 Bad Request` - Invalid payload structure
  - `401 Unauthorized` - Invalid or missing API key
  - `500 Internal Server Error` - Bot service error

- Handle webhook processing errors gracefully:
  - Log errors for debugging
  - Don't throw errors that would cause the API to retry unnecessarily
  - The API will log webhook failures but won't retry

### 3. Message Construction

The bot is responsible for:
- Building Discord embeds from the structured data
- Choosing appropriate message delivery method (DM, channel message, ephemeral follow-up)
- Formatting user-friendly messages
- Handling edge cases (missing data, invalid formats, etc.)

### 4. Rate Limiting

The bot should handle:
- Discord API rate limits when sending messages
- Queueing messages if necessary
- Retrying failed message sends (with exponential backoff)

---

## Field Descriptions

### Tracker Scraping Complete/Failed

- **`type`** (string): Event type (`tracker_scraping_complete` or `tracker_scraping_failed`)
- **`userId`** (string): Internal user ID
- **`trackerId`** (string): Internal tracker ID
- **`tracker.url`** (string): The tracker URL
- **`tracker.platform`** (string): Platform name (e.g., `STEAM`, `EPIC`, `XBOX`, `PSN`)
- **`tracker.game`** (string): Game name (e.g., `ROCKET_LEAGUE`)
- **`tracker.username`** (string): Username from tracker
- **`tracker.registrationInteractionToken`** (string, optional): Discord interaction token if registered by staff
- **`tracker.registrationChannelId`** (string, optional): Discord channel ID if registered by staff
- **`user.id`** (string): Internal user ID
- **`user.username`** (string): Discord username
- **`user.globalName`** (string, optional): Discord global name
- **`seasonsScraped`** (number): Number of seasons successfully scraped (complete only)
- **`seasonsFailed`** (number): Number of seasons that failed to scrape (complete only)
- **`error`** (string): Error message (failed only)
- **`frontendUrl`** (string): Frontend URL for links

### Registration Summary

- **`interactionToken`** (string): Discord interaction token for ephemeral follow-up
- **`applicationId`** (string): Discord application ID (may be empty string)
- **`summary.total`** (number): Total number of trackers in the registration
- **`summary.successful`** (number): Number of trackers that completed successfully (`COMPLETED` status)
- **`summary.failed`** (number): Number of trackers that failed (`FAILED` status)
- **`summary.trackers`** (array): Array of tracker objects with:
  - **`url`** (string): The tracker URL
  - **`platform`** (string): Platform name (e.g., `STEAM`, `EPIC`, `XBOX`, `PSN`)
  - **`status`** (string): Either `"COMPLETED"` or `"FAILED"`
  - **`error`** (string, optional): Error message if status is `FAILED`

---

## Bot Implementation Examples

### Example: Tracker Scraping Complete

```typescript
// Example in TypeScript (adapt to your bot's language)

async function handleTrackerScrapingComplete(payload: TrackerScrapingCompletePayload) {
  const embed = {
    title: 'Tracker Data Scraped Successfully',
    description: `Your tracker data has been successfully collected and updated.`,
    color: 0x00ff00, // Green
    fields: [
      {
        name: 'Tracker',
        value: payload.tracker.url,
        inline: false,
      },
      {
        name: 'Platform',
        value: payload.tracker.platform,
        inline: true,
      },
      {
        name: 'Seasons Scraped',
        value: payload.seasonsScraped.toString(),
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
  };

  // Send DM to user
  await discordClient.users.send(payload.user.discordId, { embeds: [embed] });
}
```

### Example: Registration Summary

```typescript
async function handleRegistrationSummary(payload: RegistrationSummaryPayload) {
  const { summary } = payload;
  
  // Determine color based on results
  let color: number;
  if (summary.failed === 0) {
    color = 0x00ff00; // Green - all success
  } else if (summary.successful === 0) {
    color = 0xff0000; // Red - all failed
  } else {
    color = 0xffff00; // Yellow - partial
  }
  
  const embed = {
    title: 'Registration Summary',
    description: `Processed ${summary.total} tracker(s)`,
    color,
    fields: [
      {
        name: '✅ Successful',
        value: summary.successful.toString(),
        inline: true,
      },
      {
        name: '❌ Failed',
        value: summary.failed.toString(),
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
  };
  
  // Add tracker details
  const trackerDetails = summary.trackers.map(tracker => {
    const statusEmoji = tracker.status === 'COMPLETED' ? '✅' : '❌';
    let detail = `${statusEmoji} ${tracker.platform}: ${tracker.url}`;
    if (tracker.error) {
      detail += `\n   Error: ${tracker.error}`;
    }
    return detail;
  });
  
  embed.fields.push({
    name: 'Tracker Details',
    value: trackerDetails.join('\n'),
    inline: false,
  });
  
  // Send ephemeral follow-up using interaction token
  await discordClient.rest.post(
    `/webhooks/@me/${payload.interactionToken}`,
    {
      body: {
        embeds: [embed],
        flags: 64, // EPHEMERAL
      },
    }
  );
}
```

---

## Configuration

The API requires the following configuration to send webhooks:

- **`BOT_WEBHOOK_URL`**: Base URL for bot webhook endpoints (e.g., `http://localhost:3001` for local dev)
- **`AUTH_BOT_API_KEY`**: API key for authenticating webhook requests

If `BOT_WEBHOOK_URL` is not configured, the API will log warnings and skip sending notifications (no errors thrown).

---

## Testing

### Test Scenarios:

1. **Tracker Scraping Complete:** Verify webhook is received and DM is sent to user
2. **Tracker Scraping Failed:** Verify webhook is received and appropriate message is sent
3. **Registration Summary:** 
   - All Success: Register 2-3 trackers, all should complete successfully
   - All Failure: Register trackers with invalid URLs, all should fail
   - Mixed Results: Register mix of valid and invalid trackers
   - Single Tracker: Register just one tracker
4. **Webhook Failures:** Verify bot handles webhook errors gracefully
5. **Missing Configuration:** Verify API skips notifications when webhook URL is not configured

### Test Data:

Use the `/internal/users/register-by-staff` endpoint with:
- `forceProcess: true`
- `interactionToken: "your_test_token"`
- Valid tracker URLs for success cases
- Invalid URLs for failure cases

---

## Important Notes

1. **Asynchronous Delivery:** All notifications arrive asynchronously - do not expect them in the initial HTTP response
2. **No Direct Discord API Calls:** The API never calls Discord's API directly - all communication goes through webhooks
3. **Bot Responsibility:** The bot is responsible for all Discord message construction and delivery
4. **Error Handling:** The API handles webhook failures gracefully - if sending fails, it logs but doesn't throw (won't break tracker processing)
5. **Format Responsibility:** The bot is responsible for all formatting - the API only provides raw structured data
6. **No Duplicates:** The API prevents duplicate registration summaries using an in-memory cache (resets on server restart)

---

## Questions or Issues?

If you encounter issues or need clarification:
1. Check the API logs for webhook send attempts
2. Verify the bot webhook URL is configured correctly
3. Ensure the bot is listening for webhook POST requests
4. Validate the webhook payload structure matches the expected format
5. Check bot logs for webhook processing errors

---

## API Endpoint Reference

**Endpoint:** `POST /internal/users/register-by-staff`

**Required for Summary:**
- `forceProcess: true`
- `interactionToken: "discord_interaction_token"`

**Full Documentation:** See `docs/API_ENDPOINTS.md` for complete endpoint documentation.
