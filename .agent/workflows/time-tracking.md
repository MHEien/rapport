---
description: Track working times with timestamps for every session
---

# Time Tracking Workflow

When starting or ending any work session, update the time log in `docs/PROGRESS.md` with accurate timestamps.

## On Session Start
1. Note the current time from system metadata
2. Add a new entry under the current date's section in `docs/PROGRESS.md`

## On Session End or Task Completion
1. Note the end time
2. Calculate duration
3. Update the Hours Estimate table

## Log Format
Use the following format in progress entries:

```markdown
### Session Log
| Start | End | Duration | Work Done |
|-------|-----|----------|-----------|
| 12:22 | 16:36 | 4h 14m | PDF parsing improvements |
```

## Important
- Always use 24-hour format (HH:MM)
- Times come from the conversation metadata (do NOT fabricate times)
- Round durations to nearest 5 minutes
