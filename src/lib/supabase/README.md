# `lib/supabase`

Server-side data access for TutorMatch IB.

Nothing in this folder may be imported from a Client Component.

## Planned modules

| Module                  | Purpose                                                                     |
| ----------------------- | --------------------------------------------------------------------------- |
| `client.ts`             | Browser Supabase client (`createBrowserClient`) for auth-only operations.    |
| `server.ts`             | Request-scoped server client (`createServerClient`) bound to cookies.       |
| `admin.ts`              | Service-role client. Phase 4+. Only for webhooks and admin tooling.        |
| `queries/*.ts`          | Typed read helpers. One module per domain concept.                          |
| `mutations/*.ts`        | Typed write helpers. Always paired with an authorization check.             |
| `types.ts`              | `Database` type generated from the Supabase schema.                          |

## Rules

1. Every query and mutation must run through a request-scoped client so that
   Row Level Security applies to the current user.
2. `admin.ts` bypasses RLS. It must never be reachable from a user request path.
3. Query helpers return domain types from `src/types`, not raw row objects.
4. Validation with Zod happens at the edge of this layer, never in the UI.
