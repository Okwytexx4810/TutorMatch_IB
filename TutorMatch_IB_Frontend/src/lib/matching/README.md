# `lib/matching`

The deterministic tutor matching engine.

Pure functions only. This folder must not import from `next/*`, Supabase or
OpenAI. It takes a `MatchingRequirements` object plus real tutor records and
returns ranked `TutorMatch` results.

## Scoring model (100 points)

| Criterion     | Points | Derived from                                             |
| ------------- | -----: | -------------------------------------------------------- |
| Subject       |     35 | Tutor's taught subjects vs the requested subject.          |
| Location      |     20 | Tutor's location vs the requested location.                |
| Availability  |     20 | Requested day/period slots vs the tutor's active slots.   |
| Budget        |     15 | Tutor's hourly rate vs the requested budget ceiling.       |
| Experience    |     10 | Tutor's years of experience vs the requested minimum.      |

`MATCH_WEIGHTS` in `src/types/domain.ts` is the single source of truth for these
numbers and must continue to sum to 100.

## Rules

1. Every score component returns both a number and a `reason` string, so the UI
   can always explain a percentage.
2. Missing requirement fields are treated as "no constraint" and award the
   criterion's points without penalty, keeping the score comparable.
3. The displayed "96% Match" figure is `tutor.matchScore`. It is never
   estimated, rounded up, or produced by a language model.
4. The engine must be unit-testable with plain objects. No database required.

## Planned modules

| Module            | Purpose                                                        |
| ----------------- | -------------------------------------------------------------- |
| `score.ts`        | Per-criterion scoring functions.                                |
| `rank.ts`         | Aggregates criteria into `TutorMatch` and sorts results.        |
