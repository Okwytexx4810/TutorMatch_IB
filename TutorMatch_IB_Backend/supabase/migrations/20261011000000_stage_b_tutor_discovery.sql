-- TutorMatch IB - Stage B: tutor discovery compatibility
--
-- STATUS: PREPARED, NOT APPLIED. This migration is written for review. It must
-- not be applied to production until the owner approves it. Until it is applied,
-- the application degrades gracefully: tutor discovery and the tutor profile
-- form detect the missing `display_name` column and fall back to the existing
-- schema. See `src/lib/supabase/compat.ts`.
--
-- Apply with (from TutorMatch_IB_Backend/):
--   supabase db push
--
-- Prerequisites:
--   * The two earlier migrations are already applied (verified in sync).
--   * Review the location CHECK below. It is added NOT VALID on purpose so the
--     already-present non-canonical row (location = 'Porthacourt') does not
--     abort the migration. New and updated rows are still constrained.
--
-- Impact:
--   * Adds one nullable column. No data is rewritten or deleted.
--   * Adds one CHECK constraint that only affects future writes.
--
-- Verification (run after applying):
--   select column_name from information_schema.columns
--     where table_schema = 'public' and table_name = 'tutor_profiles'
--       and column_name = 'display_name';            -- expect 1 row
--
--   select conname, convalidated from pg_constraint
--     where conname = 'tutor_profiles_location_approved';  -- expect convalidated = false
--
-- To fully validate the location constraint later, first normalise any
-- non-canonical rows through a reviewed data-fix, then:
--   alter table public.tutor_profiles
--     validate constraint tutor_profiles_location_approved;

-- ============================================================================
-- 1. Display name
-- ============================================================================
-- `profiles` has no public read policy, so tutor discovery cannot join to a
-- tutor's full name. Rather than expose the private `profiles` row, the tutor
-- owns a presentation-only display name on their public tutor profile.
alter table public.tutor_profiles
  add column if not exists display_name text;

comment on column public.tutor_profiles.display_name is
  'Public display name shown in tutor discovery. Optional; falls back to headline.';

-- Tutor-writable, alongside the other presentation columns. Additive grants:
-- this does not alter the existing INSERT/UPDATE column lists.
grant insert (display_name) on table public.tutor_profiles to authenticated;
grant update (display_name) on table public.tutor_profiles to authenticated;

-- ============================================================================
-- 2. Approved-location constraint
-- ============================================================================
-- Mirrors IBADAN_LOCATIONS in TutorMatch_IB_Frontend/src/lib/locations.ts.
-- Kept NOT VALID so existing rows are grandfathered; every insert and every
-- update is still checked.
--
-- `drop ... if exists` first: `add constraint` is not idempotent, so a partial
-- or repeated run would otherwise abort on "constraint already exists" and
-- could strand the migration half-applied. Dropping and re-adding is safe here
-- because the constraint carries no data and is re-created identically.
alter table public.tutor_profiles
  drop constraint if exists tutor_profiles_location_approved;

alter table public.tutor_profiles
  add constraint tutor_profiles_location_approved
  check (
    location in (
      'Agodi Gate', 'Bodija', 'Iwo Road', 'Dugbe', 'Onireke', 'Mapo',
      'Ring Road', 'Oluyole Estate', 'Oke-Ado', 'Moniya', 'Egbeda', 'Ido',
      'Iyana-Offa', 'Idi-Ayunre', 'Akanran', 'Samonda', 'Agbowo', 'Orogun',
      'University of Ibadan', 'Apata', 'Ganga', 'Basorun', 'Agodi GRA',
      'Oke-Bola', 'Jericho', 'Iyaganku'
    )
  )
  not valid;
