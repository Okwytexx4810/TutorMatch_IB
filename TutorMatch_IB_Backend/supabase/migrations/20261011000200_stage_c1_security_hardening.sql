-- TutorMatch IB - Stage C1: corrective security hardening
--
-- STATUS: PREPARED, NOT APPLIED. This is a forward-only corrective migration
-- produced from the Stage C security review. Do NOT apply to production until
-- the owner approves it. Apply order is 20260103000000 (applied) then Stage B,
-- Stage C, then this file; Stage C1 is safe to re-run (every statement is
-- restart-safe), the others are now guarded too.
--
-- What this corrects (review findings):
--   C1. The base schema granted `insert, delete on table public.tutor_requests
--       to authenticated` (a table-level grant) and the insert policy checked
--       only `requester_id = auth.uid()`. A client could therefore INSERT a
--       request already bearing `status = 'accepted'` and then walk straight
--       into `bookings_insert_accepted_request` to mint a booking without the
--       tutor's consent. This file removes the table-level grant, scopes the
--       INSERT grant to the columns a requester may set, and re-creates the
--       insert policy to pin `status = 'pending'`, `responded_at is null`, and
--       to require the requested subject/level to be a real offering on the
--       tutor's profile (offsets H2 at the database layer).
--   H1. Stage C granted INSERT on `agreed_rate`, so a client could book at a
--       forged rate (0 or any integer). `agreed_rate` is revoked from INSERT
--       and is instead derived inside a BEFORE INSERT trigger from
--       `tutor_profiles.hourly_rate` at booking time, preserving the "copied at
--       booking time" semantics the table comment states.
--   H3. Times are not part of this file beyond the `starts_at in the future`
--       guard below; start/end are taken as absolute instants. The WAT parsing
--       fix lives in the frontend (src/lib/validation/engagement.ts). The
--       trigger enforces a floor of `now()` so a past or too-soon booking is
--       rejected server-side too.
--   H4. Restart-safety: policies are re-created through `drop policy if exists`
--       and the trigger through `create or replace` + `drop trigger if exists`,
--       so a partial/repeated push cannot strand this migration.
--
-- Residual risks (accepted, documented):
--   * The request-offering check depends on walkable rows in
--     `public.tutor_subjects`. Stage B created the description coverage that
--     lets tutors populate offerings; if a tutor has no offering rows, requests
--     to that tutor are blocked (intended).
--   * Forensics of the C1 hole only matter if Stage C shipped before this file;
--     it did not. With all three applied together the hole never exists.
--
-- Verification (after applying, as the postgres role):
--   -- 1. authenticated has no table-level INSERT on tutor_requests, only the
--   --    whitelisted columns:
--   select has_table_privilege('authenticated', 'public.tutor_requests', 'INSERT');
--   select column_name from information_schema.column_privileges
--   where table_schema = 'public' and table_name = 'tutor_requests'
--     and grantee = 'authenticated' and privilege_type = 'INSERT'
--     and column_name in ('status', 'responded_at', 'created_at');
--   --    expect false for the first, and no rows for the second.
--
--   -- 2. the request insert policy re-added and hardened:
--   select pg_get_expr(qual, oid) from pg_policy
--   where polname = 'tutor_requests_requester_insert' and polrelid = 'public.tutor_requests'::regclass;
--   --    expect status = 'pending', responded_at is null, and the
--   --    tutor_subjects offering subquery.
--
--   -- 3. agreed_rate is not client-insertable on bookings:
--   select has_column_privilege('authenticated', 'public.bookings', 'agreed_rate', 'INSERT');
--   --    expect false.
--
--   -- 4. booking insert derives the rate:
--   --    (needs a session; see the pgTAP plan in supabase/tests/ for a full
--   --     behavior run).

-- ============================================================================
-- 1. tutor_requests: revoke table-level INSERT, grant the requester's columns
-- ============================================================================
-- The base migration at 20260103000000 granted `insert, delete on table
-- public.tutor_requests to authenticated`, which covers EVERY column including
-- `status` and `responded_at`. Scoped column grants replace it: the client may
-- only set the fields a requester is allowed to choose. `id`, `created_at`,
-- `updated_at`, `status`, `responded_at` fall back to their defaults.
revoke insert on table public.tutor_requests from authenticated;

grant insert (requester_id, tutor_id, subject, message, preferred_slots, budget, level, location)
  on table public.tutor_requests to authenticated;

-- DELETE stays table-level (the requester may delete their own request; the
-- delete policy is unchanged).

-- ============================================================================
-- 2. tutor_requests: harden the requester insert policy
-- ============================================================================
-- C1: a request is born `pending` with no response, and the subject/level pair
-- must exist in the tutor's offering table. `regexp_replace(... '\s+', ' ', 'g')`
-- mirrors the frontend's `normalize()` (trim, lower, collapse whitespace) so
-- stored canonical text and typed text align in either direction.
drop policy if exists "tutor_requests_requester_insert"
  on public.tutor_requests;

create policy "tutor_requests_requester_insert"
  on public.tutor_requests for insert
  to authenticated
  with check (
    requester_id = auth.uid()
    and status = 'pending'::request_status
    and responded_at is null
    and exists (
      select 1
      from public.tutor_subjects ts
      where ts.tutor_id = tutor_requests.tutor_id
        and lower(regexp_replace(btrim(ts.subject), '\s+', ' ', 'g')) =
            lower(regexp_replace(btrim(tutor_requests.subject), '\s+', ' ', 'g'))
        and ts.level::text = tutor_requests.level
    )
  );

-- ============================================================================
-- 3. bookings: stop client-set agreed_rate
-- ============================================================================
-- Stage C granted `insert (..., agreed_rate, ...)`. The rate is a pricing
-- decision owned by the tutor's profile, not the client. Revoke INSERT on
-- `agreed_rate` and regrant the exact column list without it; the BEFORE INSERT
-- trigger below copies the tutor's current hourly_rate.
revoke insert (agreed_rate) on table public.bookings from authenticated;
-- Defensive table-level revoke (no-op today) so any restored auto-expose can
-- never cover `agreed_rate` behind this column grant.
revoke insert on table public.bookings from authenticated;

grant insert (request_id, tutor_id, requester_id, subject, starts_at, ends_at, notes)
  on table public.bookings to authenticated;

-- ============================================================================
-- 4. bookings: derive agreed_rate and reject meaningless times
-- ============================================================================
-- BEFORE INSERT runs before NOT NULL / CHECK validation, so setting
-- `new.agreed_rate` here satisfies the `not null` column with no DEFAULT.
-- SECURITY DEFINER + `set search_path = ''` make the lookup independent of the
-- caller's RLS view of tutor_profiles (which is public anyway today). The
-- look-up raise is given its own SQLSTATE so the client can surface it
-- precisely instead of a generic constraint error.
create or replace function public.prepare_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rate integer;
begin
  if new.starts_at is not null and new.starts_at <= now() then
    raise exception 'Booking start time must be in the future.'
      using errcode = 'P0002', hint = 'Pick a start time ahead of now (West Africa Time).';
  end if;

  select hourly_rate into v_rate
  from public.tutor_profiles
  where id = new.tutor_id;

  if v_rate is null then
    raise exception 'Tutor profile no longer exists.'
      using errcode = 'P0003', hint = 'Refresh and pick a current tutor.';
  end if;

  new.agreed_rate := v_rate;
  return new;
end;
$$;

drop trigger if exists bookings_prepare on public.bookings;

create trigger bookings_prepare
  before insert on public.bookings
  for each row execute function public.prepare_booking();