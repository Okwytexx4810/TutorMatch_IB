# `lib/validation`

Zod schemas for all external input.

Files are named after the payload they guard.

| Schema file                    | Guards                                              |
| ------------------------------ | --------------------------------------------------- |
| `matching-requirements.ts`     | The structured requirements shared by AI + matching.  |

## Rules

1. Parse at the boundary: inside the route handler or server action, before any
   other code runs.
2. Never spread `JSON.parse(...)` output into a component without parsing it.
3. Database writes get their own schemas per table (Phase 4+).
4. Schemas are exported as both the Zod object and the inferred type, so callers
   never hand-write a duplicate interface.
