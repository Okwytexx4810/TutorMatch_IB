# `app/api`

Server-side API endpoints (Next.js Route Handlers).

Use a route handler only when there is a genuine HTTP boundary:

- a webhook receiver (Supabase auth callback, OpenAI callback)
- a resource that a non-Next client must call
- a long-running or cached GET that should be independently addressable

Otherwise prefer a **Server Action** called directly from a form or a Client
Component. Server Actions avoid a serialisation round trip and keep the
authorization check next to the mutation.

## Rules

1. Every handler parses its input with a Zod schema from `lib/validation`
   before touching anything else.
2. Every handler resolves the current user server-side and authorizes the
   action. Never trust a user id, role, or tutor id sent by the client.
3. Errors are converted with `toErrorResponse` from `lib/utils/errors`, so
   internal messages never reach the client.
4. No OpenAI or Supabase service-role calls are made from a route the browser
   can reach without an authorization check.

## Planned routes

| Method | Path                        | Purpose                                        |
| ------ | --------------------------- | ---------------------------------------------- |
| `POST` | `/api/match/requirements`   | Natural language in, structured requirements out. |
| `POST` | `/api/auth/confirm`         | Server-side email OTP confirmation.             |
| `POST` | `/api/webhooks/supabase`    | Supabase auth event webhook.                    |
