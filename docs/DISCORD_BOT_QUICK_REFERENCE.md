# Discord Bot Quick Reference: Registration Summary

## TL;DR

When `forceProcess: true` + `interactionToken` are provided to `/internal/users/register-by-staff`, the API will send a JSON summary via ephemeral follow-up when all trackers complete. **Bot must parse JSON and format into embed.**

---

## What You'll Receive

**When:** Asynchronously (seconds/minutes after registration, when all trackers finish)

**How:** Ephemeral follow-up message with JSON string in `content` field

**Format:**
```json
{
  "total": 3,
  "successful": 2,
  "failed": 1,
  "trackers": [
    {
      "url": "https://...",
      "platform": "STEAM",
      "status": "COMPLETED"
    },
    {
      "url": "https://...",
      "platform": "EPIC",
      "status": "FAILED",
      "error": "Error message here"
    }
  ]
}
```

---

## What You Need To Do

1. **Listen** for ephemeral follow-up messages
2. **Parse** JSON from message `content`
3. **Format** into Discord embed showing:
   - Overall success/failure counts
   - Individual tracker statuses
   - Error messages (if any)

---

## Embed Color Guidelines

- 🟢 **Green** (`0x00ff00`): All successful (`failed === 0`)
- 🟡 **Yellow** (`0xffff00`): Partial success (`failed > 0 && successful > 0`)
- 🔴 **Red** (`0xff0000`): All failed (`successful === 0`)

---

## Edge Cases

- **Token expires:** Summary won't be sent (no error to bot)
- **Invalid JSON:** Validate before parsing
- **Missing fields:** Handle gracefully

---

**Full Documentation:** See `docs/DISCORD_BOT_INTEGRATION.md` for complete details.
