# Add Guild-Level Tracker Processing Toggle

## Description
Implement a per-guild setting to enable/disable automatic tracker data collection. This allows guild administrators to control whether trackers for their guild members are automatically scraped, helping manage costs.

## Background
Tracker scraping incurs costs (Zyte proxy usage). We need granular control at the guild level to allow administrators to opt-in or opt-out of automatic tracker processing for their guild members.

## Requirements

### 1. Data Model Changes
- [ ] Add `trackerProcessing` configuration to `GuildSettings` interface
  - Location: `src/guilds/interfaces/settings.interface.ts`
  - Structure: `{ enabled: boolean }` (default: `true` for backward compatibility)
- [ ] Update `SettingsDefaultsService` to include default `trackerProcessing.enabled: true`
  - Location: `src/guilds/services/settings-defaults.service.ts`

### 2. Service Layer
- [ ] Create `TrackerProcessingGuardService`
  - Location: `src/trackers/services/tracker-processing-guard.service.ts`
  - Methods:
    - `canProcessTracker(trackerId: string): Promise<boolean>`
      - Check if user belongs to any guild with processing enabled
      - Default to `true` if user not in any guilds (backward compatibility)
      - Return `true` if ANY guild has processing enabled
    - `filterProcessableTrackers(trackerIds: string[]): Promise<string[]>`
      - Batch filter tracker IDs to only processable ones
  - Dependencies: `PrismaService`, `GuildSettingsService`

### 3. Enforcement Points
- [ ] Update `TrackerService.registerTrackers()`
  - Location: `src/trackers/services/tracker.service.ts` (~line 252)
  - Check `canProcessTracker()` before enqueueing scraping jobs
  - If disabled, set appropriate status/error message
  - Log when skipping due to guild settings

- [ ] Update `TrackerService.addTracker()`
  - Location: `src/trackers/services/tracker.service.ts` (~line 322)
  - Same checks as `registerTrackers()`

- [ ] Update `TrackerService.refreshTrackerData()`
  - Location: `src/trackers/services/tracker.service.ts` (~line 349)
  - Throw `ForbiddenException` if processing disabled
  - Check before enqueueing job

- [ ] Update `TrackerRefreshSchedulerService.getTrackersNeedingRefresh()`
  - Location: `src/trackers/services/tracker-refresh-scheduler.service.ts` (~line 110)
  - Filter trackers using `filterProcessableTrackers()` before returning
  - This ensures scheduled refreshes respect guild settings

### 4. Module Registration
- [ ] Add `TrackerProcessingGuardService` to `TrackersModule` providers
  - Location: `src/trackers/trackers.module.ts`
- [ ] Ensure `GuildSettingsService` is accessible (may need to import `GuildsModule`)

### 5. Testing
- [ ] Unit tests for `TrackerProcessingGuardService`
  - Test with user in single guild (enabled/disabled)
  - Test with user in multiple guilds (mixed states)
  - Test with user in no guilds (default behavior)
- [ ] Integration tests for enforcement points
  - Test tracker creation when processing disabled
  - Test scheduler respects guild settings
  - Test manual refresh respects guild settings

## Acceptance Criteria
- [ ] Guild settings include `trackerProcessing.enabled` field
- [ ] Default value is `true` (backward compatible)
- [ ] Trackers are not processed when all user's guilds have processing disabled
- [ ] Trackers are processed if at least one guild has processing enabled
- [ ] Scheduled refreshes respect guild settings
- [ ] Manual refresh throws appropriate error when disabled
- [ ] All existing tests pass
- [ ] New tests cover edge cases

## Technical Notes
- Users can belong to multiple guilds - processing enabled if ANY guild allows it
- Users not in any guilds default to enabled (backward compatibility)
- Consider caching guild settings checks for performance if needed
- Log when trackers are skipped due to guild settings for observability

## Related Issues
- Frontend issue: Add UI for guild-level tracker processing toggle
- Discord Bot: No changes required

