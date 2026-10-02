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

```bash
npm install
cp .env.example .env.local     # fill in real values as phases progress
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app runs without any environment variables in Phase 1. `publicEnv()` is only
called once Supabase is wired up (Phase 3), so nothing fails during a plain
`npm run dev`.

---

## Scripts

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

```
src/
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

Foundation, routing architecture, design system and documentation are in place.
Authentication, the Supabase schema, the matching engine and OpenAI integration
are deliberately not implemented yet. See
[development-plan.md](docs/development-plan.md) for what each remaining phase
delivers.
