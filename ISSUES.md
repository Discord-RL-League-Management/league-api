# Security and Code Quality Issues

## Issue 1: Hardcoded Default Salt in BotApiKeyStrategy

**Severity:** High
**Type:** Security / Hardcoded Credential

**Description:**
In `src/auth/strategies/bot-api-key.strategy.ts`, the `hashApiKey` method uses a hardcoded fallback value `'default-salt'` if the `API_KEY_SALT` environment variable is missing.

```typescript
const salt = this.configService.get<string>('auth.apiKeySalt', 'default-salt');
```

While `configuration.schema.ts` marks `API_KEY_SALT` as required, relying on a hardcoded default in the code provides a false sense of security and could lead to vulnerable API key hashing if the configuration validation is ever bypassed or fails.

**Location:** `src/auth/strategies/bot-api-key.strategy.ts:58`

**Recommended Fix:**
Remove the default value and ensure the application throws an error if the salt is not configured, enforcing the secure configuration.

---

## Issue 2: Missing Strict URL Validation in Tracker DTOs

**Severity:** Medium
**Type:** Security / Input Sanitization

**Description:**
The `CreateTrackerDto`, `AddTrackerDto`, and `RegisterTrackersDto` in `src/trackers/dto/tracker.dto.ts` use `@IsString()` for URL fields but lack `@IsUrl()`.

```typescript
@IsString()
@IsNotEmpty()
url!: string;
```

This allows invalid strings to pass the initial DTO validation layer. While `TrackerValidationService` performs checks later, DTOs should serve as the first line of defense to reject malformed inputs early.

**Location:** `src/trackers/dto/tracker.dto.ts`

**Recommended Fix:**
Add `@IsUrl()` decorator to all URL fields in the DTOs to enforce valid URL formatting at the controller level.

---

## Issue 3: Potential Unhandled Edge Cases in Tracker Scraper Parsing

**Severity:** Low
**Type:** Reliability / Edge Case

**Description:**
In `src/trackers/services/tracker-scraper.service.ts`, the `extractPlaylistData` method extracts nested properties (e.g., `stats.tier.metadata.name`). While optional chaining is used, reliance on external API structure stability without schema validation (like `zod` or `joi` on the *response*) can lead to runtime errors if the external API changes its response format significantly.

**Location:** `src/trackers/services/tracker-scraper.service.ts`

**Recommended Fix:**
Implement runtime schema validation for the external API response (using `zod` or similar) before attempting to access deeply nested properties. This ensures the scraper fails gracefully with a clear error message rather than a potential `TypeError` deeper in the logic.
