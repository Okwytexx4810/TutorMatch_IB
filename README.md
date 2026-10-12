# TutorMatch IB

A tutor discovery, matching and booking platform for students, parents and
tutors in Nigeria.

Students describe what they need in plain English; a deterministic matching
engine ranks verified tutors by subject, location, availability, budget and
experience, and every score can be explained.

---

## Stack

| Layer        | Technology                                          |
| ------------ | --------------------------------------------------- |
| Framework    | Next.js 16 (App Router), React 19, TypeScript strict |
| Styling      | Tailwind CSS v4, shadcn/ui (Radix), Lucide icons     |
| Database     | Supabase PostgreSQL                                  |
| Auth         | Supabase Auth                                        |
| Storage      | Supabase Storage                                     |
| AI           | OpenAI Responses API (`openai` SDK, server-side only)|
| Validation   | Zod                                                  |
| Hosting      | Vercel                                               |

---

## Getting started

The Next.js application lives in `TutorMatch_IB_Frontend/`. Run all frontend
commands from that directory:

```bash
cd TutorMatch_IB_Frontend
npm install
cp .env.example .env.local     # fill in real values as phases progress
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

The app runs without any environment variables in Phase 1. `publicEnv()` is only
called once Supabase is wired up (Phase 3), so nothing fails during a plain
`npm run dev`.

---

## Scripts

Run these from `TutorMatch_IB_Frontend/`.

| Command             | Purpose                                       |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Development server                            |
| `npm run build`     | Production build                              |
| `npm run start`     | Serve the production build                    |
| `npm run lint`      | ESLint (`next lint` was removed in Next 16)   |
| `npm run typecheck` | `tsc --noEmit`                                |
| `npm run check`     | Lint and typecheck together                   |

---

## Project structure

All frontend source lives under `TutorMatch_IB_Frontend/`. Supabase
configuration and migrations live separately, in
`TutorMatch_IB_Backend/supabase/`.

```
TutorMatch_IB_Frontend/src/
├── app/                  # routing only
│   ├── (marketing)/      # public pages — header + footer
│   ├── (auth)/           # /login, /register
│   ├── dashboard/        # student + parent
│   ├── tutor/            # tutor area
│   ├── admin/            # admin area
│   └── api/              # route handlers
├── components/
│   ├── ui/               # shadcn/ui primitives
│   ├── layout/           # header, footer, logo, shared states
│   └── dashboard/        # dashboard shell
├── lib/
│   ├── supabase/         # data access (Phase 4)
│   ├── openai/           # AI extraction (Phase 8)
│   ├── matching/         # scoring engine (Phase 7)
│   ├── validation/       # Zod schemas
│   └── utils/            # formatting, errors
└── types/                # shared domain types
```

Dependencies point in one direction only:

```
presentation → server/API → business logic → integrations → data
```

---

## The matching boundary

OpenAI performs **natural language understanding only**. It converts a student's
sentence into structured requirements. It never states a fact about a tutor.

- Prices, ratings, availability, locations and qualifications come from
  PostgreSQL.
- The match score is calculated by `lib/matching` — deterministic, unit-tested,
  and never model-generated.

If OpenAI is unavailable, the filter form and the same matching engine still
work. AI is an accelerator, not a dependency.

---

## Security

- `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are **server-only**. Anything
  prefixed `NEXT_PUBLIC_` is inlined into the browser bundle and is public.
- All environment reads go through `lib/env.ts`, which validates with Zod.
- Authorization is enforced server-side and by Row Level Security. Client-supplied
  ids and roles are never treated as authority.
- Every external payload is validated with Zod at the boundary.
- `.env*` is git-ignored. Only `.env.example`, with empty values, is committed.

---

## Documentation

| Document                                        | Covers                                       |
| ----------------------------------------------- | -------------------------------------------- |
| [architecture.md](docs/architecture.md)         | Layers, structure, security boundaries        |
| [system-diagrams.md](docs/system-diagrams.md)   | Diagram sources for presentation slides       |
| [user-journeys.md](docs/user-journeys.md)       | Every user path, end to end                   |
| [database-design.md](docs/database-design.md)   | Tables, indexes, RLS policies                 |
| [api-design.md](docs/api-design.md)             | Server Actions, route handlers, contracts     |
| [development-plan.md](docs/development-plan.md) | The 13-phase build plan                       |

---

## Status

**Phase 1 — Project foundation: complete.**
**Phase 2 — Design system and landing page: complete.**
**Phase 3 — Authentication: complete.**
**Phase 4A — Database schema and role authorisation: implemented.**

The foundation, routing architecture, design system and landing page are in place.
Authentication works end to end. The Phase 4A migrations in
[`TutorMatch_IB_Backend/supabase/migrations`](TutorMatch_IB_Backend/supabase/migrations)
define the full schema, the `handle_new_user()` profile trigger and Row Level
Security, and `requireRole()` now reads the authoritative role from the database
`profiles` table.

The migrations are intended to be applied to the linked remote Supabase project.
Remote migration status has not been independently verified here, so the role
guards on `/tutor/*` and `/admin/*` should be treated as live only once
`supabase migration list` confirms local and remote are in sync against the
target project. See [development-plan.md](docs/development-plan.md) for what each
remaining phase delivers.

Phase 4K verified the student path by hand against the linked remote project:
registration, the emailed confirmation link returning through `/auth/callback`,
sign-in routing to `/dashboard`, and a student being redirected away from both
`/tutor/dashboard` and `/admin`.

**Not yet verified:** the parent and tutor authentication paths have not been
individually tested. The admin area needs the admin-console migration applied and
an `ADMIN_EMAILS` entry before an administrator account is bootstrapped (see
`src/lib/auth/admin.ts`); no such account exists in the linked project yet.

Tutor discovery, tutor profiles, requests, bookings and the admin console are
implemented in code. They depend on the Stage B, Stage C, Stage C1 and
admin-console migrations, which are prepared in
[`TutorMatch_IB_Backend/supabase/migrations`](TutorMatch_IB_Backend/supabase/migrations)
but **not yet applied** to the linked project. The matching engine (Phase 7) and
OpenAI integration (Phase 8) are not implemented yet.

### Applying the database

Supabase configuration and migrations live in `TutorMatch_IB_Backend/supabase/`.
With the Supabase CLI installed, run these from `TutorMatch_IB_Backend/`:

```bash
cd TutorMatch_IB_Backend
supabase link --project-ref <project-ref>
supabase db push
```

`supabase db push` applies **migrations only**. It does not touch Auth settings.
Reconcile
[`TutorMatch_IB_Backend/supabase/config.toml`](TutorMatch_IB_Backend/supabase/config.toml)
against the target project's own redirect configuration before running
`supabase config push`, which pushes Auth settings as well and would overwrite
them.

Then grant the first administrator, which deliberately cannot happen through the
client API:

```sql
update public.profiles set role = 'admin' where id = '<user uuid>';
```
