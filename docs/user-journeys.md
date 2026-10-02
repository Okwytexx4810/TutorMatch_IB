# TutorMatch IB — User Journeys

Every journey below is the design target. Phases in brackets are the ones that
build each step; see [`development-plan.md`](./development-plan.md).

---

## Persona: Student

Secondary school student, aged 14–18. Searches mostly from a phone, usually in
the evening. Wants to know: *is this tutor available, will they teach me, and
can my parent afford it?*

## Persona: Parent

Primary decision maker and payer. Books and pays. Cares about qualifications,
location, rate and reliability. Describes the need in natural language because
they think in terms of the problem, not filters.

## Persona: Tutor

Qualified teacher or university student. Needs control over subjects, rate and
availability. Cares about how many requests arrive and how much admin each one
costs them.

## Persona: Administrator

Platform operator. Needs a read-only overview of users, tutors and activity.

---

## Journey 1 — Student / Parent: Discover and book a tutor

**Goal:** go from "I need help" to a confirmed session.

```
Landing page
   │
   ▼
Find a tutor  ─────────────► filter form (subject, location,
   │                                   budget, availability, mode)
   │ describe in plain English
   ▼
Matching results                ← deterministic scores, real data
   │
   ▼
Tutor profile
   │
   ▼
View availability
   │
   ▼
Send tutor request  (subject · message · preferred slots)
   │
   ▼
Request pending ──────────────► Tutor accepts
                                     │
                                     ▼
                              Booking confirmed
                                     │
                                     ▼
                              Session happens
                                     │
                                     ▼
                              Leave a review
```

### Step details

| # | Screen            | Route                                  | Phase |
| - | ----------------- | -------------------------------------- | ----- |
| 1 | Landing page      | `/`                                    | 2     |
| 2 | Find a tutor      | `/find-tutors`, `/dashboard/find-tutor`| 6, 8  |
| 3 | Matching results  | `/find-tutors`                         | 7     |
| 4 | Tutor profile     | `/tutors/[id]`                         | 6     |
| 5 | View availability | `/tutors/[id]`                         | 6     |
| 6 | Send request      | server action on the profile page      | 9     |
| 7 | Request pending   | `/dashboard/requests`                  | 9     |
| 8 | Tutor accepts     | `/tutor/requests`                      | 9     |
| 9 | Booking confirmed | `/dashboard/bookings`, `/tutor/bookings` | 9   |
| 10| Review            | `/dashboard/bookings`                  | 9     |

### The differentiator moment — step 2 and 3

```
"I need a patient Mathematics tutor for WAEC preparation. My daughter is
 available Tuesday and Thursday evenings and we prefer someone around Bodija.
 Our budget is around ₦7,000 per lesson."
        │
        ▼  OpenAI: natural language understanding only
{
  "subject": "Mathematics",
  "level": "waec",
  "location": "Bodija",
  "availability": [
    { "day": "tuesday", "period": "evening" },
    { "day": "thursday", "period": "evening" }
  ],
  "budget": 7000
}
        │
        ▼  Matching engine: deterministic, against real tutor rows
        │
        ▼
Tutor A — 96% Match
  Subject        35 / 35   teaches Mathematics at WAEC level
  Location       20 / 20   based in Bodija
  Availability   16 / 20   free Tuesday evening, Thursday pending
  Budget         15 / 15   ₦6,500 per hour, within your ₦7,000
  Experience     10 / 10   8 years
```

The score comes from the engine. The sentences come from the database. OpenAI
supplies neither.

**Fallback:** if OpenAI is unavailable or the description is too vague, the
filter form produces results through the same engine.

### Failure and edge states

| Situation                          | Behaviour                                                        |
| ---------------------------------- | ---------------------------------------------------------------- |
| Free text yields too few fields    | Prompt for the missing field, or switch to filters               |
| No tutor clears the budget         | Show closest matches, clearly labelled as above budget           |
| No tutor is free in the wanted slots| Show nearby periods and nearby locations                         |
| Tutor has declined                 | Offer the next-ranked tutor with the same score                  |
| OpenAI times out or errors         | Fall back to filters. Never block the core flow.                 |

---

## Journey 2 — Tutor: Register and start receiving requests

**Goal:** become discoverable and manage incoming requests.

```
Register  (/register)
   │
   ▼
Create tutor profile              bio · subjects · qualifications
   │                               experience · location · rate · mode
   ▼
Set availability                  weekly day + period slots
   │
   ▼
Tutor dashboard                   profile completeness · new requests
   │
   ▼
Receive request                   subject · message · slots · budget
   │
   ▼
Review request
   │
   ├──► Accept  ──► Booking created
   │
   └──► Decline ──► Student sees the next tutor
   │
   ▼
Manage bookings                   upcoming sessions · history · reviews
```

| # | Screen               | Route                    | Phase |
| - | -------------------- | ------------------------ | ----- |
| 1 | Register             | `/register`              | 3     |
| 2 | Tutor profile        | `/tutor/profile`         | 5     |
| 3 | Set availability     | `/tutor/availability`    | 5     |
| 4 | Tutor dashboard      | `/tutor/dashboard`       | 10    |
| 5 | Receive request      | `/tutor/requests`        | 9     |
| 6 | Review request       | `/tutor/requests`        | 9     |
| 7 | Accept or decline    | server action            | 9     |
| 8 | Manage bookings      | `/tutor/bookings`        | 9, 10 |

### Gates

A tutor is only discoverable once **subjects**, **rate** and at least one
**availability slot** exist. The dashboard shows a profile-completeness meter,
which doubles as an onboarding checklist.

---

## Journey 3 — Administrator: Monitor the platform

```
/admin
   │
   ▼
Overview          users · tutors · requests · bookings
   │
   ▼
Browse users      tutors · students and parents
   │
   ▼
Review requests   all platform requests
```

| # | Screen       | Route             | Phase |
| - | ------------ | ----------------- | ----- |
| 1 | Overview     | `/admin`          | 10    |
| 2 | View users   | `/admin/users`    | 10    |
| 3 | View tutors  | `/admin/tutors`   | 10    |
| 4 | View requests| `/admin/requests` | 10    |

The admin area is read-only apart from tutor verification. Every number on the
overview is computed from real rows.

---

## Journey 4 — Authentication

```
/register ──► choose role ──► Supabase Auth signup ──► session cookie
                                                          │
                                                          ▼
        ┌─────────────────────────────────────────────────┘
        ▼
/login ──► email + password ──► session cookie
                │
                ├── student / parent ──► /dashboard
                ├── tutor ──────────────► /tutor/dashboard
                └── admin ──────────────► /admin
```

Role is stored on the `profiles` row and resolved **server-side**. A user cannot
reach a dashboard their role does not grant, by typing the URL.

---

## Cross-cutting requirements

| Requirement      | How it is met                                                       |
| ---------------- | ------------------------------------------------------------------- |
| Mobile first     | Students search from phones. Sidebars collapse to a drawer from Phase 10. |
| Accessibility    | Keyboard-navigable controls, visible focus rings, labelled fields, semantic landmarks, `aria-busy` on loading states. |
| Loading feedback | Route-level `loading.tsx` plus skeletons matching the final layout. |
| Empty states     | Every list explains what will appear and offers the next action.      |
| Error states     | Route `error.tsx` for unexpected failures; `ErrorState` for recoverable ones. |
| Trust            | Verification badge, real qualification data, ratings from real bookings only. |
| Transparency     | Every match score is expandable into a per-criterion breakdown.      |
