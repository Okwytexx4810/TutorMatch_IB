# TutorMatch IB — Database Design

Target: **Supabase PostgreSQL**. This is the design to implement in Phase 4.

> The schema is **not** created in Phase 1. It is documented now so the types in
> `src/types` and the contracts in `src/lib` have a fixed target to code against.

---

## 1. Entity relationships

```
                        ┌──────────────┐
                        │   profiles   │  one row per auth user
                        └──────┬───────┘
                               │ 1:1
              ┌────────────────┼────────────────┬─────────────────┐
              │                │                │                 │
              ▼ 1:1           ▼ N:N            ▼ N:N             │
     ┌──────────────────┐  ┌───────────────┐  ┌──────────┐        │
     │  tutor_profiles  │  │   bookings    │  │ reviews  │        │
     └────────┬─────────┘  └───────┬───────┘  └────┬─────┘        │
              │ 1:N                │  N:1           │ N:1         │
              │                    └─────────────────┴─────────────┤
              ▼ 1:N                                                   │
     ┌──────────────────┐                                            │
     │tutor_availability│  N:1                                      │
     └──────────────────┘                                            │
              ▲                                                     │
              │ N:1                                                 │
     ┌──────────────────────┐                                        │
     │   tutor_requests     ├────────────────────────────────────────┘
     └──────────────────────┘
```

---

## 2. Tables

### `profiles`

One row per authenticated user. Created by a trigger on `auth.users`, so a user
can never exist without a profile.

| Column       | Type                     | Constraints                    |
| ------------ | ------------------------ | ------------------------------ |
| `id`         | `uuid`                   | PK, FK → `auth.users.id` ON DELETE CASCADE |
| `role`       | `user_role`              | NOT NULL, default `student`    |
| `full_name`  | `text`                   | NOT NULL                       |
| `email`      | `text`                   | UNIQUE, NOT NULL               |
| `phone`      | `text`                   |                                |
| `location`   | `text`                   |                                |
| `avatar_url` | `text`                   | Supabase Storage public URL    |
| `created_at` | `timestamptz`            | NOT NULL, default `now()`      |
| `updated_at` | `timestamptz`            | NOT NULL, default `now()`      |

Enums:

```sql
create type user_role as enum ('student', 'parent', 'tutor', 'admin');
```

> A single `role` column keeps the MVP simple. If a user can be both a parent and
> a tutor, switch to a `profile_roles(profile_id, role)` join table with a
> `primary role` flag.

---

### `tutor_profiles`

| Column                 | Type          | Constraints                     |
| ---------------------- | ------------- | ------------------------------- |
| `id`                   | `uuid`        | PK, default `gen_random_uuid()`  |
| `profile_id`           | `uuid`        | UNIQUE, FK → `profiles.id` ON DELETE CASCADE |
| `headline`             | `text`        | ≤ 140 chars                     |
| `bio`                  | `text`        |                                 |
| `location`             | `text`        | NOT NULL                        |
| `hourly_rate`          | `integer`     | NOT NULL, CHECK (`hourly_rate > 0`) — naira |
| `years_of_experience`  | `smallint`    | NOT NULL, default 0, CHECK (≥ 0) |
| `is_verified`          | `boolean`     | NOT NULL, default false         |
| `profile_completeness` | `smallint`    | NOT NULL, default 0             |
| `created_at`           | `timestamptz` | NOT NULL, default `now()`       |
| `updated_at`           | `timestamptz` | NOT NULL, default `now()`       |

Money is stored as whole naira in an `integer`. Nigeria does not use a minor
unit in practice, and float would introduce rounding errors into budget
matching. Use `numeric(12,2)` only if a minor unit is ever required.

---

### `tutor_subjects` — join table

A tutor teaches many subjects; a subject is taught by many tutors.

| Column       | Type    | Constraints                                    |
| ------------ | ------- | ---------------------------------------------- |
| `tutor_id`   | `uuid`  | FK → `tutor_profiles.id` ON DELETE CASCADE      |
| `subject`    | `text`  | NOT NULL                                       |
| `level`      | `education_level` | NOT NULL                             |

Composite PK `(tutor_id, subject, level)`. Indexed on `(subject, level)` so
subject search does not need a sequential scan.

> Normalise to a `subjects` reference table in Phase 6 if free-text subject
> strings turn out to fragment badly (for example `Maths` vs `Mathematics`).

---

### `tutor_qualifications`

| Column        | Type    | Constraints                        |
| ------------- | ------- | ---------------------------------- |
| `id`          | `uuid`  | PK                                 |
| `tutor_id`    | `uuid`  | FK → `tutor_profiles.id` CASCADE    |
| `title`       | `text`  | NOT NULL, e.g. `B.Sc. Mathematics` |
| `institution` | `text`  |                                    |
| `year`        | `smallint` |                                |

---

### `tutor_availability`

Weekly recurring slots. Recurring rather than dated so a tutor sets availability
once.

| Column       | Type     | Constraints                          |
| ------------ | -------- | ------------------------------------ |
| `id`         | `uuid`   | PK                                   |
| `tutor_id`   | `uuid`   | FK → `tutor_profiles.id` CASCADE     |
| `day`        | `weekday`| NOT NULL                             |
| `period`     | `day_period` | NOT NULL                          |
| `start_time` | `time`   | Optional exact start                 |
| `is_active`  | `boolean`| NOT NULL, default true               |

Unique on `(tutor_id, day, period)`.

```sql
create type weekday as enum
  ('monday','tuesday','wednesday','thursday','friday','saturday','sunday');
create type day_period as enum ('morning','afternoon','evening');
```

The matching engine compares these enum values directly against the
availability OpenAI extracted, which is why both sides use the same vocabulary.

---

### `tutor_requests`

A request is one student's request to one tutor. Not yet a scheduled session.

| Column            | Type          | Constraints                                |
| ----------------- | ------------- | ------------------------------------------ |
| `id`              | `uuid`        | PK                                         |
| `requester_id`    | `uuid`        | FK → `profiles.id`                          |
| `tutor_id`        | `uuid`        | FK → `tutor_profiles.id`                    |
| `subject`         | `text`        | NOT NULL                                   |
| `message`         | `text`        | NOT NULL                                   |
| `preferred_slots` | `jsonb`       | NOT NULL, default `[]` — `[{day, period}]`  |
| `budget`          | `integer`     | Optional, naira                            |
| `status`          | `request_status` | NOT NULL, default `pending`              |
| `responded_at`    | `timestamptz` |                                            |
| `created_at`      | `timestamptz` | NOT NULL, default `now()`                  |
| `updated_at`      | `timestamptz` | NOT NULL, default `now()`                  |

```sql
create type request_status as enum
  ('pending','accepted','declined','cancelled');
```

`preferred_slots` is `jsonb` because it is always read whole, never queried by
slot. Promote it to a table only if slot-level queries become necessary.

**Constraint:** one pending request per `(requester_id, tutor_id)` pair, enforced
by a partial unique index. This prevents accidental double-submits.

```sql
create unique index one_pending_request_per_pair
  on tutor_requests (requester_id, tutor_id)
  where status = 'pending';
```

---

### `bookings`

A confirmed session. Belongs to both a tutor and a requester.

| Column        | Type           | Constraints                            |
| ------------- | -------------- | -------------------------------------- |
| `id`          | `uuid`         | PK                                     |
| `request_id`  | `uuid`         | UNIQUE, nullable FK → `tutor_requests.id` |
| `tutor_id`    | `uuid`         | FK → `tutor_profiles.id`               |
| `requester_id`| `uuid`         | FK → `profiles.id`                     |
| `subject`     | `text`         | NOT NULL                               |
| `starts_at`   | `timestamptz`  | NOT NULL                               |
| `ends_at`     | `timestamptz`  | NOT NULL, CHECK (`ends_at > starts_at`)|
| `agreed_rate` | `integer`      | NOT NULL, naira — price agreed at booking time |
| `status`      | `booking_status` | NOT NULL, default `confirmed`        |
| `notes`       | `text`         |                                        |
| `created_at`  | `timestamptz` | NOT NULL, default `now()`              |

```sql
create type booking_status as enum
  ('confirmed','completed','cancelled','no_show');
```

`agreed_rate` is copied from the tutor's rate at the moment of booking so a later
rate change never rewrites history.

**Constraint:** a tutor cannot be double-booked for overlapping times.

```sql
create extension if not exists btree_gist;

alter table bookings
  add constraint no_overlapping_bookings
  exclude using gist (
    tutor_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'confirmed');
```

---

### `reviews`

One review per completed booking, by the requester.

| Column       | Type          | Constraints                             |
| ------------ | ------------- | --------------------------------------- |
| `id`         | `uuid`        | PK                                      |
| `booking_id` | `uuid`        | UNIQUE, FK → `bookings.id` CASCADE      |
| `tutor_id`   | `uuid`        | FK → `tutor_profiles.id`                |
| `author_id`  | `uuid`        | FK → `profiles.id`                      |
| `rating`     | `smallint`    | NOT NULL, CHECK (`rating` BETWEEN 1 AND 5) |
| `comment`    | `text`        |                                         |
| `created_at` | `timestamptz` | NOT NULL, default `now()`               |

Derived tutor rating, so the UI never computes it per request:

```sql
create view tutor_ratings as
  select
    tutor_id,
    round(avg(rating)::numeric, 2) as average_rating,
    count(*)::int                      as review_count
  from reviews
  group by tutor_id;
```

---

## 3. Indexes

| Table                 | Index                                                  | Why                                  |
| --------------------- | ------------------------------------------------------ | ------------------------------------ |
| `profiles`            | `unique (email)`                                       | Login lookup                         |
| `tutor_profiles`      | `index (location)`                                     | Location filter                      |
| `tutor_profiles`      | `index (hourly_rate)`                                  | Budget filter and sort               |
| `tutor_subjects`      | `unique (tutor_id, subject, level)`, `index (subject, level)` | Subject search                  |
| `tutor_availability`  | `unique (tutor_id, day, period)`, `index (tutor_id)`   | Availability matching                |
| `tutor_requests`      | `index (tutor_id, status)`, `index (requester_id, created_at desc)` | Request queues          |
| `bookings`            | `index (tutor_id, starts_at)`, `index (requester_id, starts_at desc)` | Session lists  |
| `reviews`             | `unique (booking_id)`, `index (tutor_id)`               | Review lookup and averages           |

---

## 4. Row Level Security

RLS is the real authorisation boundary. Every table gets `enable row level
security`, and the anon key is safe to ship because of these policies.

### `profiles`

```sql
alter table profiles enable row level security;

-- Users read and update only their own row.
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- Admins read every row.
create policy "profiles_select_admin" on profiles
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
```

### `tutor_profiles`

```sql
alter table tutor_profiles enable row level security;

-- Profiles are public so students can browse tutors.
create policy "tutor_profiles_public_read" on tutor_profiles
  for select using (true);

-- Only the owner writes. `is_verified` is admin-only and is protected by a
-- column-level grant, so a tutor cannot self-verify.
create policy "tutor_profiles_insert_own" on tutor_profiles
  for insert with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'tutor'
    )
  );

create policy "tutor_profiles_update_own" on tutor_profiles
  for update using (
    profile_id = auth.uid()
  );
```

### `tutor_availability`, `tutor_subjects`, `tutor_qualifications`

Public read; owner-only write, checked via `tutor_profiles.profile_id`.

```sql
alter table tutor_availability enable row level security;

create policy "availability_public_read" on tutor_availability
  for select using (true);

create policy "availability_owner_write" on tutor_availability
  for all using (
    exists (
      select 1
      from tutor_profiles tp
      where tp.id = tutor_availability.tutor_id
        and tp.profile_id = auth.uid()
    )
  );
```

### `tutor_requests`

```sql
alter table tutor_requests enable row level security;

-- Only the two parties can see a request.
create policy "requests_party_read" on tutor_requests
  for select using (
    requester_id = auth.uid()
    or exists (
      select 1 from tutor_profiles tp
      where tp.id = tutor_requests.tutor_id
        and tp.profile_id = auth.uid()
    )
    or is_admin()
  );

create policy "requests_requester_insert" on tutor_requests
  for insert with check (requester_id = auth.uid());

-- Only the tutor party may change status.
create policy "requests_tutor_update" on tutor_requests
  for update using (
    exists (
      select 1 from tutor_profiles tp
      where tp.id = tutor_requests.tutor_id
        and tp.profile_id = auth.uid()
    )
  );
```

### `bookings`

```sql
alter table bookings enable row level security;

create policy "bookings_party_read" on bookings
  for select using (tutor_id in (
    select id from tutor_profiles where profile_id = auth.uid()
  ) or requester_id = auth.uid() or is_admin());
```

### `reviews`

```sql
alter table reviews enable row level security;

create policy "reviews_public_read" on reviews
  for select using (true);

-- Only the requester of the booking may review it, and only once.
create policy "reviews_requester_insert" on reviews
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from bookings b
      where b.id = reviews.booking_id
        and b.requester_id = auth.uid()
        and b.status = 'completed'
    )
  );
```

**Hard rule:** no policy ever checks a role or id sent by the client. Every
check resolves from `auth.uid()`, which the browser cannot forge.

---

## 5. Storage

| Bucket         | Access        | Purpose                                  |
| -------------- | ------------- | ---------------------------------------- |
| `avatars`      | public read   | Tutor and user profile photos            |
| `credentials`  | private       | Tutor qualification documents            |
| `booking-docs` | private       | Uploaded session material (optional)     |

Private buckets are read through signed URLs generated server-side after an
authorisation check. Never expose a service-role client to the browser to read
private objects.

---

## 6. Data flow into the matching engine

The engine never queries Postgres directly.

```
route handler / server action
   │
   ▼
lib/supabase/queries/tutors.ts     ← one typed query, RLS applied
   │
   ▼
TutorProfile[]                     ← matches src/types/tutor.ts
   │
   ▼
lib/matching/rank.ts               ← pure, deterministic
   │
   ▼
TutorMatch[]                       ← score + per-criterion breakdown
   │
   ▼
UI
```

This separation is what makes the engine unit-testable and the score
reproducible.

---

## 7. Seed data

For the demo, seed roughly 12–15 tutors across subjects (Mathematics, English,
Physics, Chemistry, Biology, Government, Economics), locations (Bodija, Iyana
Ole, Ikeja, Yaba, Lekki, Abuja), teaching modes and rates from ₦3,000 to
₦12,000. A spread of rates and availability is what makes the matching score
visibly meaningful when demonstrated.
