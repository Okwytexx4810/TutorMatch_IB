# TutorMatch IB — System Diagrams

Diagram sources for the architecture slides. Each section gives a plain-text
flow and the Mermaid source, so a diagram can be pasted into any tool.

---

## 1. High-level system architecture

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

```mermaid
flowchart TD
    U["Users<br/>students · parents · tutors · admins"]
    V["Vercel"]
    subgraph NEXT["Next.js application (App Router)"]
        FE["Frontend<br/>React Server + Client Components"]
        API["Server / API layer<br/>Server Actions + Route Handlers"]
        FE --> API
    end
    SB["Supabase<br/>Auth · Postgres · Storage · RLS"]
    OA["OpenAI<br/>Responses API"]
    PG[("PostgreSQL")]

    U -->|HTTPS| V
    V --> NEXT
    API --> SB
    API --> OA
    SB --> PG

    style NEXT fill:#eef2f8,stroke:#1e3a8a,stroke-width:1px
    style SB fill:#ecfdf5,stroke:#047857,stroke-width:1px
    style OA fill:#f0f9ff,stroke:#0369a1,stroke-width:1px
    style PG fill:#f8fafc,stroke:#334155,stroke-width:1px
```

---

## 2. Deployment flow

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

```mermaid
flowchart LR
    D["Developer"] --> VS["VS Code"]
    VS --> GIT["Git<br/>feature branch + PR"]
    GIT --> GH["GitHub<br/>source of truth"]
    GH -->|push / merge to main| VERC["Vercel<br/>build + deploy"]
    VERC --> APP["Production application"]
    APP --> SB[("Supabase")]
    APP --> OA["OpenAI API"]

    style VERC fill:#eef2f8,stroke:#1e3a8a
    style GH fill:#f8fafc,stroke:#334155
    style APP fill:#ecfdf5,stroke:#047857
```

**Secret handling:** environment variables are set in Vercel project settings.
No secret is ever committed. `.env*` is git-ignored; only `.env.example`, with
empty values, is tracked.

---

## 3. AI matching flow

This is the flow that judges will ask about, because it shows where the AI stops
and deterministic logic begins.

```
Student natural language
        │
        │  "I need a patient Mathematics tutor for WAEC preparation.
        │   My daughter is available Tuesday and Thursday evenings
        │   and we prefer someone around Bodija. Our budget is
        │   around ₦7,000 per lesson."
        ▼
Next.js server  (route handler / server action)
        │
        ├──► OpenAI Responses API        ← natural language understanding ONLY
        │            │
        │            ▼
        │     Structured requirements     (Zod-validated)
        │     { subject, level, location,
        │       availability[], budget,
        │       teachingMode }
        │
        ▼
Matching engine  ← deterministic scoring, no LLM
        │
        ├──► Supabase / PostgreSQL       ← real tutor facts
        │       subjects, location, availability,
        │       hourly rate, experience
        ▼
Ranked tutors  +  per-criterion breakdown
        │
        ▼
Student UI  "96% Match · subject 35/35 · within budget · 2 slots free"
```

```mermaid
flowchart TD
    NL["Student natural language<br/><i>I need a patient Mathematics tutor for WAEC...</i>"]
    SERVER["Next.js server<br/>route handler / server action"]
    AI["OpenAI Responses API<br/><b>NL understanding only</b>"]
    STRUCT["Structured requirements<br/><i>Zod-validated</i><br/>subject · level · location<br/>availability[] · budget · mode"]
    ENGINE["Matching engine<br/><b>deterministic scoring</b><br/>subject 35 · location 20<br/>availability 20 · budget 15 · experience 10"]
    DB[("Supabase / PostgreSQL<br/><b>real tutor facts</b>")]
    RANK["Ranked tutors<br/>+ per-criterion breakdown"]
    UI["Student UI<br/><i>96% Match</i>"]

    NL --> SERVER
    SERVER -->|1. extract| AI
    AI --> STRUCT
    STRUCT --> ENGINE
    ENGINE -->|2. read real data| DB
    DB --> ENGINE
    ENGINE --> RANK
    RANK --> UI

    style AI fill:#f0f9ff,stroke:#0369a1,stroke-width:2px
    style ENGINE fill:#ecfdf5,stroke:#047857,stroke-width:2px
    style DB fill:#f8fafc,stroke:#334155
```

### The boundary, stated plainly

| OpenAI **may** do                                    | OpenAI **may not** do                                 |
| ---------------------------------------------------- | ------------------------------------------------------ |
| Read the student's sentence                          | State or imply a tutor's rate                        |
| Extract subject, level, location, slots, budget      | State a tutor's availability or rating               |
| Normalise free text ("Tue nights" → tuesday/evening) | Confirm a tutor exists or is free                     |
| Optionally rewrite the requirement in plain language  | Produce a match score or percentage                   |
| Return strictly to a schema                          | Act as a source of truth for any database fact        |

If OpenAI is unavailable, the filter form plus the same matching engine still
produces results. **AI is an accelerator, not a dependency.**

---

## 4. Request to booking lifecycle

```
        Student/Parent                        Tutor
              │                                │
              │  1. submit tutor request       │
              ├───────────────────────────────►│
              │                                │
              │                  2. accept     │
              │◄───────────────────────────────┤
              │                                │
              │  3. booking confirmed          │
              │◄───────────────────────────────┤
              │                                │
              │  4. review after session       │
              ├───────────────────────────────►│
              │                                │
              ▼                                ▼
```

| Step | Actor       | Action                | Resulting state                    |
| ---- | ----------- | --------------------- | ---------------------------------- |
| 1    | Student     | Send tutor request    | `tutor_requests.status = pending`  |
| 2    | Tutor       | Accept or decline     | `accepted` or `declined`           |
| 3    | System      | Confirm session time  | `bookings.status = confirmed`      |
| 4    | Student     | Review completed work| `reviews` row created               |

```mermaid
stateDiagram-v2
    [*] --> pending: student sends request
    pending --> accepted: tutor accepts
    pending --> declined: tutor declines
    pending --> cancelled: student withdraws
    accepted --> confirmed: booking created
    confirmed --> completed: session finished
    confirmed --> cancelled: either party cancels
    completed --> [*]: student leaves review
    declined --> [*]
    cancelled --> [*]
```

---

## 5. Layered code structure

```
┌─────────────────────────────────────────────────┐
│  PRESENTATION    app/**  components/**          │
│  pages · layout · tutor cards · forms           │
└───────────────────────┬─────────────────────────┘
                        │ server actions / route handlers
                        ▼
┌─────────────────────────────────────────────────┐
│  SERVER / API     app/**/actions.ts  app/api/** │
│  parse input · authorize · orchestrate          │
└───────────────────────┬─────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────┐
│  BUSINESS LOGIC   lib/matching/**               │
│  deterministic scoring · pure functions         │
└───────────────────────┬─────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────┐
│  INTEGRATIONS     lib/supabase/**  lib/openai/** │
│  postgres + RLS       Responses API             │
└───────────────────────┬─────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────┐
│  DATA             PostgreSQL                    │
└─────────────────────────────────────────────────┘
```

Dependencies point downward only. A component never reaches past the server
layer into the database or into OpenAI.

```mermaid
flowchart TD
    P["PRESENTATION<br/>app/** · components/**"]
    S["SERVER / API<br/>app/**/actions.ts · app/api/**"]
    B["BUSINESS LOGIC<br/>lib/matching/**"]
    I["INTEGRATIONS<br/>lib/supabase/** · lib/openai/**"]
    D["DATA<br/>PostgreSQL"]

    P --> S --> B --> I --> D

    style P fill:#eef2f8,stroke:#1e3a8a
    style S fill:#e2e8f0,stroke:#334155
    style B fill:#ecfdf5,stroke:#047857
    style I fill:#f0f9ff,stroke:#0369a1
    style D fill:#f8fafc,stroke:#475569
```

---

## 6. Security boundaries

```
┌──────────────────────────────────────────┐
│              BROWSER                     │
│  NEXT_PUBLIC_* only                      │
│  anon Supabase key (RLS protects data)   │
└───────────────────┬──────────────────────┘
                    │  ▲
   secrets blocked  │  │  cookies only
                    ▼  │
┌──────────────────────────────────────────┐
│           NEXT.JS SERVER                 │
│  OPENAI_API_KEY          SERVER ONLY     │
│  SUPABASE_SERVICE_ROLE   SERVER ONLY     │
│  authorization + Zod validation          │
└────────┬──────────────────────────┬──────┘
         │                          │
         ▼                          ▼
┌────────────────────┐   ┌──────────────────────┐
│  SUPABASE          │   │  OPENAI              │
│  + RLS policies    │   │  server-side only    │
└────────────────────┘   └──────────────────────┘
```

| Secret                                  | Reachable from browser? |
| --------------------------------------- | ----------------------- |
| `OPENAI_API_KEY`                        | **No**                  |
| `SUPABASE_SERVICE_ROLE_KEY`             | **No**                  |
| `NEXT_PUBLIC_SUPABASE_URL`              | Yes                     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`    | Yes                     |

Any value without the `NEXT_PUBLIC_` prefix stays on the server. Environment
reads go through `lib/env.ts`, which validates values with Zod and makes the
server-only intent explicit.
