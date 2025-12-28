# TrackersModule - Behavioral Contract

## Module: TrackersModule
**Location**: `src/trackers/trackers.module.ts`

## Purpose
Manages game tracker profiles (e.g., Rocket League Tracker Network), including registration, scraping, processing, and notification of stat updates.

## Behavioral Contract

### Responsibilities
1. **Tracker Registration**: Register and validate tracker URLs
2. **Tracker Processing**: Scrape and process tracker data
3. **Season Management**: Manage tracker seasons and snapshots
4. **Queue Management**: Orchestrate tracker scraping jobs
5. **Scheduled Processing**: Schedule batch tracker processing
6. **Notification Management**: Notify users of tracker updates

### Exported Services

#### TrackerService
- **Purpose**: Core tracker management logic
- **Key Methods**:
  - `registerTrackers(userId, urls, userData)`: Registers 1-4 trackers for new user
  - `addTracker(userId, url, userData)`: Adds additional tracker (up to 4 total)
  - `getTrackersByUserId(userId)`: Retrieves user's trackers
  - `getTrackersByGuild(guildId)`: Retrieves trackers for guild
  - `getTrackerById(id)`: Retrieves tracker with seasons
  - `getTrackerSeasons(id)`: Retrieves all seasons for tracker
  - `refreshTracker(id)`: Triggers manual refresh
  - `updateTracker(id, data)`: Updates tracker information
  - `deleteTracker(id)`: Soft deletes tracker

#### TrackerScrapingQueueService
- **Purpose**: Queue management for tracker scraping
- **Key Methods**:
  - `enqueueTracker(trackerId)`: Adds tracker to scraping queue
  - `processPendingTrackers()`: Processes all pending trackers
  - `processTrackersForGuild(guildId)`: Processes trackers for specific guild

#### ScheduledTrackerProcessingService
- **Purpose**: Scheduled batch processing
- **Key Methods**:
  - `scheduleProcessing(guildId, scheduledAt, metadata)`: Schedules processing job
  - `getSchedulesForGuild(guildId, filters)`: Retrieves scheduled jobs
  - `cancelSchedule(scheduleId)`: Cancels scheduled job

#### TrackerSnapshotService
- **Purpose**: Tracker snapshot management
- **Key Methods**:
  - `createSnapshot(trackerId, data)`: Creates snapshot of tracker state
  - `getSnapshots(trackerId)`: Retrieves snapshots for tracker

#### TrackerNotificationService
- **Purpose**: Notification management
- **Key Methods**:
  - `notifyTrackerUpdate(trackerId, changes)`: Sends notification for tracker updates

### Controllers

#### TrackerController (User-facing)
- **Endpoints**:
  - `POST /api/trackers/register`: Registers 1-4 trackers
  - `POST /api/trackers/add`: Adds additional tracker
  - `GET /api/trackers/me`: Returns user's trackers
  - `GET /api/trackers`: Returns trackers (filtered by guild if specified)
  - `GET /api/trackers/:id`: Returns tracker details
  - `GET /api/trackers/:id/detail`: Returns tracker with seasons
  - `GET /api/trackers/:id/status`: Returns scraping status
  - `GET /api/trackers/:id/seasons`: Returns tracker seasons
  - `POST /api/trackers/:id/refresh`: Triggers manual refresh
  - `PUT /api/trackers/:id`: Updates tracker
  - `DELETE /api/trackers/:id`: Deletes tracker

#### TrackerAdminController (Admin-facing)
- **Endpoints**:
  - Admin-specific tracker management endpoints

#### InternalTrackerController (Bot-facing)
- **Endpoints**:
  - `POST /internal/trackers/register-multiple`: Registers multiple trackers
  - `POST /internal/trackers/add`: Adds tracker
  - `POST /internal/trackers/process-pending`: Processes all pending trackers
  - `POST /internal/trackers/process`: Processes trackers for guild
  - `POST /internal/trackers/schedule`: Schedules processing
  - `GET /internal/trackers/schedule/guild/:guildId`: Gets scheduled jobs
  - `POST /internal/trackers/schedule/:id/cancel`: Cancels scheduled job

### Behavioral Rules

1. **Tracker Registration**:
   - Users can register 1-4 trackers initially
   - Additional trackers can be added up to maximum of 4
   - Tracker URLs must be validated before registration
   - User must not have existing active trackers to use register endpoint

2. **URL Validation**:
   - URLs must match supported tracker platforms
   - URLs must be parseable (extract game, platform, username)
   - Duplicate trackers for same user must be prevented

3. **Tracker Limits**:
   - Maximum 4 trackers per user
   - Attempts to exceed limit return 400 Bad Request
   - Existing trackers must be counted before allowing new registration

4. **Scraping Process**:
   - Trackers are enqueued for scraping after registration
   - Scraping status must be tracked (PENDING, IN_PROGRESS, COMPLETED, FAILED)
   - Scraping errors must be logged and reported

5. **Ownership Validation**:
   - Users can only refresh/update their own trackers
   - Attempts to modify other users' trackers return 403 Forbidden

6. **Scheduled Processing**:
   - Scheduled jobs can be filtered by status
   - Completed jobs are included by default unless filtered
   - Jobs can be cancelled before execution

7. **Query Parameters** (scheduled jobs):
   - `status`: Filter by status (PENDING, COMPLETED, CANCELLED, FAILED)
   - `includeCompleted`: Include completed jobs (default: true, ignored if status provided)

### Dependencies
- **InfrastructureModule**: For outbox and activity logging (forwardRef)
- **AuditModule**: For audit logging (forwardRef)
- **MmrCalculationModule**: For MMR calculation integration
- **GuildsModule**: For guild validation (forwardRef)
- **BullMQ**: For queue processing
- **HttpModule**: For external API calls (scraping)

### Related Features
- `features/tracker-management.feature`

### Related Implementation
- `src/trackers/services/tracker.service.ts`
- `src/trackers/controllers/tracker.controller.ts`
- `src/trackers/services/tracker-scraping-queue.service.ts`
- `src/trackers/services/scheduled-tracker-processing.service.ts`
- `src/trackers/repositories/tracker.repository.ts`


