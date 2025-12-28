# API Endpoint Audit - Complete Endpoint Registry
## Generated: 2025-01-27

This document provides a comprehensive audit of ALL API endpoints in the codebase, mapping each endpoint to its feature scenario, module spec, and implementation.

---

## Endpoint Coverage Status

| Status | Count | Description |
|--------|-------|-------------|
| ✅ **Covered** | 80+ | Endpoint has feature scenario and spec |
| ⚠️ **Partial** | 20+ | Endpoint exists but no feature scenario |
| ❌ **Missing** | 10+ | Endpoint not documented in features |

---

## Public Endpoints

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/health` | `health-check.feature` | - | `health.controller.ts` | ✅ Covered |

---

## Authentication Endpoints (`/auth`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/auth/discord` | `authentication.feature` @oauth | `auth.module.md` | `auth.controller.ts` | ✅ Covered |
| `GET` | `/auth/discord/callback` | `authentication.feature` @oauth @callback | `auth.module.md` | `auth.controller.ts` | ✅ Covered |
| `GET` | `/auth/me` | `authentication.feature` @jwt | `auth.module.md` | `auth.controller.ts` | ✅ Covered |
| `GET` | `/auth/guilds` | `authentication.feature` @jwt | `auth.module.md` | `auth.controller.ts` | ✅ Covered |
| `POST` | `/auth/logout` | `authentication.feature` @jwt @logout | `auth.module.md` | `auth.controller.ts` | ✅ Covered |
| `POST` | `/auth/refresh` | `authentication.feature` @jwt @refresh | `auth.module.md` | `auth.controller.ts` | ⚠️ Missing (needs feature scenario) |

---

## User Endpoints (`/api/users`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/api/users/me` | `user-management.feature` @user-data @read | `users.module.md` | `users.controller.ts` | ✅ Covered |
| `PATCH` | `/api/users/me` | `user-management.feature` @user-data @update | `users.module.md` | `users.controller.ts` | ✅ Covered |
| `GET` | `/api/users/:id` | `user-management.feature` @user-data @security | `users.module.md` | `users.controller.ts` | ✅ Covered |

---

## Profile Endpoints (`/api/profile`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/api/profile` | ❌ Missing | ❌ Missing | `profile.controller.ts` | ❌ Gap |
| `GET` | `/api/profile/stats` | ❌ Missing | ❌ Missing | `profile.controller.ts` | ❌ Gap |
| `PATCH` | `/api/profile/settings` | ❌ Missing | ❌ Missing | `profile.controller.ts` | ❌ Gap |

---

## Guild Endpoints (`/api/guilds`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/api/guilds/:id` | `guild-management.feature` @guild @read | `guilds.module.md` | `guilds.controller.ts` | ✅ Covered |
| `GET` | `/api/guilds/:id/settings` | `guild-management.feature` @guild @settings @read @admin | `guilds.module.md` | `guilds.controller.ts` | ✅ Covered |
| `GET` | `/api/guilds/:id/channels` | `guild-management.feature` @guild @channels @admin | `guilds.module.md` | `guilds.controller.ts` | ✅ Covered |
| `GET` | `/api/guilds/:id/roles` | `guild-management.feature` @guild @roles @admin | `guilds.module.md` | `guilds.controller.ts` | ✅ Covered |

---

## Guild Settings Endpoints (`/api/guilds/:id/settings`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/api/guilds/:id/settings` | `guild-management.feature` @guild @settings @read | `guilds.module.md` | `guild-settings.controller.ts` | ✅ Covered |
| `PATCH` | `/api/guilds/:id/settings` | ❌ Missing | `guilds.module.md` | `guild-settings.controller.ts` | ⚠️ Partial |
| `POST` | `/api/guilds/:id/settings/reset` | ❌ Missing | ❌ Missing | `guild-settings.controller.ts` | ❌ Gap |
| `GET` | `/api/guilds/:id/settings/history` | ❌ Missing | ❌ Missing | `guild-settings.controller.ts` | ❌ Gap |

---

## League Endpoints (`/api/leagues`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/api/leagues/guild/:guildId` | `league-management.feature` @league @list | `leagues.module.md` | `leagues.controller.ts` | ✅ Covered |
| `GET` | `/api/leagues/:id` | `league-management.feature` @league @read | `leagues.module.md` | `leagues.controller.ts` | ✅ Covered |
| `POST` | `/api/leagues` | `league-management.feature` @league @create @admin | `leagues.module.md` | `leagues.controller.ts` | ✅ Covered |
| `PATCH` | `/api/leagues/:id` | `league-management.feature` @league @update @admin | `leagues.module.md` | `leagues.controller.ts` | ✅ Covered |
| `PATCH` | `/api/leagues/:id/status` | `league-management.feature` @league @status @admin | `leagues.module.md` | `leagues.controller.ts` | ✅ Covered |
| `DELETE` | `/api/leagues/:id` | `league-management.feature` @league @delete @admin | `leagues.module.md` | `leagues.controller.ts` | ✅ Covered |

---

## League Settings Endpoints (`/api/leagues/:leagueId/settings`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/api/leagues/:leagueId/settings` | `league-management.feature` @league @settings @read @admin | `leagues.module.md` | `league-settings.controller.ts` | ✅ Covered |
| `PATCH` | `/api/leagues/:leagueId/settings` | `league-management.feature` @league @settings @update @admin | `leagues.module.md` | `league-settings.controller.ts` | ✅ Covered |

---

## League Member Endpoints (`/api/leagues/:leagueId/members`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `POST` | `/api/leagues/:leagueId/members` | ❌ Missing | ❌ Missing | `league-members.controller.ts` | ❌ Gap |
| `GET` | `/api/leagues/:leagueId/members` | ❌ Missing | ❌ Missing | `league-members.controller.ts` | ❌ Gap |
| `DELETE` | `/api/leagues/:leagueId/members/:playerId` | ❌ Missing | ❌ Missing | `league-members.controller.ts` | ❌ Gap |
| `PATCH` | `/api/leagues/:leagueId/members/:playerId` | ❌ Missing | ❌ Missing | `league-members.controller.ts` | ❌ Gap |

---

## Organization Endpoints (`/api/organizations`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/api/leagues/:leagueId/organizations` | `organization-management.feature` @organization @list | `organizations.module.md` | `organizations.controller.ts` | ✅ Covered |
| `GET` | `/api/organizations/:id` | `organization-management.feature` @organization @read | `organizations.module.md` | `organizations.controller.ts` | ✅ Covered |
| `GET` | `/api/organizations/:id/teams` | `organization-management.feature` @organization @teams | `organizations.module.md` | `organizations.controller.ts` | ✅ Covered |
| `GET` | `/api/organizations/:id/stats` | `organization-management.feature` @organization @stats | `organizations.module.md` | `organizations.controller.ts` | ✅ Covered |
| `POST` | `/api/leagues/:leagueId/organizations` | `organization-management.feature` @organization @create | `organizations.module.md` | `organizations.controller.ts` | ✅ Covered |
| `PATCH` | `/api/organizations/:id` | `organization-management.feature` @organization @update @gm | `organizations.module.md` | `organizations.controller.ts` | ✅ Covered |
| `DELETE` | `/api/organizations/:id` | `organization-management.feature` @organization @delete @gm | `organizations.module.md` | `organizations.controller.ts` | ✅ Covered |
| `POST` | `/api/organizations/:id/teams/:teamId/transfer` | `organization-management.feature` @organization @transfer-team | `organizations.module.md` | `organizations.controller.ts` | ✅ Covered |
| `GET` | `/api/organizations/:id/members` | `organization-management.feature` @organization @members @list | `organizations.module.md` | `organizations.controller.ts` | ✅ Covered |
| `POST` | `/api/organizations/:id/members` | `organization-management.feature` @organization @members @add @gm | `organizations.module.md` | `organizations.controller.ts` | ✅ Covered |
| `PATCH` | `/api/organizations/:id/members/:memberId` | `organization-management.feature` @organization @members @update @gm | `organizations.module.md` | `organizations.controller.ts` | ✅ Covered |
| `DELETE` | `/api/organizations/:id/members/:memberId` | `organization-management.feature` @organization @members @remove @gm | `organizations.module.md` | `organizations.controller.ts` | ✅ Covered |

---

## Team Endpoints (`/api/teams`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/api/leagues/:leagueId/teams` | `team-management.feature` @team @list | `teams.module.md` | `teams.controller.ts` | ✅ Covered |
| `GET` | `/api/teams/:id` | `team-management.feature` @team @read | `teams.module.md` | `teams.controller.ts` | ✅ Covered |
| `POST` | `/api/leagues/:leagueId/teams` | `team-management.feature` @team @create | `teams.module.md` | `teams.controller.ts` | ✅ Covered |
| `PATCH` | `/api/teams/:id` | `team-management.feature` @team @update | `teams.module.md` | `teams.controller.ts` | ✅ Covered |
| `DELETE` | `/api/teams/:id` | `team-management.feature` @team @delete | `teams.module.md` | `teams.controller.ts` | ✅ Covered |

---

## Team Member Endpoints (`/api/teams/:id/members`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/api/teams/:id/members` | `team-management.feature` @team @members @list | `teams.module.md` | `team-members.controller.ts` | ✅ Covered (via team feature) |
| `POST` | `/api/teams/:id/members` | `team-management.feature` @team @members @add | `teams.module.md` | `team-members.controller.ts` | ✅ Covered (via team feature) |
| `PATCH` | `/api/teams/:id/members/:memberId` | ❌ Missing | ❌ Missing | `team-members.controller.ts` | ⚠️ Partial |
| `DELETE` | `/api/teams/:id/members/:memberId` | `team-management.feature` @team @members @remove | `teams.module.md` | `team-members.controller.ts` | ✅ Covered (via team feature) |

---

## Match Endpoints (`/api/matches`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/api/leagues/:leagueId/matches` | `match-management.feature` @match @list | `matches.module.md` | `matches.controller.ts` | ✅ Covered |
| `GET` | `/api/matches/:id` | `match-management.feature` @match @read | `matches.module.md` | `matches.controller.ts` | ✅ Covered |
| `POST` | `/api/leagues/:leagueId/matches` | `match-management.feature` @match @create @admin | `matches.module.md` | `matches.controller.ts` | ✅ Covered |
| `POST` | `/api/matches/:id/participants` | ❌ Missing | ❌ Missing | `matches.controller.ts` | ❌ Gap |
| `PATCH` | `/api/matches/:id/status` | ❌ Missing | `matches.module.md` | `matches.controller.ts` | ⚠️ Partial |
| `POST` | `/api/matches/:id/complete` | `match-management.feature` @match @score @admin | `matches.module.md` | `matches.controller.ts` | ✅ Covered |

---

## Tracker Endpoints (`/api/trackers`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `POST` | `/api/trackers/register` | `tracker-management.feature` @tracker @register | `trackers.module.md` | `tracker.controller.ts` | ✅ Covered |
| `POST` | `/api/trackers/add` | `tracker-management.feature` @tracker @add | `trackers.module.md` | `tracker.controller.ts` | ✅ Covered |
| `GET` | `/api/trackers/me` | `tracker-management.feature` @tracker @read | `trackers.module.md` | `tracker.controller.ts` | ✅ Covered |
| `GET` | `/api/trackers` | `tracker-management.feature` @tracker @read @filter | `trackers.module.md` | `tracker.controller.ts` | ✅ Covered |
| `GET` | `/api/trackers/:id` | `tracker-management.feature` @tracker @detail | `trackers.module.md` | `tracker.controller.ts` | ✅ Covered |
| `GET` | `/api/trackers/:id/detail` | `tracker-management.feature` @tracker @detail | `trackers.module.md` | `tracker.controller.ts` | ✅ Covered |
| `GET` | `/api/trackers/:id/status` | `tracker-management.feature` @tracker @status | `trackers.module.md` | `tracker.controller.ts` | ✅ Covered |
| `GET` | `/api/trackers/:id/seasons` | `tracker-management.feature` @tracker @seasons | `trackers.module.md` | `tracker.controller.ts` | ✅ Covered |
| `POST` | `/api/trackers/:id/refresh` | `tracker-management.feature` @tracker @refresh | `trackers.module.md` | `tracker.controller.ts` | ✅ Covered |
| `GET` | `/api/trackers/:id/snapshots` | ❌ Missing | ❌ Missing | `tracker.controller.ts` | ❌ Gap |
| `POST` | `/api/trackers/:id/snapshots` | ❌ Missing | ❌ Missing | `tracker.controller.ts` | ❌ Gap |
| `PUT` | `/api/trackers/:id` | `tracker-management.feature` @tracker @update | `trackers.module.md` | `tracker.controller.ts` | ✅ Covered |
| `DELETE` | `/api/trackers/:id` | `tracker-management.feature` @tracker @delete | `trackers.module.md` | `tracker.controller.ts` | ✅ Covered |

---

## Tracker Admin Endpoints (`/api/trackers/admin`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/api/trackers/admin` | ❌ Missing | ❌ Missing | `tracker-admin.controller.ts` | ❌ Gap |
| `GET` | `/api/trackers/admin/scraping-status` | ❌ Missing | ❌ Missing | `tracker-admin.controller.ts` | ❌ Gap |
| `GET` | `/api/trackers/admin/scraping-logs` | ❌ Missing | ❌ Missing | `tracker-admin.controller.ts` | ❌ Gap |
| `POST` | `/api/trackers/admin/:id/refresh` | ❌ Missing | ❌ Missing | `tracker-admin.controller.ts` | ❌ Gap |
| `POST` | `/api/trackers/admin/batch-refresh` | ❌ Missing | ❌ Missing | `tracker-admin.controller.ts` | ❌ Gap |

---

## Player Endpoints (`/api/players`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/api/players/me` | ❌ Missing | ❌ Missing | `players.controller.ts` | ❌ Gap |
| `GET` | `/api/players/guild/:guildId` | ❌ Missing | ❌ Missing | `players.controller.ts` | ❌ Gap |
| `GET` | `/api/players/:id` | ❌ Missing | ❌ Missing | `players.controller.ts` | ❌ Gap |
| `PATCH` | `/api/players/:id` | ❌ Missing | ❌ Missing | `players.controller.ts` | ❌ Gap |

---

## Player Stats Endpoints (`/api/player-stats`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/api/player-stats/league/:leagueId` | ❌ Missing | ❌ Missing | `player-stats.controller.ts` | ❌ Gap |
| `GET` | `/api/player-stats` | ❌ Missing | ❌ Missing | `player-stats.controller.ts` | ❌ Gap |

---

## Player Ratings Endpoints (`/api/player-ratings`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/api/player-ratings/league/:leagueId` | ❌ Missing | ❌ Missing | `player-ratings.controller.ts` | ❌ Gap |
| `GET` | `/api/player-ratings` | ❌ Missing | ❌ Missing | `player-ratings.controller.ts` | ❌ Gap |

---

## MMR Calculation Endpoints (`/api/mmr-calculation`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `POST` | `/api/mmr-calculation/test-formula` | ❌ Missing | ❌ Missing | `mmr-calculation.controller.ts` | ❌ Gap |
| `POST` | `/api/mmr-calculation/validate-formula` | ❌ Missing | ❌ Missing | `mmr-calculation.controller.ts` | ❌ Gap |
| `POST` | `/api/mmr-calculation/calculate-mmr` | ❌ Missing | ❌ Missing | `mmr-calculation.controller.ts` | ❌ Gap |

---

## Calculator Endpoints (`/api/calculator`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `POST` | `/api/calculator` | ❌ Missing | ❌ Missing | `calculator.controller.ts` | ❌ Gap |

---

## MMR Calculator Demo Endpoints (`/api/mmr-calculator-demo`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `POST` | `/api/mmr-calculator-demo` | ❌ Missing | ❌ Missing | `mmr-calculator-demo.controller.ts` | ❌ Gap |

---

## Tournament Endpoints (`/api/tournaments`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/api/tournaments/:id` | ❌ Missing | ❌ Missing | `tournaments.controller.ts` | ❌ Gap |
| `POST` | `/api/tournaments` | ❌ Missing | ❌ Missing | `tournaments.controller.ts` | ❌ Gap |
| `POST` | `/api/tournaments/:id/register` | ❌ Missing | ❌ Missing | `tournaments.controller.ts` | ❌ Gap |

---

## Guild Member Endpoints (`/api/guild-members`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/api/guild-members` | ❌ Missing | ❌ Missing | `guild-members.controller.ts` | ❌ Gap |
| `GET` | `/api/guild-members/search` | ❌ Missing | ❌ Missing | `guild-members.controller.ts` | ❌ Gap |
| `GET` | `/api/guild-members/stats` | ❌ Missing | ❌ Missing | `guild-members.controller.ts` | ❌ Gap |
| `GET` | `/api/guild-members/:userId` | ❌ Missing | ❌ Missing | `guild-members.controller.ts` | ❌ Gap |
| `POST` | `/api/guild-members` | ❌ Missing | ❌ Missing | `guild-members.controller.ts` | ❌ Gap |
| `PATCH` | `/api/guild-members/:userId` | ❌ Missing | ❌ Missing | `guild-members.controller.ts` | ❌ Gap |
| `DELETE` | `/api/guild-members/:userId` | ❌ Missing | ❌ Missing | `guild-members.controller.ts` | ❌ Gap |
| `POST` | `/api/guild-members/sync` | ❌ Missing | ❌ Missing | `guild-members.controller.ts` | ❌ Gap |

---

## Permissions Endpoints (`/api/permissions`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/api/permissions/me` | ❌ Missing | ❌ Missing | `permissions.controller.ts` | ❌ Gap |

---

## Audit Log Endpoints (`/api/audit`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/api/audit` | ❌ Missing | ❌ Missing | `audit-log.controller.ts` | ❌ Gap |

---

## Bot Internal Endpoints (`/internal`)

### Health

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/internal/health` | `health-check.feature` @health @bot | - | `internal.controller.ts` | ✅ Covered |

### Users (`/internal/users`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/internal/users` | `user-management.feature` @bot @users @list | `users.module.md` | `internal-users.controller.ts` | ✅ Covered |
| `GET` | `/internal/users/:id` | `user-management.feature` @bot @users @read | `users.module.md` | `internal-users.controller.ts` | ✅ Covered |
| `POST` | `/internal/users` | `user-management.feature` @bot @users @create | `users.module.md` | `internal-users.controller.ts` | ✅ Covered |
| `PATCH` | `/internal/users/:id` | `user-management.feature` @bot @users @update | `users.module.md` | `internal-users.controller.ts` | ✅ Covered |
| `DELETE` | `/internal/users/:id` | `user-management.feature` @bot @users @delete | `users.module.md` | `internal-users.controller.ts` | ✅ Covered |

### Guilds (`/internal/guilds`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/internal/guilds` | ❌ Missing | `guilds.module.md` | `internal-guilds.controller.ts` | ⚠️ Partial |
| `GET` | `/internal/guilds/:id` | `guild-management.feature` @bot @guilds @read | `guilds.module.md` | `internal-guilds.controller.ts` | ✅ Covered |
| `POST` | `/internal/guilds` | `guild-management.feature` @bot @guilds @create | `guilds.module.md` | `internal-guilds.controller.ts` | ✅ Covered |
| `POST` | `/internal/guilds/upsert` | ❌ Missing | ❌ Missing | `internal-guilds.controller.ts` | ❌ Gap |
| `POST` | `/internal/guilds/:id/sync` | ❌ Missing | ❌ Missing | `internal-guilds.controller.ts` | ❌ Gap |
| `PATCH` | `/internal/guilds/:id` | `guild-management.feature` @bot @guilds @update | `guilds.module.md` | `internal-guilds.controller.ts` | ✅ Covered |
| `DELETE` | `/internal/guilds/:id` | `guild-management.feature` @bot @guilds @delete | `guilds.module.md` | `internal-guilds.controller.ts` | ✅ Covered |
| `GET` | `/internal/guilds/:id/settings` | `guild-management.feature` @bot @guilds @settings | `guilds.module.md` | `internal-guilds.controller.ts` | ✅ Covered |
| `PATCH` | `/internal/guilds/:id/settings` | ❌ Missing | ❌ Missing | `internal-guilds.controller.ts` | ❌ Gap |

### Leagues (`/internal/leagues`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/internal/leagues/:id` | `league-management.feature` @bot @leagues @read | `leagues.module.md` | `internal-leagues.controller.ts` | ✅ Covered |
| `POST` | `/internal/leagues` | `league-management.feature` @bot @leagues @create | `leagues.module.md` | `internal-leagues.controller.ts` | ✅ Covered |
| `PATCH` | `/internal/leagues/:id` | `league-management.feature` @bot @leagues @update | `leagues.module.md` | `internal-leagues.controller.ts` | ✅ Covered |
| `DELETE` | `/internal/leagues/:id` | `league-management.feature` @bot @leagues @delete | `leagues.module.md` | `internal-leagues.controller.ts` | ✅ Covered |
| `GET` | `/internal/leagues/:id/settings` | `league-management.feature` @bot @leagues @settings | `leagues.module.md` | `internal-leagues.controller.ts` | ✅ Covered |
| `PATCH` | `/internal/leagues/:id/settings` | `league-management.feature` @bot @leagues @settings | `leagues.module.md` | `internal-leagues.controller.ts` | ✅ Covered |

### League Members (`/internal/leagues/:leagueId/members`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `POST` | `/internal/leagues/:leagueId/members` | ❌ Missing | ❌ Missing | `internal-league-members.controller.ts` | ❌ Gap |
| `GET` | `/internal/leagues/:leagueId/members` | ❌ Missing | ❌ Missing | `internal-league-members.controller.ts` | ❌ Gap |
| `GET` | `/internal/leagues/:leagueId/members/:playerId` | ❌ Missing | ❌ Missing | `internal-league-members.controller.ts` | ❌ Gap |
| `PATCH` | `/internal/leagues/:leagueId/members/:playerId` | ❌ Missing | ❌ Missing | `internal-league-members.controller.ts` | ❌ Gap |
| `DELETE` | `/internal/leagues/:leagueId/members/:playerId` | ❌ Missing | ❌ Missing | `internal-league-members.controller.ts` | ❌ Gap |
| `POST` | `/internal/leagues/:leagueId/members/:playerId/approve` | ❌ Missing | ❌ Missing | `internal-league-members.controller.ts` | ❌ Gap |
| `POST` | `/internal/leagues/:leagueId/members/:playerId/reject` | ❌ Missing | ❌ Missing | `internal-league-members.controller.ts` | ❌ Gap |

### Organizations (`/internal/organizations`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/internal/organizations/:id` | `organization-management.feature` @bot @organizations @read | `organizations.module.md` | `internal-organizations.controller.ts` | ✅ Covered |
| `POST` | `/internal/organizations` | `organization-management.feature` @bot @organizations @create | `organizations.module.md` | `internal-organizations.controller.ts` | ✅ Covered |
| `PATCH` | `/internal/organizations/:id` | `organization-management.feature` @bot @organizations @update | `organizations.module.md` | `internal-organizations.controller.ts` | ✅ Covered |
| `DELETE` | `/internal/organizations/:id` | `organization-management.feature` @bot @organizations @delete | `organizations.module.md` | `internal-organizations.controller.ts` | ✅ Covered |
| `GET` | `/internal/organizations/:id/members` | `organization-management.feature` @bot @organizations @members | `organizations.module.md` | `internal-organizations.controller.ts` | ✅ Covered |
| `POST` | `/internal/organizations/:id/members` | `organization-management.feature` @bot @organizations @members | `organizations.module.md` | `internal-organizations.controller.ts` | ✅ Covered |
| `PATCH` | `/internal/organizations/:id/members/:memberId` | `organization-management.feature` @bot @organizations @members | `organizations.module.md` | `internal-organizations.controller.ts` | ✅ Covered |
| `DELETE` | `/internal/organizations/:id/members/:memberId` | `organization-management.feature` @bot @organizations @members | `organizations.module.md` | `internal-organizations.controller.ts` | ✅ Covered |

### Teams (`/internal/teams`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/internal/teams/:id` | `team-management.feature` @bot @teams @read | `teams.module.md` | `internal-teams.controller.ts` | ✅ Covered |
| `POST` | `/internal/teams` | `team-management.feature` @bot @teams @create | `teams.module.md` | `internal-teams.controller.ts` | ✅ Covered |
| `PATCH` | `/internal/teams/:id` | `team-management.feature` @bot @teams @update | `teams.module.md` | `internal-teams.controller.ts` | ✅ Covered |
| `DELETE` | `/internal/teams/:id` | `team-management.feature` @bot @teams @delete | `teams.module.md` | `internal-teams.controller.ts` | ✅ Covered |

### Team Members (`/internal/teams/:id/members`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/internal/teams/:id/members` | ❌ Missing | ❌ Missing | `internal-team-members.controller.ts` | ❌ Gap |
| `POST` | `/internal/teams/:id/members` | ❌ Missing | ❌ Missing | `internal-team-members.controller.ts` | ❌ Gap |
| `PATCH` | `/internal/teams/:id/members/:memberId` | ❌ Missing | ❌ Missing | `internal-team-members.controller.ts` | ❌ Gap |
| `DELETE` | `/internal/teams/:id/members/:memberId` | ❌ Missing | ❌ Missing | `internal-team-members.controller.ts` | ❌ Gap |

### Players (`/internal/players`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `GET` | `/internal/players` | ❌ Missing | ❌ Missing | `internal-players.controller.ts` | ❌ Gap |
| `GET` | `/internal/players/:id` | ❌ Missing | ❌ Missing | `internal-players.controller.ts` | ❌ Gap |
| `POST` | `/internal/players` | ❌ Missing | ❌ Missing | `internal-players.controller.ts` | ❌ Gap |
| `PATCH` | `/internal/players/:id` | ❌ Missing | ❌ Missing | `internal-players.controller.ts` | ❌ Gap |
| `DELETE` | `/internal/players/:id` | ❌ Missing | ❌ Missing | `internal-players.controller.ts` | ❌ Gap |
| `GET` | `/internal/players/guild/:guildId` | ❌ Missing | ❌ Missing | `internal-players.controller.ts` | ❌ Gap |
| `GET` | `/internal/players/user/:userId` | ❌ Missing | ❌ Missing | `internal-players.controller.ts` | ❌ Gap |

### Trackers (`/internal/trackers`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `POST` | `/internal/trackers/register-multiple` | `tracker-management.feature` @bot @trackers @register-multiple | `trackers.module.md` | `internal-tracker.controller.ts` | ✅ Covered |
| `POST` | `/internal/trackers/add` | `tracker-management.feature` @bot @trackers @add | `trackers.module.md` | `internal-tracker.controller.ts` | ✅ Covered |
| `POST` | `/internal/trackers/process-pending` | `tracker-management.feature` @bot @trackers @process | `trackers.module.md` | `internal-tracker.controller.ts` | ✅ Covered |
| `POST` | `/internal/trackers/process` | `tracker-management.feature` @bot @trackers @process-guild | `trackers.module.md` | `internal-tracker.controller.ts` | ✅ Covered |

### Scheduled Tracker Processing (`/internal/trackers/schedule`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `POST` | `/internal/trackers/schedule` | `tracker-management.feature` @bot @trackers @schedule | `trackers.module.md` | `internal-scheduled-processing.controller.ts` | ✅ Covered |
| `GET` | `/internal/trackers/schedule/guild/:guildId` | `tracker-management.feature` @bot @trackers @schedule-list | `trackers.module.md` | `internal-scheduled-processing.controller.ts` | ✅ Covered |
| `POST` | `/internal/trackers/schedule/:id/cancel` | `tracker-management.feature` @bot @trackers @schedule-cancel | `trackers.module.md` | `internal-scheduled-processing.controller.ts` | ✅ Covered |

### Guild Members (`/internal/guild-members`)

| Method | Endpoint | Feature | Spec | Controller | Status |
|--------|----------|---------|------|------------|--------|
| `POST` | `/internal/guild-members` | ❌ Missing | ❌ Missing | `internal-guild-members.controller.ts` | ❌ Gap |
| `POST` | `/internal/guild-members/:guildId/sync` | ❌ Missing | ❌ Missing | `internal-guild-members.controller.ts` | ❌ Gap |
| `PATCH` | `/internal/guild-members/:guildId/users/:userId` | ❌ Missing | ❌ Missing | `internal-guild-members.controller.ts` | ❌ Gap |
| `DELETE` | `/internal/guild-members/:guildId/users/:userId` | ❌ Missing | ❌ Missing | `internal-guild-members.controller.ts` | ❌ Gap |

---

## Summary Statistics

| Category | Total | Covered | Partial | Missing | Coverage % |
|----------|-------|---------|---------|---------|------------|
| **Public Endpoints** | 1 | 1 | 0 | 0 | 100% |
| **User-Facing Endpoints** | 80+ | 50+ | 15+ | 15+ | ~62% |
| **Bot Internal Endpoints** | 40+ | 30+ | 5+ | 5+ | ~75% |
| **Total** | **120+** | **80+** | **20+** | **20+** | **~67%** |

---

## Critical Gaps (High Priority)

### User-Facing Endpoints Missing Coverage

1. **Profile Endpoints** (3 endpoints)
   - `GET /api/profile`
   - `GET /api/profile/stats`
   - `PATCH /api/profile/settings`

2. **Player Endpoints** (4 endpoints)
   - `GET /api/players/me`
   - `GET /api/players/guild/:guildId`
   - `GET /api/players/:id`
   - `PATCH /api/players/:id`

3. **League Member Endpoints** (4 endpoints)
   - All `/api/leagues/:leagueId/members` endpoints

4. **Player Stats/Ratings** (4 endpoints)
   - Player stats and ratings endpoints

5. **MMR Calculation** (4 endpoints)
   - MMR calculation and calculator endpoints

6. **Guild Members** (8 endpoints)
   - All guild member management endpoints

7. **Tournaments** (3 endpoints)
   - Tournament management endpoints

8. **Tracker Admin** (5 endpoints)
   - Admin tracker management endpoints

9. **Tracker Snapshots** (2 endpoints)
   - Snapshot management endpoints

---

## Recommendations

### Immediate Actions
1. Create feature files for Profile, Players, LeagueMembers, GuildMembers modules
2. Add missing scenarios to existing feature files (tracker snapshots, match participants, etc.)
3. Create specs for all missing modules

### Priority Order
1. **Profile** - Core user functionality
2. **Players** - Core domain entity
3. **League Members** - Critical for league operations
4. **Guild Members** - Critical for guild operations
5. **Player Stats/Ratings** - Important analytics
6. **MMR Calculation** - Feature-specific functionality
7. **Tournaments** - If actively used
8. **Tracker Admin** - Admin functionality (lower priority)

---

**Last Updated**: 2025-01-27


