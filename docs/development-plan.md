# TutorMatch IB — Development Plan

Thirteen phases, ordered so that every phase produces something demoable and
nothing depends on work that has not happened yet.

---

## Priority ranking

In a time-constrained hackathon, build in this order:

| Priority | Concern                                    | Phase |
| -------- | ------------------------------------------ | ----- |
| 1        | Working end-to-end core workflow          | 3 → 9 |
| 2        | Professional UI/UX                        | 2     |
| 3        | Reliable authentication                   | 3     |
| 4        | Real database                             | 4     |
| 5        | Tutor search and filtering                | 6     |
| 6        | Matching engine                           | 7     |
| 7        | Tutor request workflow                    | 9     |
| 8        | OpenAI integration                        | 8     |
| 9        | Testing                                   | 11    |
| 10       | Deployment                                | 12    |
| 11       | Presentation preparation                  | 13    |

**Do not** spend time on enterprise complexity: no micro-frontends, no message
queues, no caching layer, no CI/CD pipeline beyond Vercel's default Git
integration, no multi-region concerns.

Note the deliberate ordering of 7 before 8: the matching engine is deterministic
and testable, and it is the product's substance. OpenAI improves the input
experience but must never be on the critical path. If time runs short, cut 8
before cutting 7.

---

## Phase status

| Phase | Name                              | Status      |
| ----- | --------------------------------- | ----------- |
| 1     | Project foundation                | **Complete**|
| 2     | Design system and landing page    | **Complete**|
| 3     | Authentication                    | **Complete**|
| 4     | Supabase database                 | In progress (schema defined, seeding pending) |
| 5     | Tutor onboarding and profile      | Not started |
| 6     | Tutor discovery, search, filtering| Not started |
| 7     | Matching engine                   | Not started |
| 8     | OpenAI integration                | Not started |
| 9     | Tutor request and booking workflow| Not started |
| 10    | Dashboards                        | Not started |
| 11    | Testing                           | Not started |
| 12    | Deployment                        | Not started |
| 13    | Presentation preparation          | Not started |

### Phase 4A — schema and authorisation (implemented)

Delivered in this step:

- `TutorMatch_IB_Backend/supabase/migrations/20260103000000_initial_schema.sql`:
  8 tables, 6 enums, the `handle_new_user()` profile trigger, `is_admin()`, RLS on
  every table, and the grants that keep `role` out of the account holder's reach.
- `TutorMatch_IB_Backend/supabase/migrations/20260103001000_backfill_existing_profiles.sql`:
  one-off backfill for accounts created during Phase 3.
- `requireRole()` in `TutorMatch_IB_Frontend/src/lib/auth/session.ts`, reading the
  trusted `profiles.role`, with `/tutor/*` and `/admin/*` now enforcing it.

The migrations are intended for the linked remote project. Remote migration
status has not been independently verified here; run `supabase migration list`
against the target project to confirm local and remote are in sync before relying
on the deployed role guards.

Not yet done, and required before every role means something:

- No administrator exists. `handle_new_user()` refuses `admin` from metadata, so
  the first one must be granted by hand.
- Tutor seeding, discovery UI, onboarding, matching and booking writes all remain
  future phases.

### Phase 4K — controlled authentication test (passed)

Verified by hand against the linked remote project on `http://localhost:3001`,
which matches the project's Auth redirect allow-list of
`http://localhost:3001/**`. Remote email confirmation is required, so the test
covered the whole confirmation path:

- Student registration created the Auth user and its `profiles` row, returned the
  "check your inbox" message, and correctly issued no session beforehand.
- The confirmation link returned through `/auth/callback` and established the
  session.
- Sign-in sent the student to `/dashboard`, with the role read from
  `profiles.role` rather than user metadata.
- `/dashboard` was allowed. `/tutor/dashboard` and `/admin` both redirected the
  student away, so `requireRole()` denies cross-role access.
- Sign-out ended the session and `/login` served the form normally afterwards.

Only the student path is covered. Parent, tutor and admin are still unverified,
and an administrator has to be granted before `/admin` can be exercised.

---

## Phase 1 — Project foundation ✅

**Goal:** a buildable, documented, well-structured Next.js project.

| Deliverable                                       | Status |
| ------------------------------------------------- | ------ |
| Next.js 16 App Router project, TypeScript strict  | Done   |
| Tailwind v4, shadcn/ui (Radix), Lucide icons      | Done   |
| Route groups and all 16 planned routes             | Done   |
| 21 UI primitives vendored into `components/ui`    | Done   |
| Layout components: header, footer, logo, shell    | Done   |
| Shared states: loading, empty, error, placeholder | Done   |
| Domain types (`types/domain.ts`, `tutor.ts`, `engagement.ts`) | Done |
| Validated env access (`lib/env.ts`)               | Done   |
| Layer contracts documented for supabase / openai / matching | Done |
| `.env.example` with no secrets                    | Done   |
| `npm run lint`, `typecheck`, `build` all passing  | Done   |
| `docs/` written                                   | Done   |

**Deliberately excluded:** authentication, schema, OpenAI, matching logic,
booking logic. See [`architecture.md`](./architecture.md).

---

## Phase 2 — Design system and landing page

**Goal:** a credible product surface for judges.

| Task                                                        | Estimate |
| ----------------------------------------------------------- | -------- |
| Landing page: hero, how it works, for-tutors CTA, footer    | 3h       |
| Tutor-facing and student-facing copy pass                   | 1h       |
| Mobile pass on all public pages                             | 2h       |
| Empty, error and loading states on every public page        | 2h       |
| Basic metadata, favicon, OG image                           | 1h       |

**Done when:** a judge can land on `/` and understand the product in ten seconds.

---

## Phase 3 — Authentication

**Goal:** reliable sign-up, sign-in, session, and role-based routing.

| Task                                                              | Estimate |
| ----------------------------------------------------------------- | -------- |
| Supabase project, `@supabase/ssr` client and server helpers       | 2h       |
| `proxy.ts` for session refresh (**not** `middleware.ts` in Next 16)| 1h       |
| Sign-up with role selection                                       | 2h       |
| Sign-in, sign-out, password reset                                 | 2h       |
| `requireUser()` / `requireRole()` server guards                   | 2h       |
| Role-aware redirect after login                                   | 1h       |
| Guard `dashboard/`, `tutor/` and `admin/` layouts                 | 1h       |

**Done when:** each role lands on its own dashboard and cannot reach another
role's routes by typing the URL.

---

## Phase 4 — Supabase database

**Goal:** a real database with enforced access control.

| Task                                                                    | Estimate |
| ----------------------------------------------------------------------- | -------- |
| Schema from [`database-design.md`](./database-design.md): 8 tables      | 4h       |
| Enums, constraints, the exclusion constraint for double-booking          | 2h       |
| Indexes                                                                  | 1h       |
| RLS policies on every table                                             | 4h       |
| Storage buckets: avatars (public), credentials (private)                | 2h       |
| Generate `Database` types and wire into `lib/supabase`                  | 2h       |
| Typed query and mutation helpers                                         | 3h       |
| Seed 12–15 tutors with varied subjects, locations and rates              | 2h       |

**Done when:** a signed-in user can read only their own rows via the browser
client, and RLS blocks everything else.

---

## Phase 5 — Tutor onboarding and profile

**Goal:** tutors can publish a complete, discoverable profile.

| Task                                                   | Estimate |
| ------------------------------------------------------ | -------- |
| Tutor profile form: bio, headline, location            | 3h       |
| Subjects and levels multi-select                       | 2h       |
| Qualifications with institution and year               | 2h       |
| Years of experience, hourly rate, teaching mode         | 2h       |
| Availability editor: day × period grid                 | 4h       |
| Profile completeness meter and gating                   | 2h       |
| Avatar upload to Supabase Storage                      | 1h       |

**Done when:** a new tutor completes onboarding and appears in search.

---

## Phase 6 — Tutor discovery, search and filtering

**Goal:** students find tutors without using AI at all.

| Task                                                    | Estimate |
| ------------------------------------------------------- | -------- |
| Tutor list query with server-side filters               | 3h       |
| `SearchFilters`: subject, location, budget, mode       | 3h       |
| Availability day and period filter                      | 2h       |
| URL as filter state, so results are shareable           | 1h       |
| `TutorCard` and tutor grid                              | 3h       |
| `/tutors/[id]` profile with live availability           | 3h       |
| Pagination, sorting, empty state                        | 2h       |

**Done when:** a student can filter their way to a tutor with no AI involved.

---

## Phase 7 — Matching engine

**Goal:** the deterministic, explainable scoring engine. The core deliverable.

| Task                                                              | Estimate |
| ----------------------------------------------------------------- | -------- |
| `lib/matching/score.ts`: five criteria, each returning a reason     | 4h       |
| `lib/matching/rank.ts`: aggregate, sort, clamp                      | 2h       |
| Weight constants from `MATCH_WEIGHTS`                               | 0.5h     |
| Unit tests per criterion, including edge cases                      | 3h       |
| Explainable match UI: score badge plus expandable breakdown         | 3h       |
| `/dashboard/find-tutor` with the structured requirement form        | 3h       |

**Done when:** any score can be traced to specific database values, and every
criterion has passing tests.

**Scoring model:**

| Criterion     | Points | Method                                   |
| ------------- | -----: | ---------------------------------------- |
| Subject       |     35 | Exact match 35, related subject 18, else 0 |
| Location      |     20 | Same area 20, same city 12, else 0      |
| Availability  |     20 | Proportional to the share of requested slots the tutor covers |
| Budget        |     15 | Within budget 15, within 10% over 8, else 0 |
| Experience    |     10 | Meets or exceeds the minimum 10, else proportional |

---

## Phase 8 — OpenAI integration

**Goal:** natural language in, structured requirements out. Strictly an input
convenience.

| Task                                                              | Estimate |
| ----------------------------------------------------------------- | -------- |
| `lib/openai/client.ts` from `serverEnv()`                          | 1h       |
| `POST /api/match/requirements`                                     | 2h       |
| Extraction prompt and `responses.parse` with structured output     | 3h       |
| Zod validation of model output against `matchingRequirementsSchema`| 1h       |
| Free-text input plus editable structured preview                   | 3h       |
| Timeout, retry, per-user rate limit, and a graceful fallback      | 2h       |
| Loading and partial-failure states                                 | 1h       |

**Done when:** the example sentence produces the expected requirements, and
disabling the OpenAI key degrades gracefully to filters with no broken UI.

**Hard constraint:** the model never receives tutor data and never produces a
match score.

---

## Phase 9 — Tutor request and booking workflow

**Goal:** the end-to-end transaction. The demo centrepiece.

| Task                                                            | Estimate |
| --------------------------------------------------------------- | -------- |
| Send request with subject, message, preferred slots              | 3h       |
| `RequestStatusBadge` and request list                             | 2h       |
| Tutor request inbox                                               | 2h       |
| Accept, decline, cancel                                           | 3h       |
| Create booking from an accepted request                           | 3h       |
| Booking list with upcoming and past sessions                      | 3h       |
| Mark completed, submit review, show rating                        | 3h       |
| Status transitions validated in the database                      | 1h       |

**Done when:** a request travels from student to tutor to confirmed booking to
review, with every state visible to both sides.

---

## Phase 10 — Dashboards

**Goal:** every role opens the app to a useful screen.

| Task                                                      | Estimate |
| --------------------------------------------------------- | -------- |
| Student overview: counts, next session, recent requests   | 3h       |
| Tutor dashboard: incoming requests, next session, metrics | 3h       |
| Admin console: users, tutors, students, requests, stats    | 4h       |
| Mobile sidebar drawer                                      | 2h       |
| Auth slots in the dashboard header: avatar menu, sign-out | 2h       |
| Profile management pages                                  | 2h       |

**Done when:** each role can complete its daily tasks without leaving its area.

---

## Phase 11 — Testing

**Goal:** confidence in the two things that must not break.

| Task                                                        | Estimate |
| ----------------------------------------------------------- | -------- |
| Unit tests for every matching criterion and edge case       | 4h       |
| Integration test of the request → booking transitions        | 3h       |
| Zod schema tests                                            | 2h       |
| RLS policy tests: each role against each table              | 3h       |
| Key flows on Playwright: login, find, request, accept       | 4h       |

**Rule:** the matching engine and the authorisation guards get real tests.
Cosmetic UI does not.

---

## Phase 12 — Deployment

**Goal:** a live URL judges can open.

| Task                                                       | Estimate |
| ---------------------------------------------------------- | -------- |
| Connect the GitHub repo to Vercel                          | 1h       |
| Set all environment variables in Vercel                     | 1h       |
| Configure Supabase auth redirect URLs for the domain        | 1h       |
| Verify production build, RLS and OpenAI on the live domain  | 2h       |
| Smoke test every role on production                        | 2h       |
| Custom domain if time allows                               | 1h       |

**Done when:** a judge can use the product from a phone, on a real domain, with
real data.

---

## Phase 13 — Presentation preparation

**Goal:** tell the story clearly in the time allowed.

| Task                                                              | Estimate |
| ----------------------------------------------------------------- | -------- |
| Slides built from [`system-diagrams.md`](./system-diagrams.md)    | 3h       |
| Demo script with a fallback recording                            | 2h       |
| End-to-end demo on real devices                                  | 1h       |
| Rehearse the differentiator: natural language → ranked tutors    | 1h       |
| Prepare answers for likely judge questions                       | 1h       |

**The three things to nail:**

1. **The AI boundary** — the model extracts requirements; the database supplies
   facts; the engine calculates the score. This is the strongest technical story
   in the project.
2. **The end-to-end flow** — describe, match, request, accept, book, review.
3. **RLS and server-side authorization** — access control is enforced by the
   database, not by the UI.

---

## Critical path

```
Phase 1 ✅ → 3 (auth) → 4 (database) → 5 (tutor profile) → 6 (search)
                                                          │
                                                          ▼
                                              7 (matching) → 9 (requests) → 10 (dashboards)
                                                          │
                                                          ▼
                                                  8 (OpenAI, parallel)
```

Phase 2 can run in parallel with 3. Phase 8 can run in parallel with 9. If time
runs out, drop in this order: **8 → 11 (partially) → 13 polish**. Never drop 7.

---

## Definition of done, per phase

- [ ] `npm run lint` passes with no warnings
- [ ] `npm run typecheck` passes with no `any`
- [ ] `npm run build` succeeds
- [ ] Works on a 375px-wide viewport
- [ ] Loading, empty and error states exist
- [ ] Keyboard navigable, visible focus rings
- [ ] No secret in client code
- [ ] Every input validated with Zod
- [ ] Documentation updated if the design changed
- [ ] Committed to GitHub
