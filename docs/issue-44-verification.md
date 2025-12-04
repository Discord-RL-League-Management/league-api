# Issue #44: Verification of /register Command Tracker Data Collection

## Summary
Verification of tracker data collection for MMR calculation system.

## Findings

### 1. TrackerSnapshot Model ✓
**Status**: Complete

The `TrackerSnapshot` model in `prisma/schema.prisma` contains all required fields:
- MMR values: `ones`, `twos`, `threes`, `fours` (Int?)
- Games played: `onesGamesPlayed`, `twosGamesPlayed`, `threesGamesPlayed`, `foursGamesPlayed` (Int?)

**Location**: `league-api/prisma/schema.prisma` lines 236-265

### 2. TrackerSeason Data Structure ✓
**Status**: Complete

The `TrackerSeason` model stores playlist data as JSON:
- `playlist1v1` (Json?)
- `playlist2v2` (Json?)
- `playlist3v3` (Json?)
- `playlist4v4` (Json?)

Each playlist JSON contains `PlaylistData` structure:
```typescript
{
  rating: number | null;        // MMR value
  matchesPlayed: number | null;  // Games played
  rank: string | null;
  rankValue: number | null;
  division: string | null;
  divisionValue: number | null;
  winStreak: number | null;
}
```

**Location**: `league-api/src/trackers/interfaces/scraper.interfaces.ts`

### 3. Data Mapping ⚠️
**Status**: Gap Identified

**Current State**:
- Tracker scraping stores season data in `TrackerSeason` records ✓
- TrackerSeason contains playlist data with MMR and matchesPlayed ✓
- **TrackerSnapshot records are NOT automatically created from TrackerSeason data** ❌

**Data Mapping** (when implemented):
- `TrackerSeason.playlist1v1.rating` → `TrackerSnapshot.ones`
- `TrackerSeason.playlist1v1.matchesPlayed` → `TrackerSnapshot.onesGamesPlayed`
- `TrackerSeason.playlist2v2.rating` → `TrackerSnapshot.twos`
- `TrackerSeason.playlist2v2.matchesPlayed` → `TrackerSnapshot.twosGamesPlayed`
- `TrackerSeason.playlist3v3.rating` → `TrackerSnapshot.threes`
- `TrackerSeason.playlist3v3.matchesPlayed` → `TrackerSnapshot.threesGamesPlayed`
- `TrackerSeason.playlist4v4.rating` → `TrackerSnapshot.fours`
- `TrackerSeason.playlist4v4.matchesPlayed` → `TrackerSnapshot.foursGamesPlayed`

### 4. Tracker Scraping Process ✓
**Status**: Working

The scraping process:
1. Scrapes tracker data from tracker.gg API ✓
2. Extracts playlist data (MMR and matchesPlayed) ✓
3. Stores data in `TrackerSeason` records ✓
4. **Does NOT create TrackerSnapshot records** ❌

**Location**: `league-api/src/trackers/queues/tracker-scraping.processor.ts`

### 5. TrackerSnapshot Creation
**Status**: Manual Only

TrackerSnapshot records can be created:
- Manually via API endpoint (`POST /api/trackers/:trackerId/snapshots`)
- Requires manual data entry
- Not automatically created from TrackerSeason data

**Location**: `league-api/src/trackers/controllers/tracker.controller.ts`

## Recommendations

### For MMR Calculation System

**Option 1: Use TrackerSeason Data Directly (Recommended)**
- Access TrackerSeason records directly for MMR calculation
- Extract playlist data from JSON fields
- No need for TrackerSnapshot records
- Simpler implementation
- Data is already available after scraping

**Option 2: Create TrackerSnapshot Automatically**
- Add logic to create TrackerSnapshot after scraping completes
- Map TrackerSeason playlist data to TrackerSnapshot fields
- More normalized data structure
- Additional storage overhead

### Implementation Notes

For MMR calculation service, we can:
1. Get latest TrackerSeason for a tracker
2. Extract playlist data from JSON fields
3. Map to TrackerData structure:
   ```typescript
   {
     ones: playlist1v1?.rating,
     twos: playlist2v2?.rating,
     threes: playlist3v3?.rating,
     fours: playlist4v4?.rating,
     onesGamesPlayed: playlist1v1?.matchesPlayed,
     twosGamesPlayed: playlist2v2?.matchesPlayed,
     threesGamesPlayed: playlist3v3?.matchesPlayed,
     foursGamesPlayed: playlist4v4?.matchesPlayed,
   }
   ```

## Conclusion

✅ **Tracker data collection is working correctly**
- All required fields exist in database schema
- Data is scraped and stored in TrackerSeason records
- MMR and games played data is available in playlist JSON fields

⚠️ **TrackerSnapshot records are not automatically created**
- This is not a blocker for MMR calculation
- Can use TrackerSeason data directly
- TrackerSnapshot creation can be added later if needed

## Next Steps

1. Proceed with MMR calculation implementation using TrackerSeason data
2. Create helper method to extract TrackerData from TrackerSeason
3. Consider adding automatic TrackerSnapshot creation in future enhancement




