-- TutorMatch IB - demo data (TEST ENVIRONMENT ONLY)
--
-- WHAT THIS IS
--   Clearly-labelled sample data so a reviewer can exercise the full journey:
--   discovery, tutor detail, request creation, and (once the Stage B/C/C1
--   migrations are applied) bookings. The linked project currently has only two
--   bare tutor_profiles rows and NO tutor_subjects / tutor_availability /
--   tutor_qualifications, so the request flow is blocked by design.
--
-- WHERE TO RUN IT
--   A local or test Supabase project ONLY. Run it AFTER applying the Stage B,
--   Stage C and Stage C1 migrations:
--
--     supabase db reset                 # local: applies all migrations
--     psql "$DATABASE_URL" -f demo-data.sql
--   or paste it into the SQL editor of the test project.
--
--   DO NOT run against a production database, and DO NOT add it to
--   supabase/migrations/ (it is not a migration). It is not referenced by any
--   seed configuration, so `supabase db reset` will not pick it up either.
--
-- WHAT IT PRODUCES (idempotent; safe to run more than once)
--   For each existing demo tutor (matched by location + headline, so it does
--   not depend on hard-coded uuids):
--     * a display_name (Stage B column; skipped automatically if missing)
--     * 4-6 subject offerings (a request can only target an offering)
--     * 3 availability slots
--     * qualifications
--   It does not create tutor_requests or bookings.

begin;

-- Refuse to run where the schema is missing entirely.
do $$
begin
  if not exists (
    select 1 from pg_class where relname = 'tutor_profiles' and relnamespace = 'public'::regnamespace
  ) then
    raise exception 'demo-data.sql expects the TutorMatch schema. Apply migrations first.';
  end if;
end $$;

-- display_name only exists after the Stage B migration; guard so this file is a
-- no-op on the current production schema rather than an error.
--
-- The Stage B `tutor_profiles_location_approved` CHECK is added NOT VALID, but
-- NOT VALID constraints are still enforced on INSERT/UPDATE rows (only the
-- pre-constraint rows are exempt until VALIDATE CONSTRAINT runs). 'Bodija' is
-- in the approved list, so that UPDATE passes; 'Porthacourt' is not, so writing
-- a display_name there would abort this whole transaction. The Porthacourt
-- tutor is deliberately left without a display_name (the profile page falls
-- back to the headline) to keep this file safe to run after Stage B.
do $$
declare
  allowed_locations text[] := array[
    'Agodi Gate', 'Bodija', 'Iwo Road', 'Dugbe', 'Onireke', 'Mapo',
    'Ring Road', 'Oluyole Estate', 'Oke-Ado', 'Moniya', 'Egbeda', 'Ido',
    'Iyana-Offa', 'Idi-Ayunre', 'Akanran', 'Samonda', 'Agbowo', 'Orogun',
    'University of Ibadan', 'Apata', 'Ganga', 'Basorun', 'Agodi GRA',
    'Oke-Bola', 'Jericho', 'Iyaganku'
  ];
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tutor_profiles'
      and column_name = 'display_name'
  ) then
    update public.tutor_profiles tp
      set display_name = demo.display_name
      from (values
        ('Bodija',    'Economics', 'Mrs. Adaeze Okafor'),
        ('Porthacourt', 'PHYSICS', 'Mr. Emeka Nwosu')
      ) as demo(location, headline, display_name)
      where tp.location = demo.location
        and tp.location = any (allowed_locations)
        and upper(tp.headline) = upper(demo.headline)
        and tp.display_name is null;
  end if;
end $$;

-- Subject offerings. These are the rows the Stage C1 request-insert policy
-- validates the requested subject/level against, so without them no request can
-- be created even after the migrations are applied.
do $$
declare
  g_bodija uuid := (
    select id from public.tutor_profiles where location = 'Bodija' and upper(headline) = 'ECONOMICS' limit 1
  );
  g_porth uuid := (
    select id from public.tutor_profiles where location = 'Porthacourt' and upper(headline) = 'PHYSICS' limit 1
  );
begin
  if g_bodija is not null then
    insert into public.tutor_subjects (tutor_id, subject, level) values
      (g_bodija, 'Economics',       'waec'::public.education_level),
      (g_bodija, 'Economics',       'sss'::public.education_level),
      (g_bodija, 'Economics',       'neco'::public.education_level),
      (g_bodija, 'Mathematics',     'jss'::public.education_level),
      (g_bodija, 'Mathematics',     'sss'::public.education_level)
    on conflict (tutor_id, subject, level) do nothing;
  end if;

  if g_porth is not null then
    insert into public.tutor_subjects (tutor_id, subject, level) values
      (g_porth, 'Physics',            'waec'::public.education_level),
      (g_porth, 'Physics',            'sss'::public.education_level),
      (g_porth, 'Physics',            'neco'::public.education_level),
      (g_porth, 'Physics',            'undergraduate'::public.education_level),
      (g_porth, 'Further Mathematics', 'sss'::public.education_level),
      (g_porth, 'Chemistry',          'sss'::public.education_level)
    on conflict (tutor_id, subject, level) do nothing;
  end if;
end $$;

-- Availability slots (day + period cannot repeat per tutor).
do $$
declare
  g_bodija uuid := (
    select id from public.tutor_profiles where location = 'Bodija' and upper(headline) = 'ECONOMICS' limit 1
  );
  g_porth uuid := (
    select id from public.tutor_profiles where location = 'Porthacourt' and upper(headline) = 'PHYSICS' limit 1
  );
begin
  if g_bodija is not null then
    insert into public.tutor_availability (tutor_id, day, period, start_time, is_active) values
      (g_bodija, 'monday',    'afternoon', '15:00:00', true),
      (g_bodija, 'wednesday', 'morning',   '09:00:00', true),
      (g_bodija, 'saturday',  'evening',   '17:00:00', true)
    on conflict (tutor_id, day, period) do nothing;
  end if;

  if g_porth is not null then
    insert into public.tutor_availability (tutor_id, day, period, start_time, is_active) values
      (g_porth, 'tuesday',   'evening',   '16:00:00', true),
      (g_porth, 'thursday',  'afternoon', '14:00:00', true),
      (g_porth, 'saturday',  'morning',   '10:00:00', true)
    on conflict (tutor_id, day, period) do nothing;
  end if;
end $$;

-- Qualifications.
insert into public.tutor_qualifications (tutor_id, title, institution, year)
select id, 'BSc Economics', 'University of Ibadan', 2009
from public.tutor_profiles where location = 'Bodija' and upper(headline) = 'ECONOMICS';

insert into public.tutor_qualifications (tutor_id, title, institution, year)
select id, 'BSc Physics', 'University of Port Harcourt', 2006
from public.tutor_profiles where location = 'Porthacourt' and upper(headline) = 'PHYSICS';

commit;