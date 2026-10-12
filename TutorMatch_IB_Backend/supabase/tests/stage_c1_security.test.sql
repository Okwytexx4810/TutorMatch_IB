-- Stage C1 security hardening - pgTAP plan
--
-- STATUS: NOT EXECUTED. There is no local database in this repository, so this
-- plan is written for the reviewer to run once `supabase start` is available.
--
-- Run from TutorMatch_IB_Backend/:
--   supabase start
--   supabase test db
--
-- The plan needs a seeded session (some tests act as `authenticated` with
-- `request.jwt.claims`), which is why this is a single self-contained script
-- rather than bare assertions: it seeds two accounts (a requester and a tutor
-- with a real offering), then exercises the hardened surface as that requester.
--
-- Preconditions:
--   * 20260103000000_initial_schema.sql, Stage B, Stage C and Stage C1 are all
--     applied (apply order: B, C, C1), so the hardened grants, the hardened
--     request insert policy and the prepare_booking trigger exist.
--   * pgTAP is installed (present in the Supabase test image).
--
-- Idempotent: the fixture ids are fixed and the setup drops any leftover rows.

begin;

select * from plan(16);

-- ---------------------------------------------------------------------------
-- Fixture: two accounts, a tutor profile with one offering, one accepted
-- request. Inserted as postgres (RLS bypassed) except the request, which is
-- created through the hardened path below.
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000000',
   'authenticated', 'authenticated', 'seed-requester@tutormatch.example', '',
   now(), now(), now(), '{}', jsonb_build_object('role', 'student')),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000000',
   'authenticated', 'authenticated', 'seed-tutor@tutormatch.example', '',
   now(), now(), now(), '{}', jsonb_build_object('role', 'tutor'))
on conflict (id) do nothing;

insert into public.profiles (id, role, full_name, email)
values
  ('00000000-0000-4000-8000-000000000001', 'student', 'Seed Requester', 'seed-requester@tutormatch.example'),
  ('00000000-0000-4000-8000-000000000002', 'tutor', 'Seed Tutor', 'seed-tutor@tutormatch.example')
on conflict (id) do nothing;

insert into public.tutor_profiles
  (id, profile_id, headline, location, hourly_rate, years_of_experience, profile_completeness)
values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000002',
   'Seed tutor', 'Bodija', 9000, 5, 100)
on conflict (id) do nothing;

insert into public.tutor_subjects (tutor_id, subject, level)
values ('00000000-0000-4000-8000-000000000010', 'Economics', 'waec')
on conflict (tutor_id, subject, level) do nothing;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

-- was: `grant insert, delete on table public.tutor_requests to authenticated`
select ok(
  not has_table_privilege('authenticated', 'public.tutor_requests', 'INSERT'),
  'C1: authenticated has no table-level INSERT on tutor_requests'
);

-- status/responded_at are sealed at column level; a requester may still INSERT
-- the whitelisted columns.
select ok(
  not has_column_privilege('authenticated', 'public.tutor_requests', 'status', 'INSERT'),
  'C1: authenticated cannot INSERT status'
);
select ok(
  not has_column_privilege('authenticated', 'public.tutor_requests', 'responded_at', 'INSERT'),
  'C1: authenticated cannot INSERT responded_at'
);
select ok(
  has_column_privilege('authenticated', 'public.tutor_requests', 'subject', 'INSERT'),
  'C1: authenticated can INSERT the requester-chosen columns'
);

select ok(
  not has_column_privilege('authenticated', 'public.bookings', 'agreed_rate', 'INSERT'),
  'H1: authenticated cannot INSERT agreed_rate on bookings'
);

-- ---------------------------------------------------------------------------
-- Policy content
-- ---------------------------------------------------------------------------
select ok(
  (select pg_get_expr(qual, polrelid)
     from pg_policy
    where polrelid = 'public.tutor_requests'::regclass
      and polname = 'tutor_requests_requester_insert'
  ) like '%status = ''pending''%' and (
    select pg_get_expr(qual, polrelid)
      from pg_policy
     where polrelid = 'public.tutor_requests'::regclass
       and polname = 'tutor_requests_requester_insert'
  ) like '%responded_at is null%',
  'C1: request insert policy pins status = pending and responded_at is null'
);
select ok(
  (select pg_get_expr(qual, polrelid)
     from pg_policy
    where polrelid = 'public.tutor_requests'::regclass
      and polname = 'tutor_requests_requester_insert'
  ) like '%tutor_subjects%',
  'C1: request insert policy requires a real offering (tutor_subjects)'
);

-- Trigger present and enabled.
select ok(
  (select count(*) from pg_trigger
    where tgrelid = 'public.bookings'::regclass and tgname = 'bookings_prepare')::bool,
  'C1: bookings_prepare trigger exists'
);

-- ---------------------------------------------------------------------------
-- Behaviour as the requester
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-000000000001',
                    'role', 'authenticated')::text, true);

-- (a) forging an accepted request must fail.
set local role authenticated;
select throws_ok($$
  insert into public.tutor_requests (requester_id, tutor_id, subject, level, location, message, status)
  values ('00000000-0000-4000-8000-000000000001',
          '00000000-0000-4000-8000-000000000010',
          'Economics', 'waec', 'Bodija', 'mint a booking', 'accepted')
$$,
  '42501',
  'C1: authenticated is blocked from INSERTing an accepted request'
);
reset role;

-- (b) a subject the tutor does not teach must fail even as pending.
set local role authenticated;
select throws_ok($$
  insert into public.tutor_requests (requester_id, tutor_id, subject, level, location, message)
  values ('00000000-0000-4000-8000-000000000001',
          '00000000-0000-4000-8000-000000000010',
          'Astrology', 'waec', 'Bodija', 'does not exist')
$$,
  '42501',
  'C1: authenticated is blocked from requesting an unoffered subject'
);
reset role;

-- (c) a proper pending request for a real offering is accepted, and the tutor
-- accepts it through the guarded transition policy.
set local role authenticated;
select lives_ok($$
  insert into public.tutor_requests (requester_id, tutor_id, subject, level, location, message)
  values ('00000000-0000-4000-8000-000000000001',
          '00000000-0000-4000-8000-000000000010',
          '  Economics  ', 'waec', 'Bodija', 'can you help before mocks')
$$,
  'C1: a pending request for a real offering is accepted (whitespace-normalised)'
);
reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-000000000002',
                    'role', 'authenticated')::text, true);
set local role authenticated;
-- The relaxed subject "  Economics  " normalises to the stored offering, so
-- the accepted request still matches the offering after respond.
select lives_ok($$
  update public.tutor_requests
     set status = 'accepted', responded_at = now()
   where requester_id = '00000000-0000-4000-8000-000000000001'
     and tutor_id     = '00000000-0000-4000-8000-000000000010'
$$,
  'C1: tutor can accept the pending request (guarded transition)'
);
reset role;

-- (d) the booking derives agreed_rate from the tutor profile, not the client,
-- and a past start is refused.
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-000000000001',
                    'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok($$
  with chosen as (
    select id, tutor_id, requester_id, subject
      from public.tutor_requests
     where requester_id = '00000000-0000-4000-8000-000000000001'
       and status = 'accepted'
     limit 1
  )
  insert into public.bookings (request_id, tutor_id, requester_id, subject, starts_at, ends_at)
  select id, tutor_id, requester_id, subject,
         now() + interval '2 hours', now() + interval '3 hours'
    from chosen
$$,
  'C1: a booking can be created for an accepted request with a future window'
);
select is(
  (select b.agreed_rate
     from public.bookings b
     join public.tutor_requests r on r.id = b.request_id
    where r.requester_id = '00000000-0000-4000-8000-000000000001'),
  (select hourly_rate from public.tutor_profiles
    where id = '00000000-0000-4000-8000-000000000010'),
  'C1: agreed_rate is copied from the tutor profile at insert time'
);
reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-000000000001',
                    'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok($$
  insert into public.bookings
    (request_id, tutor_id, requester_id, subject, starts_at, ends_at, agreed_rate)
  select id, tutor_id, requester_id, subject,
         now() + interval '2 hours', now() + interval '3 hours', 1
    from public.tutor_requests
   where requester_id = '00000000-0000-4000-8000-000000000001'
     and status = 'accepted'
   limit 1
$$,
  '42501',
  'H1: authenticated cannot supply agreed_rate directly'
);
-- now() is the floor, so a window starting before now() is refused by the
-- trigger with its dedicated SQLSTATE.
select throws_ok($$
  insert into public.bookings
    (request_id, tutor_id, requester_id, subject, starts_at, ends_at)
  select id, tutor_id, requester_id, subject,
         now() - interval '1 hour', now() + interval '1 hour'
    from public.tutor_requests
   where requester_id = '00000000-0000-4000-8000-000000000001'
     and status = 'accepted'
   limit 1
$$,
  'P0002',
  'C1: a past start_at is refused with SQLSTATE P0002'
);
reset role;

select * from finish();
rollback;