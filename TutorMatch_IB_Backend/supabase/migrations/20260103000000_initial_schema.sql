-- TutorMatch IB - Phase 4A initial schema
--
-- Source of truth: docs/database-design.md
-- Scope: enums, tables, constraints, indexes, relationships, the trusted role
--        model and Row Level Security. No seed data and no feature tables.
--
-- Environment: Supabase PostgreSQL. This migration depends on the `auth` schema
-- and on the `anon` / `authenticated` roles, both of which Supabase provides. It
-- is not portable to a vanilla PostgreSQL server as written.
--
-- Statement order is load-bearing:
--   1. extension   - btree_gist, needed by the bookings exclusion constraint
--   2. enums       - referenced by column types
--   3. tables      - ordered so every FK target already exists
--   4. functions   - SQL bodies are validated at CREATE time, so these must come
--                    after the tables they read
--   5. indexes     - after the columns they cover
--   6. triggers    - after their tables
--   7. RLS         - enabled before any policy is created
--   8. policies
--   9. grants
--
-- Every function sets an empty `search_path` and is fully schema-qualified, so
-- no name resolution depends on caller-controlled state.

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
-- Supplies the GiST operator class for uuid, which the "no overlapping
-- bookings" exclusion constraint requires.
create extension if not exists btree_gist;

-- ============================================================================
-- 2. ENUMS
-- ============================================================================

create type public.user_role as enum ('student', 'parent', 'tutor', 'admin');

-- The design references `education_level` without defining it. The values are
-- taken from src/types/domain.ts (EDUCATION_LEVELS) so the database and the
-- TypeScript contract cannot drift.
create type public.education_level as enum (
  'primary', 'jss', 'sss', 'waec', 'neco', 'nce', 'undergraduate', 'postgraduate', 'adult'
);

create type public.weekday as enum (
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
);

create type public.day_period as enum ('morning', 'afternoon', 'evening');

create type public.request_status as enum (
  'pending', 'accepted', 'declined', 'cancelled'
);

create type public.booking_status as enum (
  'confirmed', 'completed', 'cancelled', 'no_show'
);

-- `teaching_mode` is intentionally NOT created. The design defines no column
-- that uses it, so it is left to the phase that introduces tutor discovery.

-- ============================================================================
-- 3. TABLES
-- ============================================================================

-- One row per authenticated account, created by handle_new_user().
--
-- SECURITY: there is no INSERT policy and no DELETE policy. Rows only ever
-- appear through the auth trigger, and only leave when the auth account is
-- deleted, which cascades. There is no table-level UPDATE grant either; the
-- account holder receives column-level UPDATE on the self-service columns only,
-- which is what keeps `role` out of reach. See section 9.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'student',
  full_name text not null,
  email text not null unique,
  phone text,
  location text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per authenticated account. role is the trusted application role.';

comment on column public.profiles.role is
  'Trusted application role. Not writable by the account holder.';

-- Public-facing tutor record.
--
-- `hourly_rate` is whole naira in an integer, per the design: Nigeria does not
-- use a minor unit in practice and float would introduce rounding errors into
-- budget matching.
create table public.tutor_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  headline text,
  bio text,
  location text not null,
  hourly_rate integer not null,
  years_of_experience smallint not null default 0,
  is_verified boolean not null default false,
  profile_completeness smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tutor_profiles_hourly_rate_positive check (hourly_rate > 0),
  constraint tutor_profiles_experience_non_negative check (years_of_experience >= 0),
  constraint tutor_profiles_completeness_range check (
    profile_completeness between 0 and 100
  ),
  constraint tutor_profiles_headline_length check (
    headline is null or char_length(headline) <= 140
  )
);

comment on table public.tutor_profiles is
  'Tutor-owned profile. Publicly readable for discovery; writable only by the owning tutor.';

-- Composite primary key, as specified: a tutor teaches many subjects, a subject
-- is taught by many tutors, and the triple is the identity.
create table public.tutor_subjects (
  tutor_id uuid not null references public.tutor_profiles (id) on delete cascade,
  subject text not null,
  level public.education_level not null,
  constraint tutor_subjects_pkey primary key (tutor_id, subject, level),
  constraint tutor_subjects_subject_not_blank check (btrim(subject) <> '')
);

create table public.tutor_qualifications (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutor_profiles (id) on delete cascade,
  title text not null,
  institution text,
  year smallint,
  constraint tutor_qualifications_year_range check (year between 1900 and 2200)
);

-- Weekly recurring slots. `start_time` is optional per the design: a tutor may
-- declare a whole period rather than a specific start.
create table public.tutor_availability (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutor_profiles (id) on delete cascade,
  day public.weekday not null,
  period public.day_period not null,
  start_time time,
  is_active boolean not null default true,
  constraint tutor_availability_day_period_key unique (tutor_id, day, period)
);

comment on table public.tutor_availability is
  'Recurring weekly availability. Matched directly against the availability vocabulary.';

-- One student's request to one tutor.
create table public.tutor_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  tutor_id uuid not null references public.tutor_profiles (id) on delete cascade,
  subject text not null,
  message text not null,
  -- Always read whole, never queried by slot, so jsonb rather than a table.
  preferred_slots jsonb not null default '[]'::jsonb,
  budget integer,
  status public.request_status not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tutor_requests_subject_not_blank check (btrim(subject) <> ''),
  constraint tutor_requests_budget_non_negative check (budget is null or budget >= 0),
  constraint tutor_requests_slots_is_array check (jsonb_typeof(preferred_slots) = 'array')
);

-- One confirmed session. `agreed_rate` is copied from the tutor's rate at
-- booking time so a later rate change never rewrites history.
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique references public.tutor_requests (id) on delete set null,
  tutor_id uuid not null references public.tutor_profiles (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  agreed_rate integer not null,
  status public.booking_status not null default 'confirmed',
  notes text,
  created_at timestamptz not null default now(),
  constraint bookings_valid_window check (ends_at > starts_at),
  constraint bookings_rate_non_negative check (agreed_rate >= 0)
);

-- A tutor cannot be double-booked for overlapping times. Only confirmed
-- bookings participate, so a cancelled slot frees the calendar.
alter table public.bookings
  add constraint no_overlapping_bookings
  exclude using gist (
    tutor_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'confirmed');

-- One review per completed booking, written by the requester.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  tutor_id uuid not null references public.tutor_profiles (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null,
  comment text,
  created_at timestamptz not null default now(),
  constraint reviews_rating_range check (rating between 1 and 5)
);

-- Derived tutor rating, so the UI never computes it per request.
--
-- `security_invoker` makes the view run with the caller's permissions, so RLS on
-- `reviews` still applies. Without it a view runs as its owner and would bypass
-- RLS entirely.
create view public.tutor_ratings
  with (security_invoker = true)
  as
  select
    tutor_id,
    round(avg(rating)::numeric, 2) as average_rating,
    count(*)::int as review_count
  from public.reviews
  group by tutor_id;

-- ============================================================================
-- 4. FUNCTIONS
-- ============================================================================

-- Generic updated_at maintenance.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- The caller's trusted application role, read from `profiles`.
--
-- SECURITY DEFINER is required. `profiles` has RLS enabled, so a policy on
-- `profiles` that read `role` by querying `profiles` would recurse infinitely
-- and Postgres would abort with "infinite recursion detected in policy". Running
-- as the owner bypasses RLS for this single read and breaks the cycle.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Administrator test for RLS policies. SECURITY DEFINER for the same reason as
-- current_user_role().
--
-- Reads `profiles`, never `auth.users.raw_user_meta_data`, so a self-edited
-- metadata claim cannot grant administrator access.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

-- Does `tutor_id` belong to the calling user?
--
-- Every tutor-owned table checks ownership through `tutor_profiles.profile_id`,
-- which means an EXISTS against `tutor_profiles` from inside another table's
-- policy. SECURITY DEFINER keeps that check independent of `tutor_profiles`' own
-- policies, so no table pair can end up referencing each other.
create or replace function public.owns_tutor_profile(tutor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tutor_profiles tp
    where tp.id = tutor_id and tp.profile_id = auth.uid()
  )
$$;

-- The role helpers are executable by signed-in users only. `anon` is excluded so
-- they cannot be used as an oracle for enumerating role values. Policy
-- evaluation runs as the invoking role, so `authenticated` is sufficient.
revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.owns_tutor_profile(uuid) from public, anon;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.owns_tutor_profile(uuid) to authenticated;

-- Creates the application profile for a new auth account.
--
-- SECURITY: `raw_user_meta_data` is written by the account holder, so the role it
-- carries is a request, not a grant. Only the three publicly registrable roles
-- are honoured and `admin` is refused outright, so nobody can self-issue an
-- administrator account at signup. Anything unrecognised degrades to 'student',
-- the least privileged role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
  resolved_name text;
begin
  requested_role := new.raw_user_meta_data ->> 'role';

  resolved_name := nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '');
  if resolved_name is null then
    resolved_name := nullif(split_part(coalesce(new.email, ''), '@', 1), '');
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(resolved_name, 'Member'),
    case
      when requested_role in ('student', 'parent', 'tutor')
        then requested_role::public.user_role
      else 'student'::public.user_role
    end
  );

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates the profiles row for a new auth user. Refuses admin from user metadata.';

-- Runs inside the auth insert path; the account holder must not be able to call
-- it directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ============================================================================
-- 5. INDEXES
-- ============================================================================

-- The design also lists `index (tutor_id)` on tutor_availability. It is omitted
-- because unique (tutor_id, day, period) already indexes tutor_id as its leading
-- column; a second index would be a pure duplicate.

create index tutor_profiles_location_idx on public.tutor_profiles (location);
create index tutor_profiles_hourly_rate_idx on public.tutor_profiles (hourly_rate);

create index tutor_subjects_subject_level_idx on public.tutor_subjects (subject, level);

create index tutor_requests_tutor_status_idx on public.tutor_requests (tutor_id, status);
create index tutor_requests_requester_created_idx
  on public.tutor_requests (requester_id, created_at desc);

-- Prevents accidental double-submits: one open request per requester/tutor pair.
create unique index one_pending_request_per_pair
  on public.tutor_requests (requester_id, tutor_id)
  where status = 'pending';

create index bookings_tutor_starts_idx on public.bookings (tutor_id, starts_at);
create index bookings_requester_starts_idx
  on public.bookings (requester_id, starts_at desc);

create index reviews_tutor_id_idx on public.reviews (tutor_id);

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger tutor_profiles_set_updated_at
  before update on public.tutor_profiles
  for each row execute function public.set_updated_at();

create trigger tutor_requests_set_updated_at
  before update on public.tutor_requests
  for each row execute function public.set_updated_at();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================
-- Every application table has RLS enabled. Without a matching policy a table is
-- unreachable through the client API, which is the safe default: access is
-- granted explicitly, never assumed.

alter table public.profiles enable row level security;
alter table public.tutor_profiles enable row level security;
alter table public.tutor_subjects enable row level security;
alter table public.tutor_qualifications enable row level security;
alter table public.tutor_availability enable row level security;
alter table public.tutor_requests enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;

-- FORCE ROW LEVEL SECURITY is deliberately not set: the owner must keep the
-- ability to run migrations and backfills, and the SECURITY DEFINER helpers
-- above rely on it.

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- The design expressed admin read as `exists (select 1 from profiles ...)` inside
-- a profiles policy, which self-references the table and makes Postgres abort
-- with infinite recursion. is_admin() resolves the same question through a
-- SECURITY DEFINER read that bypasses this policy.
create policy "profiles_select_admin"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- Self-service updates only. There is no INSERT policy and no DELETE policy: rows
-- come from the auth trigger and leave via auth cascade.
--
-- `role` is not in the UPDATE column grant (section 9), so this policy cannot be
-- used to promote an account, even by a user updating their own row.
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- tutor_profiles
-- ----------------------------------------------------------------------------

-- Public discovery surface: headline, bio, location, rate, experience, rating
-- and completeness are all tutor-authored presentation data.
create policy "tutor_profiles_public_read"
  on public.tutor_profiles for select
  to anon, authenticated
  using (true);

-- The design checked only that the caller holds the tutor role, which would have
-- let any tutor create a tutor profile for somebody else's account. Ownership is
-- pinned to the caller as well.
create policy "tutor_profiles_insert_own"
  on public.tutor_profiles for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and public.current_user_role() = 'tutor'
  );

create policy "tutor_profiles_update_own"
  on public.tutor_profiles for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "tutor_profiles_delete_own"
  on public.tutor_profiles for delete
  to authenticated
  using (profile_id = auth.uid() and public.current_user_role() = 'tutor');

-- ----------------------------------------------------------------------------
-- tutor_subjects / tutor_qualifications / tutor_availability
-- ----------------------------------------------------------------------------
-- Public read, owner-only write, checked through tutor_profiles.profile_id.

create policy "tutor_subjects_public_read"
  on public.tutor_subjects for select
  to anon, authenticated
  using (true);

create policy "tutor_subjects_owner_write"
  on public.tutor_subjects for all
  to authenticated
  using (public.owns_tutor_profile(tutor_id))
  with check (public.owns_tutor_profile(tutor_id));

create policy "tutor_qualifications_public_read"
  on public.tutor_qualifications for select
  to anon, authenticated
  using (true);

create policy "tutor_qualifications_owner_write"
  on public.tutor_qualifications for all
  to authenticated
  using (public.owns_tutor_profile(tutor_id))
  with check (public.owns_tutor_profile(tutor_id));

create policy "tutor_availability_public_read"
  on public.tutor_availability for select
  to anon, authenticated
  using (true);

create policy "tutor_availability_owner_write"
  on public.tutor_availability for all
  to authenticated
  using (public.owns_tutor_profile(tutor_id))
  with check (public.owns_tutor_profile(tutor_id));

-- ----------------------------------------------------------------------------
-- tutor_requests
-- ----------------------------------------------------------------------------
-- Private between the two parties. No anonymous access at all.

create policy "tutor_requests_party_read"
  on public.tutor_requests for select
  to authenticated
  using (
    requester_id = auth.uid()
    or public.owns_tutor_profile(tutor_id)
    or public.is_admin()
  );

create policy "tutor_requests_requester_insert"
  on public.tutor_requests for insert
  to authenticated
  with check (requester_id = auth.uid());

-- Only the tutor party may respond, which is what `status` and `responded_at`
-- exist for.
create policy "tutor_requests_tutor_update"
  on public.tutor_requests for update
  to authenticated
  using (public.owns_tutor_profile(tutor_id))
  with check (public.owns_tutor_profile(tutor_id));

create policy "tutor_requests_requester_delete"
  on public.tutor_requests for delete
  to authenticated
  using (requester_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- bookings
-- ----------------------------------------------------------------------------

create policy "bookings_party_read"
  on public.bookings for select
  to authenticated
  using (
    public.owns_tutor_profile(tutor_id)
    or requester_id = auth.uid()
    or public.is_admin()
  );

-- Intentionally read-only for signed-in users, matching the design. Booking
-- creation and confirmation belong to the booking phase, which will add the
-- write policies. Until then bookings can only be written with the service role
-- or from SQL, which is what keeps the overlap constraint meaningful.

-- ----------------------------------------------------------------------------
-- reviews
-- ----------------------------------------------------------------------------

create policy "reviews_public_read"
  on public.reviews for select
  to anon, authenticated
  using (true);

-- Only the requester of a completed booking may review it, and the unique
-- constraint on booking_id means only once.
--
-- `b.tutor_id = reviews.tutor_id` is required, not redundant: `tutor_id` is
-- client-supplied, so without it a student could point `booking_id` at their own
-- completed booking while naming an unrelated tutor, and that tutor's rating
-- would be poisoned by a review for a lesson they never taught.
--
-- `bookings` policies call owns_tutor_profile(), never back into `reviews`, so
-- this subquery does not create a policy cycle.
create policy "reviews_requester_insert"
  on public.reviews for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id
        and b.tutor_id = reviews.tutor_id
        and b.requester_id = auth.uid()
        and b.status = 'completed'
    )
  );

-- Deliberately no UPDATE policy: a rating is not editable. Deletion is allowed
-- for the author or an admin, so a review can be retracted or removed.
create policy "reviews_author_delete"
  on public.reviews for delete
  to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- ============================================================================
-- 9. GRANTS
-- ============================================================================
-- Supabase grants the `anon` and `authenticated` roles broad access to new
-- tables in `public` through default privileges. These statements restate the
-- intended surface so the model does not depend on platform defaults, and they
-- revoke write access from `anon` explicitly.

grant usage on schema public to anon, authenticated;

-- Start from nothing for the public schema, then add back only what is intended.
revoke all on table
  public.profiles,
  public.tutor_profiles,
  public.tutor_subjects,
  public.tutor_qualifications,
  public.tutor_availability,
  public.tutor_requests,
  public.bookings,
  public.reviews
  from anon, authenticated;

-- profiles: never readable anonymously, and never inserted or deleted by a
-- client. The account holder may update only the self-service columns; `role`
-- and `id` are excluded, which is what makes the trusted role trustworthy.
grant select on table public.profiles to authenticated;
grant update (full_name, phone, location, avatar_url) on table public.profiles to authenticated;

-- Discovery surface: anonymous read, tutor-owned write.
grant select on table
  public.tutor_profiles,
  public.tutor_subjects,
  public.tutor_qualifications,
  public.tutor_availability,
  public.reviews
  to anon;

grant select on table
  public.tutor_profiles,
  public.tutor_subjects,
  public.tutor_qualifications,
  public.tutor_availability,
  public.tutor_requests,
  public.bookings,
  public.reviews
  to authenticated;

-- A tutor writes their own tutor profile, but never sets `is_verified`, which is
-- a moderation decision. Column-level grants, as the design specifies.
grant insert (profile_id, headline, bio, location, hourly_rate, years_of_experience, profile_completeness)
  on table public.tutor_profiles to authenticated;
grant update (headline, bio, location, hourly_rate, years_of_experience, profile_completeness)
  on table public.tutor_profiles to authenticated;
grant delete on table public.tutor_profiles to authenticated;

grant insert, update, delete on table
  public.tutor_subjects,
  public.tutor_qualifications,
  public.tutor_availability
  to authenticated;

-- tutor_requests: the requester creates and deletes their own, and only the
-- addressed tutor responds.
--
-- UPDATE is granted per column rather than per table. tutor_requests_tutor_update
-- constrains `tutor_id` in both USING and WITH CHECK, but a policy cannot compare
-- the old row with the new one, so a full-table UPDATE grant would let a tutor
-- rewrite `requester_id` and hand a student's request to somebody else. Limiting
-- the grant to the response columns is what actually enforces "only the tutor
-- party may change status", and it matches the design's stated intent.
grant insert, delete on table public.tutor_requests to authenticated;
grant update (status, responded_at) on table public.tutor_requests to authenticated;

-- reviews: public read, author-only insert and delete, never update.
grant insert (booking_id, tutor_id, author_id, rating, comment) on table public.reviews to authenticated;
grant delete on table public.reviews to authenticated;

-- Primary keys use gen_random_uuid(), not sequences, so there are no sequences to
-- grant.

-- Verification queries (run after applying):

--   -- 1. every table has RLS on
--   select relname, relrowsecurity from pg_class
--   where relnamespace = 'public'::regnamespace and relkind = 'r'
--   order by relname;
--
--   -- 2. anon holds no write privilege anywhere
--   select table_name, privilege_type
--   from information_schema.role_table_grants
--   where grantee = 'anon' and privilege_type <> 'SELECT'
--   and table_schema = 'public';
--
--   -- 3. anon cannot update profiles.role
--   select has_column_privilege('anon', 'public.profiles', 'role', 'UPDATE');
--
-- Expected: (2) returns no rows, (3) returns false.