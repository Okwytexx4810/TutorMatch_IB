# TutorMatch IB — Architecture

## 1. Summary

TutorMatch IB is a single **Next.js full-stack application**. There is no
separate frontend or backend project. One codebase, one deployment, one set of
secrets — but a strict logical separation between presentation, server/API,
business logic, integrations and data access.

The product's differentiator is **intelligent tutor matching**. A student
describes their needs in plain English; OpenAI turns that into structured
requirements; a deterministic matching engine compares those requirements
against real database records and produces a ranked, explainable shortlist.

---

## 2. System architecture

```
                        ┌─────────────────────┐
                        │       Users        │
                        │  students, parents, │
                        │   tutors, admins    │
                        └──────────┬──────────┘
                                   │  HTTPS
                                   ▼
                        ┌─────────────────────┐
                        │       Vercel       │
                        └──────────┬──────────┘
                                   │
                                   ▼
             ┌───────────────────────────────────────────┐
             │        Next.js application (App Router)   │
             │                                           │
             │   ┌─────────────────────────────────────┐ │
             │   │  Frontend (React Server + Client)  │ │
             │   └────────────────┬────────────────────┘ │
             │                    │                      │
             │                    ▼                      │
             │   ┌─────────────────────────────────────┐ │
             │   │  Server / API layer                 │ │
             │   │  Server Actions + Route Handlers    │ │
             │   └──────┬───────────────────────┬──────┘ │
             └──────────┼───────────────────────┼────────┘
                        │                       │
                        ▼                       ▼
          ┌──────────────────────┐   ┌────────────────────────┐
          │      Supabase       │   │        OpenAI          │
          │  Auth + Postgres    │   │   Responses API        │
          │  Storage + RLS      │   │  (requirement extract) │
          └──────────┬───────────┘   └────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │      PostgreSQL      │
          │  profiles, tutors,   │
          │  availability,       │
          │  requests, bookings, │
          │  reviews             │
          └──────────────────────┘
```

---

## 3. Layers

| Layer                     | Location                    | May import from                                |
| ------------------------- | --------------------------- | ---------------------------------------------- |
| **Presentation**          | `app/**`, `components/**`   | `lib/site-config`, `types`, `components/ui`    |
| **Server / API**           | Server Actions, `app/api/**` | business logic, integrations, `lib/validation` |
| **Business logic**         | `lib/matching/**`           | `types`, `lib/utils` — **pure functions only** |
| **Integrations**           | `lib/supabase/**`, `lib/openai/**` | `lib/env`, `lib/validation`, `types`  |
| **Data access**            | `lib/supabase/**`           | nothing above it                               |

### Rules that keep the separation real

1. **No database queries in components.** A page or component never calls
   Supabase directly for a mutation. It calls a Server Action.
2. **No OpenAI calls in components.** The key lives only on the server.
3. **No business logic in route handlers.** A handler parses input, authorizes,
   calls a business-logic module, and maps the result to a response.
4. **No secrets in the client bundle.** See [Security boundaries](#8-security-boundaries).
5. **`lib/matching` imports nothing from `next`, Supabase or OpenAI.** It must be
   unit-testable with plain objects.

---

## 4. Folder structure

```
src/
├── app/
│   ├── (marketing)/            # public pages — header + footer chrome
│   │   ├── layout.tsx
│   │   ├── page.tsx            # /            landing page
│   │   ├── find-tutors/        # /find-tutors
│   │   └── tutors/[id]/        # /tutors/[id]
│   ├── (auth)/                 # centred auth shell
│   │   ├── layout.tsx
│   │   ├── login/              # /login
│   │   └── register/           # /register
│   ├── dashboard/              # student + parent area
│   │   ├── layout.tsx          # sidebar chrome
│   │   ├── page.tsx            # /dashboard
│   │   ├── find-tutor/
│   │   ├── requests/
│   │   ├── bookings/
│   │   └── profile/
│   ├── tutor/                  # tutor area
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   ├── profile/
│   │   ├── availability/
│   │   ├── requests/
│   │   └── bookings/
│   ├── admin/                  # admin area
│   │   ├── layout.tsx
│   │   └── page.tsx            # /admin
│   ├── api/                    # route handlers (HTTP boundaries only)
│   ├── layout.tsx              # root: fonts, Toaster, TooltipProvider
│   ├── metadata.ts             # site-wide metadata defaults
│   ├── globals.css             # design tokens
│   ├── error.tsx               # route error boundary
│   ├── global-error.tsx        # last-resort boundary
│   ├── loading.tsx             # global loading UI
│   └── not-found.tsx           # 404
│
├── components/
│   ├── ui/                     # shadcn/ui primitives (do not hand-edit)
│   ├── layout/                 # SiteHeader, SiteFooter, Logo, shared states
│   ├── dashboard/              # DashboardShell, Sidebar, Header
│   ├── tutors/                 # TutorCard, TutorProfile (Phase 5/6)
│   ├── matching/               # match score UI (Phase 7)
│   └── forms/                  # form components (Phase 3/5)
│
├── lib/
│   ├── supabase/               # client, server, admin, queries, mutations
│   ├── openai/                 # server-side extraction only
│   ├── matching/               # deterministic scoring engine
│   ├── validation/             # Zod schemas
│   ├── utils/                  # format.ts, errors.ts
│   ├── env.ts                  # validated environment access
│   ├── site-config.ts          # static constants and route map
│   └── navigation.ts           # sidebar definitions
│
└── types/
    ├── domain.ts               # roles, levels, requirements, match weights
    ├── tutor.ts                # tutor read model
    └── engagement.ts           # requests, bookings, reviews
```

`lib/` folders for Supabase, OpenAI and matching currently hold a `README.md`
that states their contract. They are populated in their respective phases. This
keeps the architecture visible from day one without writing speculative code.

---

## 5. Frontend

| Concern        | Decision                                                              |
| -------------- | --------------------------------------------------------------------- |
| Framework      | Next.js 16 (App Router), React 19                                     |
| Styling        | Tailwind CSS v4, CSS-first config in `globals.css` (no `tailwind.config`) |
| Components     | shadcn/ui (Radix base) — vendored into `components/ui`               |
| Icons          | `lucide-react`                                                        |
| Fonts          | `next/font` with Geist Sans / Geist Mono, self-hosted                 |
| Theme          | CSS custom properties in OKLCH; deep navy primary, emerald accent     |
| Client boundary | `"use client"` **only** on files that need state, effects or handlers |

**Server Components are the default.** A `"use client"` directive is added at a
leaf, not at the layout, so a Client Component never becomes the place where
business rules live.

Dark mode tokens are already defined; a theme toggle is added when it is
actually needed.

---

## 6. Backend

- **Server Actions** for form submissions and mutations
  (`app/**/actions.ts`, each with `"use server"`).
- **Route Handlers** only where a real HTTP boundary exists: webhooks, and the
  OpenAI requirement-extraction endpoint. See `src/app/api/README.md`.
- **Supabase Auth** session is read from cookies server-side.
- Every handler follows the same order: parse with Zod → authorize → act →
  map errors with `toErrorResponse`.

### Next.js 16 notes that affect this codebase

These are breaking changes in Next 16 that will shape later phases:

| Change                          | Impact here                                          |
| ------------------------------- | ---------------------------------------------------- |
| Turbopack is the default bundler| No custom webpack config.                             |
| `next lint` removed             | Lint runs through the `eslint` CLI (`npm run lint`).  |
| Async request APIs              | `params` / `searchParams` / `cookies()` are Promises. `/tutors/[id]` will need `await params`. |
| `middleware` → `proxy`          | Supabase session refresh goes in `src/proxy.ts`, **not** `middleware.ts`. |
| `typedRoutes` enabled           | `next/link` hrefs are compile-time checked. A link to a route that does not exist is a type error. |
| `revalidateTag` needs a profile | Use `revalidateTag(tag, 'max')`, or `updateTag` for read-your-writes in Server Actions. |
| Global `PageProps` / `LayoutProps` | Generated by `next typegen`. Run `npm run typecheck` after adding routes. |

---

## 7. Database

Supabase Postgres. See [`database-design.md`](./database-design.md) for the full
table design.

Core tables: `profiles`, `tutor_profiles`, `tutor_qualifications`,
`tutor_availability`, `tutor_requests`, `bookings`, `reviews`.

**Row Level Security is the primary access-control boundary.** Every table has
policies so a user can only read and write their own rows, tutors can read their
own profile, and admins can read everything.

The matching engine never queries the database directly. Data flows
`route → lib/supabase → lib/matching`, so the engine stays testable.

---

## 8. Security boundaries

| Boundary                | Rule                                                                     |
| ----------------------- | ------------------------------------------------------------------------ |
| **OpenAI API key**      | Server-only. `OPENAI_API_KEY` has no `NEXT_PUBLIC_` prefix. Read exclusively through `serverEnv()`. |
| **Supabase service role** | Server-only, Phase 4+. Used only for webhooks and admin tooling — never on a user request path. |
| **Supabase anon key**    | Safe to ship. RLS, not key secrecy, is what protects the data.           |
| **Authorization**       | Enforced server-side on every action and handler. Never trust a role, user id or tutor id from the client. |
| **Input validation**    | Every external payload is parsed with Zod at the boundary (`lib/validation`). |
| **Error handling**      | `toErrorResponse` replaces unknown errors with a generic message. Supabase and OpenAI messages never reach the browser. |
| **Secrets in git**      | `.env*` is git-ignored. Only `.env.example` — with empty values — is committed. |

The `NEXT_PUBLIC_` prefix is the single most important convention in this
project: **anything carrying it is public.** If a value must not be readable by a
user, it must never be given that prefix.

---

## 9. The matching engine

Deterministic, explainable, and pure.

| Criterion     | Points | Source of truth                                |
| ------------- | -----: | ---------------------------------------------- |
| Subject       |     35 | `tutor_profiles.subjects`                       |
| Location      |     20 | `tutor_profiles.location`                       |
| Availability  |     20 | `tutor_availability`                            |
| Budget        |     15 | `tutor_profiles.hourly_rate`                    |
| Experience    |     10 | `tutor_profiles.years_of_experience`            |
| **Total**     | **100** | |

`MATCH_WEIGHTS` in `src/types/domain.ts` is the single source of truth for the
weights. A "96% Match" label is always `tutor.matchScore`, computed from real
rows. Every criterion returns a `reason` string, so the UI can always explain the
number.

### The AI boundary

```
Student free text
        │
        ▼
Next.js server  ──► OpenAI Responses API   ← natural language understanding ONLY
        │                 │
        │                 ▼
        │          Structured requirements  (Zod-validated)
        │                 │
        │                 ▼
        ├──────────► Matching engine  ← deterministic scoring, no LLM
        │                 │
        │                 ▼
        │          Ranked tutors + breakdown
        ▼
Student UI
```

**OpenAI must never state a fact about a tutor.** It does not know prices,
ratings, availability, locations or qualifications, and its output is never
treated as data about a tutor. It converts language into structured requirements;
the database provides facts; the engine produces the score.

If OpenAI is slow or down, the product still works: students can use the filter
form and the same matching engine. AI is an accelerator, not a dependency.

---

## 10. Deployment

```
Developer
   │
   ▼
VS Code
   │
   ▼
Git  ──►  GitHub  ──►  Vercel  ──►  Production application
                                              │
                                              ├──► Supabase (Postgres, Auth, Storage)
                                              └──► OpenAI API
```

- **Vercel** hosts the Next.js app. Push to the connected branch and it deploys.
- Environment variables are configured in the Vercel project settings, not in a
  committed file.
- **Supabase** and **OpenAI** are external managed services. Only their API keys
  are needed at runtime.
- The app must build with `npm run build` in CI with no secrets present at build
  time. Environment reads are lazy functions, never module-level constants, for
  exactly this reason.

---

## 11. Design system

| Token           | Value                          | Role                        |
| --------------- | ------------------------------ | --------------------------- |
| `--primary`     | `oklch(0.28 0.06 255)`         | Deep navy — headers, CTAs   |
| `--accent`      | emerald, `oklch(0.63 0.14 168)`| Highlights, focus rings      |
| `--background`  | `oklch(0.985 0.003 247)`      | Very light grey page surface |
| `--card`        | white                           | Elevated surfaces           |
| `--radius`      | `0.625rem`                     | Subtle, consistent rounding  |

Type scale, spacing and borders come from Tailwind. Motion is restrained:
`tw-animate-css` is loaded, but transitions are limited to colour and opacity to
keep the interface trustworthy rather than flashy. Dark tokens are defined but a
toggle is not yet wired.

---

## 12. Related documents

| Document                                     | Covers                                        |
| -------------------------------------------- | --------------------------------------------- |
| [`user-journeys.md`](./user-journeys.md)     | Every user path, end to end                   |
| [`database-design.md`](./database-design.md) | Tables, relationships, RLS policies           |
| [`api-design.md`](./api-design.md)           | Server Actions, route handlers, contracts      |
| [`development-plan.md`](./development-plan.md) | Phased build plan and priorities             |
| [`system-diagrams.md`](./system-diagrams.md) | Diagram sources for the presentation          |
