# TutorMatch IB — Production Functionality Audit

Date: 2026-10-12. Scope: `C:\Users\USER\TutorMatch IB` (monorepo: `TutorMatch_IB_Frontend/` Next.js app + `TutorMatch_IB_Backend/supabase/`).

Method and scope limits: this is a read-only audit. No files were modified, no migrations run, no remote project (production `pqavpxjfliftaixjkomh` or test `ittasnemlaicxwfvhtwj`) was touched, no credentials were read or displayed. Everything below was verified from local files, local test/build runs, and the recovered prior session transcript from the local opencode database. **Remote/live behaviour is classed UNKNOWN unless stated — the previous session never applied the pending migrations.**

---

## 1. Executive summary

TutorMatch IB is a two-role tutor-matching app (students/parents ↔ tutors) for Ibadan. The codebase is in a strong, near-complete state: authentication, role handling, tutor profiles, discovery, requests, bookings, availability, and a brand-new admin console are all implemented in the frontend, and the matching SQL is written as four not-yet-applied migrations.

**The reason prior work stopped is now confirmed:** the recovered session (`ses_ed1e281b8ffe5GdhRtXF2ARMXn`) finished writing Stage B / Stage C / Stage C1 migrations, the admin console migration, the admin queries/pages, `demo-data.sql` and the pgTAP test, then paused **before applying any migration** and asked you (the owner) for the DB password and an `ADMIN_EMAILS` value. It never received them, so nothing was shipped.

**Bottom line:** the app is *implemented* but *not deployed* against its own schema. Two base migrations are live; Stages B/C/C1 and the admin console are prepared but unapplied. Discovery, tutor profiles, requests and bookings will not fully work until those are applied, and this is the single blocker separating the repo from a demonstrable product.

**Local verification is green:** `typecheck` ✓, `lint` ✓, 61 unit tests pass (5 files) ✓, production `build` ✓ including all `/admin/*` routes.

---

## 2. Interrupted-task recovery

The exact original instructions and the progress of the interrupted session were recovered read-only from the local opencode store (`C:\Users\USER\.local\share\opencode\opencode.db`):

- Session `ses_ed1e281b8ffe5GdhRtXF2ARMXn` — **"TutorMatch IB production audit and repair"**, ran 2026-10-12 03:17 → 11:40 UTC. Contains the full "Production Functionality Audit, Repair, and Verification" prompt (the audit this report fulfils).
- Companion session `ses_ed1eaa29affeMPKiEAwyaVkZw1` — "Implement Ibadan tutoring locations".

Recovered todo state (last entries, in order):

1. `in_progress` — service-role helper + `ADMIN_EMAILS` promotion ✅ (completed in the code: `TutorMatch_IB_Frontend/src/lib/supabase/service.ts`, `src/lib/auth/admin.ts`)
2. `pending` → completed — admin console migration → `supabase/migrations/20261011000300_admin_console.sql`
3. `pending` → completed — admin queries/pages → `src/lib/supabase/queries/admin.ts`, `src/lib/supabase/mutations/admin.ts`, `src/app/admin/*`
4. `pending` — **apply migrations to live DB** → **NOT DONE; requires owner credential.**
5. `pending` — final `typecheck`/`lint`/`test`/`build` verification → **redone this audit: all pass.**

The session's final message claimed tests/build passed and asked for the DB credential/email approval; the transcript shows no commit, push, or migration against the linked project including after that point. Git confirms it: last commit is `882b66c`, with Stacks B/C/C1, admin console, `demo-data.sql` and the pgTAP test all present only as untracked files.

---

## 3. Completed / verified

All verification commands were run in `TutorMatch_IB_Frontend/`:

| Check | Result |
|---|---|
| `npm run typecheck` | **PASS** (tsc, no errors) |
| `npm run lint` | **PASS** (eslint, no errors) |
| `npx vitest run` | **PASS — 5 files / 61 tests** |
| `npm run build` | **PASS** (Next 16.3.8; all routes compiled, incl. `/admin`, `/admin/requests`, `/admin/tutors`, `/admin/users`) |

Test files passing: `src/lib/validation/tutor-discovery.test.ts` (14), `src/lib/locations.test.ts` (8), `src/lib/auth/admin.test.ts` (6), `src/lib/validation/engagement.test.ts` (23), `src/lib/validation/tutor-profile.test.ts` (10).

### Authentication & authorization — reviewed, no escalation path found
- `src/app/(auth)/actions.ts` — login, signup, logout, password reset for both roles.
- `src/lib/auth/session.ts` — `getUser`, `getProfile`, `requireRole`, `requireTutorProfile`; role read from `profiles`, never from the submitted payload.
- `src/lib/auth/roles.ts` — `PUBLIC_ROLES`, `homeForRole`, `isRole`, `isPublicRole`. Admin is deliberately outside `PUBLIC_ROLES`.
- `src/lib/auth/admin.ts` — bootstraps `admin` role for an `ADMIN_EMAILS` allow-list using the service client.
- `src/lib/supabase/service.ts` — `getServiceSupabase()` returns `null` when no service-role key is configured (safe default).
- `src/proxy.ts` — Next 16 rewrite proxy that refreshes the Supabase cookie; existing pages run through the rewrite rule.

### Tutor discovery — fully implemented, degrades to base schema
- `src/lib/supabase/queries/tutors.ts` — public reads through RLS; subject matching pushed into Postgres, level/location/availability/budget filtering applied in code with a `display_name` missing-column fallback.
- `src/lib/validation/tutor-discovery.ts` — Zod schema + 14 passing tests.
- `src/lib/locations.ts` — **26 canonical Ibadan locations**, `resolveIbadanLocation`.
- `src/lib/subjects.ts` — curated subject list + `SUBJECT_MAX`.
- `src/app/(marketing)/find-tutors/page.tsx` — public page (no sign-in required) wired to the discovery form/results components.

### Tutor profiles — implemented with pre-migration fallback
- `src/lib/validation/tutor-profile.ts` — strict-object schema; canonical-location transform; server-computed `profile_completeness` (form cannot claim 100% by itself).
- `src/lib/supabase/mutations/tutor-profile.ts` — create-or-update-owned; rejects `upsert` to avoid writing the `profile_id` column; writes `tutor_subjects` (subject × level cartesian) after the profile row; `display_name` fallback for base-schema environments.
- `src/app/tutor/actions.ts` — allowlist of five `FormData` fields → server parse → write; protected columns never reach the schema input.

### Admin console (new since interruption) — code complete
- `src/lib/supabase/queries/admin.ts`, `mutations/admin.ts`; routes `/admin`, `/admin/requests`, `/admin/tutors`, `/admin/users`; `src/app/admin/page.tsx` shows real stats (users, learners, tutors, requests, pending, bookings) + recent applications, with `force-dynamic` and `requireRole(["admin"])`.
- `20261011000300_admin_console.sql` prepared (not applied).

### Availability
- `src/lib/supabase/mutations/availability.ts`, queries in `tutor-profile.ts`, editor page + weekly grid on the public tutor detail page (`src/app/(marketing)/tutors/[id]/page.tsx`), safe day/period reconcile (insert missing, delete unticked, `onConflict` upsert).

---

## 4. Partially implemented

- **Requests flow end-to-end** — client code is complete (`src/lib/validation/engagement.ts` + 23 tests, `mutations/requests.ts`, `components/requests/request-form.tsx`, dashboard worklists), but the full data path (`level`, `location` columns; C1 insert policy) depends on Stage C / C1, which are unapplied. On a base-schema DB the requests path is degraded.
- **Bookings flow end-to-end** — same situation; booking creates/status transitions depend on Stage C grants/trigger and C1 policy. Code complete; **non-functional until migrations are applied.**
- **Reviews** — read surface implemented (average rating + recent reviews on the tutor detail page, driven by `tutor_ratings` / `reviews`); **no submission flow** exists for writing a review.

## 5. Not implemented

- **Matching engine (Phase 7)** — `src/lib/matching/` contains only a README.
- **OpenAI integration (Phase 8)** — `src/lib/openai/` contains only a README.
- **API routes** — `src/app/api/` contains only a README.
- **Review submission flow** — see §4.

These are deliberate scope cutoffs documented in the README roadmap, not regressions.

## 6. Undeterminable (without remote access)

- Whether the linked live project (`pqavpxjfliftaixjkomh`) currently runs the base schema or later schema — the two `20260103*` migrations are confirmed applied by the prior session's records; the four later ones are confirmed **not** applied, so the live DB is running the base schema unless you applied something since.
- Contents/quality of live `tutor_profiles`, `tutor_subjects` etc. row data.
- Whether email delivery (`supabase.auth` confirm/reset) is configured on the project.

---

## 7. Functionality audit (A–G)

| Area | Status | Evidence |
|---|---|---|
| **A. Authentication & authz** | **VERIFIED COMPLETE** (local) | `(auth)/actions.ts`, `src/lib/auth/*`, `src/proxy.ts`; no role-self-escalation path; admin bootstrap allow-listed via `ADMIN_EMAILS`; role asserted server-side from `profiles`. |
| **B. Tutor profiles** | **IMPLEMENTED — NOT VERIFIED** (needs live E2E) | Form + Zod + mutation reviewed; completeness computed server-side; works with and without Stage B via `display_name` fallback. |
| **C. Discovery** | **VERIFIED COMPLETE** (local) | 26 locations, curated subjects, filters, public page, base-schema fallback; 14 discovery tests + 8 location tests pass. |
| **D. Requests** | **IMPLEMENTED — NOT VERIFIED** (blocked pre-migration) | `validation/engagement.ts`, `mutations/requests.ts`, request form/dashboards; full path gated on Stage C/C1. |
| **E. Bookings** | **IMPLEMENTED — BLOCKED** until Stage C/C1 applied | Client + SQL reviewed as consistent; **cannot function on base schema** (no insert grant/columns). |
| **F. Supabase (backend)** | **PARTIALLY IMPLEMENTED** | 2 base migrations applied; Stage B/C/C1 + admin console **prepared, NOT applied**; `demo-data.sql` test-only; pgTAP plan written, **not executed**. |
| **G. UX & demo readiness** | **COMPLETE** (code-level) | Loading/empty/error states across pages; marketing site + dashboards built; 12 pages compile. |

---

## 8. Safe verification results

See §3 table. Additionally:

- `.env*` files are git-ignored; only `.env.example` is tracked; no secrets inspected.
- `src` contains no leftover TODO/FIXME stubs (only legitimate `placeholder:` CSS/prop defaults).
- `build2.log` at the repo root is a stale artifact of an earlier build (pre-admin-routes era, 13 pages).

---

## 9. Migration & test readiness

Apply order, strictly: **`20260103000000_initial_schema` → `20260103001000_backfill_existing_profiles` → `20261011000000_stage_b_tutor_discovery` → `20261011000100_stage_c_requests_bookings` → `20261011000200_stage_c1_security_hardening` → `20261011000300_admin_console`**.

- Each later migration declares its dependency in comments and SQL (e.g., admin console builds on Stage C's grants; C1's request-insert policy requires `tutor_subjects`).
- `20261011000200_stage_c1_security_hardening` is written restart-safe (idempotent `CREATE POLICY IF NOT EXISTS`-style guards).
- `supabase/tests/stage_c1_security.test.sql` — pgTAP plan covering the C1 policies/grants. **Declared NOT EXECUTED** (no local DB to run it against).
- `supabase/demo-data.sql` — idempotent, TEST ENVIRONMENT ONLY, asserts the schema exists before seeding; seeds canonical tutors/subjects/availability/reviews to make the app demoable.
- The admin console migration seeds the `admin` role if missing and relies on `ADMIN_EMAILS` (rendered in `src/lib/auth/admin.ts`).

### Readiness verdict
Preparation: **ready**. Execution: **not begun** — needs (a) your DB password/approval, (b) an `ADMIN_EMAILS` value. After applying, run `stage_c1_security.test.sql`, then reseed demo data in the test project.

---

## 10. Docs vs reality

- **README.md (`README.md:138-169`) is stale:** it claims matching engine, tutor discovery, the booking workflow and OpenAI are *"deliberately not implemented yet."* Discovery, booking workflow, requests and the admin console **are implemented**. Only the matching engine and OpenAI remain genuinely absent.
- README omits: Stage B/C/C1 + admin console migrations, `demo-data.sql`, the pgTAP test, the `ADMIN_EMAILS` mechanism, and the `/admin` routes.
- `docs/*.md` (6 files) are accurate and current for their subjects (discovery, requests, bookings, security, admin, roadmap).
- `src/lib/matching/` and `src/lib/openai/` are README-only (correctly reflect "not implemented").

Recommendation: correct the README "Not yet implemented" paragraph to reference Phase 7/Phase 8 and the pending migrations.

---

## 11. Blockers

1. **Migrations unapplied to both projects.** The single hard blocker. Basline app cannot support requests/bookings; fixes nothing remotely.
2. **Owner credentials/approval not provided** (the reason the previous session stopped): DB password for the linked project + chosen `ADMIN_EMAILS` value.
3. **pgTAP test cannot run locally** (no `supabase start` DB in this checkout).
4. **Live data unreachable** during this audit by design (read-only mandate).

---

## 12. Demo checklist (for a working test environment)

Once migrations are applied to the **test** project (`ittasnemlaicxwfvhtwj`) and demo data loaded:

- [ ] Sign up a student and a tutor (email confirm/reset flows).
- [ ] Tutor: complete profile (5 fields), subjects + levels, availability editor.
- [ ] Public: Find tutors (subject/location/level/budget filters), tutor detail page (subjects, levels, qualifications, weekly availability, rating/reviews).
- [ ] Student → tutor request (with level/location) → tutor accepts → booking created with date/time.
- [ ] Request without matching subject/level rejected (C1 policy).
- [ ] Admin: `/admin` stats, review applications, browse tutors & users (admin account from `ADMIN_EMAILS`).
- [ ] Regression: `npm run typecheck`, `lint`, `vitest`, `build` all green after migration.

---

## 13. Statement of verification scope

- **Verified locally (this audit):** typecheck, lint, 61 unit tests, production build; all client code paths above were read and reasoned through.
- **Not verified:** live behaviour of the linked projects (remote access intentionally not attempted); migration application; pgTAP execution; real email delivery; production data integrity.
- The audit made **no modifications, commits, or remote operations**.