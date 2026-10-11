# TutorMatch IB — API Design

TutorMatch IB has no public REST API in the MVP. The browser talks to the
server through **Server Actions**, plus a small number of **Route Handlers** where
a real HTTP boundary exists.

Choosing correctly:

| Need                                                | Use                  |
| --------------------------------------------------- | -------------------- |
| A form submits data and the server writes to the DB | **Server Action**    |
| A mutation initiated by a button                    | **Server Action**    |
| An external system calls us (webhook)               | **Route Handler**    |
| A long-running, cached GET that must be shareable   | **Route Handler**    |
| OpenAI requirement extraction over HTTP             | **Route Handler**    |

Server Actions are preferred for most work: no hand-rolled fetch wrapper, no
duplicate validation, and the authorization check lives in the same file as the
mutation.

---

## 1. Conventions

### Location

| Concern              | Location                                      |
| -------------------- | --------------------------------------------- |
| Mutations            | `TutorMatch_IB_Frontend/src/app/**/actions.ts`, each file `"use server"` |
| HTTP endpoints       | `TutorMatch_IB_Frontend/src/app/api/**/route.ts` |
| Input schemas        | `TutorMatch_IB_Frontend/src/lib/validation/*.ts` |
| Business logic       | `TutorMatch_IB_Frontend/src/lib/matching/*.ts` |
| Data access          | `TutorMatch_IB_Frontend/src/lib/supabase/*.ts` |
| OpenAI calls         | `TutorMatch_IB_Frontend/src/lib/openai/*.ts`   |
| Error mapping        | `TutorMatch_IB_Frontend/src/lib/utils/errors.ts` |

### Every request follows the same four steps

```ts
export async function sendTutorRequest(input: unknown): Promise<ActionResult> {
  // 1. Parse  — never trust the shape of the input
  const parsed = sendRequestSchema.safeParse(input);
  if (!parsed.success) return failure("Please check the highlighted fields.");

  // 2. Authorize — resolve identity on the server, never from the payload
  const user = await requireUser();               // throws AppError 401
  await requireRole(user, ["student", "parent"]); // throws AppError 403

  // 3. Act — call a data-access helper; no raw SQL in an action
  const request = await createTutorRequest({ ...parsed.data, requesterId: user.id });

  // 4. Respond — a serialisable result, never a Supabase or OpenAI object
  revalidatePath("/dashboard/requests");
  return success({ requestId: request.id });
}
```

### Action return shape

Actions return a plain, serialisable object — never a Supabase client, an SDK
response, or an error with a stack trace.

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string; fieldErrors?: Record<string, string[]> } };
```

### HTTP conventions for route handlers

| Situation              | Status |
| ---------------------- | ------ |
| Validation failed      | 400    |
| Not signed in          | 401    |
| Signed in, not allowed | 403    |
| Resource missing       | 404    |
| State conflict         | 409    |
| OpenAI unavailable     | 503    |
| Anything unexpected    | 500    |

Success and error bodies:

```jsonc
// 200
{ "data": { /* ... */ } }

// error
{ "error": { "code": "bad_request", "message": "Please check the highlighted fields." } }
```

### Security rules

1. **Never accept an id or role from the client as authority.** A user id in a
   request body is a hint, not proof. Authorize against `auth.uid()`.
2. **Always parse with Zod** before any database or OpenAI call.
3. **Never return an SDK error.** `toErrorResponse` replaces anything unknown
   with a generic message; the real error goes to the server log.
4. **OpenAI never runs in the browser.** The key is read through `serverEnv()`
   and the call lives in `lib/openai`.
5. **Rate-limit anything that costs money.** The extraction endpoint calls
   OpenAI, so it is the one route that must be throttled per user.

---

## 2. Server Actions

### `app/(auth)/actions.ts` — Phase 3

| Action               | Input                        | Authorisation     | Effect                             |
| -------------------- | ---------------------------- | ----------------- | ---------------------------------- |
| `signUp`             | email, password, full name, role | public        | Supabase Auth signup, then `profiles` insert |
| `signIn`             | email, password              | public            | Session cookie                     |
| `signOut`            | —                            | any signed-in user | Clear session                      |
| `requestPasswordReset` | email                      | public            | Reset email                        |

`signUp` writes the role to the `profiles` row and never trusts a role coming
from the client after signup.

### `app/dashboard/find-tutor/actions.ts` — Phases 7 and 8

| Action              | Input                | Authorisation          | Effect                          |
| ------------------- | -------------------- | ---------------------- | ------------------------------- |
| `extractRequirements` | `{ text: string }` | signed-in user        | OpenAI → structured requirements |
| `findMatches`       | `MatchingRequirements` | signed-in user      | Matching engine → ranked tutors |
| `saveRequirement`   | `MatchingRequirements` | student, parent     | Upsert saved requirement         |

`extractRequirements` is rate-limited. `findMatches` is pure and can run on every
keystroke of a filter change without further OpenAI calls.

### `app/dashboard/requests/actions.ts` — Phase 9

| Action                | Input              | Authorisation            | Effect                          |
| --------------------- | ------------------ | ------------------------ | ------------------------------- |
| `sendTutorRequest`    | tutor id, subject, message, slots | student, parent | Insert `pending` request        |
| `cancelRequest`       | request id         | requester only           | `cancelled`                     |
| `acceptRequest`       | request id         | tutor party only         | `accepted`                      |
| `declineRequest`      | request id, reason | tutor party only         | `declined`                      |

### `app/dashboard/bookings/actions.ts` — Phase 9

| Action               | Input            | Authorisation       | Effect                              |
| -------------------- | ---------------- | ------------------- | ----------------------------------- |
| `confirmBooking`     | request id, start, end | both parties    | Insert booking from an accepted request |
| `cancelBooking`      | booking id       | both parties        | `cancelled`                          |
| `completeBooking`    | booking id       | tutor party          | `completed`                         |
| `submitReview`       | booking id, rating, comment | requester, booking completed | Insert review |

### `app/tutor/profile/actions.ts` and `availability/actions.ts` — Phase 5

| Action                  | Input                            | Authorisation  | Effect                        |
| ----------------------- | -------------------------------- | -------------- | ----------------------------- |
| `updateTutorProfile`    | bio, subjects, quals, rate, mode | tutor, own row | Upsert `tutor_profiles`       |
| `setAvailability`       | `{ day, period }[]`              | tutor, own row | Replace own slots             |
| `setQualifications`     | qualification list               | tutor, own row | Replace own qualifications    |

Tutors can write their own profile rows and nothing else. `is_verified` is not
part of any tutor-facing input.

---

## 3. Route Handlers

### `POST /api/match/requirements` — Phase 8

The one endpoint with a genuine reason to exist: natural language in, structured
requirements out. It is separate so the OpenAI call can be rate-limited,
time-boxed and cached independently of the page render.

**Request**

```jsonc
{
  "text": "I need a patient Mathematics tutor for WAEC preparation. My daughter
           is available Tuesday and Thursday evenings and we prefer someone
           around Bodija. Our budget is around \u20a67,000 per lesson."
}
```

**200 OK**

```jsonc
{
  "data": {
    "requirements": {
      "subject": "Mathematics",
      "level": "waec",
      "location": "Bodija",
      "availability": [
        { "day": "tuesday", "period": "evening" },
        { "day": "thursday", "period": "evening" }
      ],
      "budget": 7000,
      "teachingMode": null,
      "minExperienceYears": null,
      "notes": "Prefers a patient tutor; preparing for WAEC."
    }
  }
}
```

**Errors**

| Status | Code              | When                                         |
| ------ | ----------------- | -------------------------------------------- |
| 400    | `bad_request`     | Empty text, or above the length limit         |
| 401    | `unauthorized`    | Not signed in                                |
| 429    | `rate_limited`    | Extraction quota exceeded                    |
| 503    | `ai_unavailable`  | OpenAI failed or timed out — client falls back to filters |

The response contains **requirements only**. It never contains a tutor, a rate, a
rating or a match score.

### `POST /api/auth/confirm` — Phase 3

Server-side handling of the Supabase email confirmation token, so the callback
runs on the server and sets the session cookie before redirecting into the app.

### `POST /api/webhooks/supabase` — Phase 3

Receives Supabase auth events. Verified with the webhook secret before being
processed. Uses the service-role client, and never runs on a user request path.

---

## 4. Matching endpoint contract

Matching is a Server Action, not a route, because it is pure and cheap.

**Input** — `MatchingRequirements`, Zod-validated:

```jsonc
{
  "subject": "Mathematics",
  "level": "waec",
  "location": "Bodija",
  "availability": [
    { "day": "tuesday", "period": "evening" },
    { "day": "thursday", "period": "evening" }
  ],
  "budget": 7000,
  "teachingMode": "in_person",
  "minExperienceYears": 0
}
```

**Output** — ranked tutors, highest score first:

```jsonc
{
  "data": {
    "matches": [
      {
        "tutorId": "0f6c...",
        "matchScore": 96,
        "breakdown": [
          {
            "criterion": "subject",
            "score": 35, "maxScore": 35,
            "reason": "Teaches Mathematics at WAEC level"
          },
          {
            "criterion": "location",
            "score": 20, "maxScore": 20,
            "reason": "Based in Bodija, 1.2 km from your area"
          },
          {
            "criterion": "availability",
            "score": 16, "maxScore": 20,
            "reason": "Free Tuesday evening; Thursday evening pending"
          },
          {
            "criterion": "budget",
            "score": 15, "maxScore": 15,
            "reason": "₦6,500 per hour, within your ₦7,000 budget"
          },
          {
            "criterion": "experience",
            "score": 10, "maxScore": 10,
            "reason": "8 years teaching experience"
          }
        ]
      }
    ]
  }
}
```

Every `reason` is derived from database values. `matchScore` is the sum of the
breakdown and is the only number the UI may present as "96% Match".

---

## 5. Security boundaries

```
Browser
  └─ NEXT_PUBLIC_* only (Supabase URL, anon key)
        │
        ▼  cookies only, no secrets
Next.js server
  ├─ OPENAI_API_KEY              never leaves the server
  ├─ SUPABASE_SERVICE_ROLE_KEY   Phase 4+, admin and webhook paths only
  ├─ authorises every request against auth.uid()
  └─ validates every payload with Zod
        │
        ▼
Supabase (RLS)  ·  OpenAI Responses API
```

| Rule                                                    | Enforced by                        |
| ------------------------------------------------------- | ---------------------------------- |
| Secrets never reach the browser                         | No `NEXT_PUBLIC_` prefix + `lib/env.ts` |
| Only the current user's data is reachable               | RLS policies on every table        |
| Roles are resolved server-side                          | `auth.uid()` in policies, not payload fields |
| Input is never trusted                                  | Zod at every boundary               |
| Internal errors never surface                           | `toErrorResponse`                   |
| Expensive endpoints are throttled                       | Per-user limit on the extraction route |
| `.env.local` is never committed                         | `.gitignore` plus `.env.example` only |

---

## 6. Idempotency and concurrency

Not needed for the MVP beyond two cases, both handled in the schema:

- **Double-submitted request** — prevented by the partial unique index on
  `(requester_id, tutor_id)` where `status = 'pending'`.
- **Double-booked tutor** — prevented by the GiST exclusion constraint on
  overlapping `tstzrange(starts_at, ends_at)` for confirmed bookings.

Server Actions are not retried automatically, so a user double-clicking a button
is handled by disabling the control while the action is in flight.
