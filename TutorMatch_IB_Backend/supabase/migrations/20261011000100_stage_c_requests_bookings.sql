-- TutorMatch IB - Stage C: request and booking workflow
--
-- STATUS: PREPARED, NOT APPLIED. This migration is written for review. It must
-- not be applied to production until the owner approves it, and the frontend
-- ships together with it: the requests/bookings pages and actions in this stage
-- depend on the columns and policies below.
--
-- Apply with (from TutorMatch_IB_Backend/):
--   supabase db push
--
-- Scope (why these statements exist):
--   * `tutor_requests` gained `level` and `location` so a student can state
--     what level, for which subject, and where (approved Ibadan area) they want
--     tuition. Previously the schema carried subject, message and slots only.
--   * `tutor_requests` role policies: the old `tutor_requests_tutor_update` was
--     a bare "tutor party may UPDATE" policy with no transition guard. It is
--     replaced with a strict `pending -> accepted|declined` policy, and the
--     requester gets a `pending -> cancelled` policy. Both encode the only legal
--     state changes, matching `request_status`.
--   * `bookings` was read-only for signed-in users (the design deferred write
--     policies to the booking phase). This adds the INSERT / UPDATE column
--     grants and two policies: an insert that requires the row to reference an
--     ACCEPTED request with a matching tutor/requester/subject triplet, and a
--     state-change UPDATE that only ever lowers a `confirmed` booking to
--     `cancelled` (either party) or `completed` (tutor only).
--
-- Preconditions / hazards:
--   * No SQL dependency on the Stage B migration. Every object this file
--     touches (tutor_requests, bookings, owns_tutor_profile, the enums) exists
--     in 20260103000000_initial_schema.sql, so Stage C is independently
--     applicable. It is still ordered after Stage B by filename, and the two
--     are designed to be applied together (B then C), because Stage C1 that
--     follows relies on the offering data Stage B backfills.
--   * The location CHECK is added NOT VALID, mirroring Stage B, so existing
--     (or legacy) rows are grandfathered while new and updated rows are
--     constrained.
--   * New `level` / `location` columns are nullable. The application requires
--     them at the server-action level; they are nullable so the migration is
--     safe against already-present request rows (there are none today).
--
-- Verification (run after applying):
--   select column_name from information_schema.columns
--     where table_schema = 'public' and table_name = 'tutor_requests'
--       and column_name in ('level', 'location');              -- expect 2 rows
--
--   select policyname from pg_policies
--     where tablename in ('tutor_requests', 'bookings')
--     order by tablename, policyname;
--     -- expect no 'tutor_requests_tutor_update', and expect
--     -- tutor_requests_tutor_respond, tutor_requests_requester_cancel,
--     -- bookings_insert_accepted_request, bookings_state_changes
--
-- To fully validate the location constraint later (after normalising any
-- non-canonical rows through a reviewed data-fix):
--   alter table public.tutor_requests
--     validate constraint tutor_requests_location_approved;

-- ============================================================================
-- 1. tutor_requests: level and location
-- ============================================================================
alter table public.tutor_requests
  add column if not exists level text,
  add column if not exists location text;

comment on column public.tutor_requests.level is
  'Educational level requested (e.g. JSS 2, SS 1). Matches the tutor''s subject level.';
comment on column public.tutor_requests.location is
  'Preferred meeting location, restricted to the approved Ibadan list.';

-- Mirrors IBADAN_LOCATIONS in TutorMatch_IB_Frontend/src/lib/locations.ts and
-- the Stage B constraint on tutor_profiles. NOT VALID on purpose: new and
-- updated rows are checked, pre-existing rows are grandfathered.
--
-- Guarded drop first so a re-run (or a resume after a partial failure) does not
-- abort on "constraint already exists"; the constraint carries no data and is
-- re-created identically.
alter table public.tutor_requests
  drop constraint if exists tutor_requests_location_approved;

alter table public.tutor_requests
  add constraint tutor_requests_location_approved
  check (
    location is null
    or location in (
      'Agodi Gate', 'Bodija', 'Iwo Road', 'Dugbe', 'Onireke', 'Mapo',
      'Ring Road', 'Oluyole Estate', 'Oke-Ado', 'Moniya', 'Egbeda', 'Ido',
      'Iyana-Offa', 'Idi-Ayunre', 'Akanran', 'Samonda', 'Agbowo', 'Orogun',
      'University of Ibadan', 'Apata', 'Ganga', 'Basorun', 'Agodi GRA',
      'Oke-Bola', 'Jericho', 'Iyaganku'
    )
  )
  not valid;

-- ============================================================================
-- 2. tutor_requests: transition-guarded role policies
-- ============================================================================
-- The requester may cancel their own request only while it is still pending.
-- In RLS an UPDATE policy's USING clause reads the OLD row and WITH CHECK reads
-- the NEW row, so `status = 'pending'` (USING) plus `status = 'cancelled'`
-- (WITH CHECK) is a complete transition guard. The UPDATE column grant on
-- `status`/`responded_at` (section 9 of the base migration) already exists, so
-- no grant change is needed for the requester path.
-- `drop policy if exists` makes each statement restart-safe: `create policy`
-- aborts when the policy already exists, which could strand a resumed run.
drop policy if exists "tutor_requests_requester_cancel"
  on public.tutor_requests;

create policy "tutor_requests_requester_cancel"
  on public.tutor_requests for update
  to authenticated
  using (
    requester_id = auth.uid()
    and status = 'pending'::request_status
  )
  with check (
    requester_id = auth.uid()
    and status = 'cancelled'::request_status
  );

-- The old policy let any tutor party flip a request to any status. Replace it
-- with a strict `pending -> accepted|declined` one so a response can never be
-- rewritten or re-answered. Dropped by name so re-running is safe.
drop policy if exists "tutor_requests_tutor_update"
  on public.tutor_requests;
drop policy if exists "tutor_requests_tutor_respond"
  on public.tutor_requests;

create policy "tutor_requests_tutor_respond"
  on public.tutor_requests for update
  to authenticated
  using (
    owns_tutor_profile(tutor_id)
    and status = 'pending'::request_status
  )
  with check (
    owns_tutor_profile(tutor_id)
    and status in ('accepted'::request_status, 'declined'::request_status)
  );

-- ============================================================================
-- 3. bookings: write grants
-- ============================================================================
-- INSERT is per-column and deliberately excludes `status`, whose default of
-- 'confirmed' applies on every insert: a booking cannot be born cancelled or
-- completed, and only default-`created_at`/`id` fill the rest. UPDATE is granted
-- on `status` alone so a booking's agreed rate, times, parties and subject can
-- never be rewritten in place.
grant insert (request_id, tutor_id, requester_id, subject, starts_at, ends_at, agreed_rate, notes)
  on table public.bookings to authenticated;
grant update (status) on table public.bookings to authenticated;

-- ============================================================================
-- 4. bookings: write policies
-- ============================================================================
-- Either party may create the booking, but only while the underlying request is
-- accepted, and the booking's tutor/requester/subject triplet must match that
-- request exactly. `owns_tutor_profile(tutor_id)` binds the actor to the tutor
-- the request was addressed to, so an unrelated tutor cannot poach it. The
-- subquery is safe under RLS: every actor able to match the party clause is
-- also a party to the referenced request, so the select on tutor_requests
-- respects its own policies (same pattern as `reviews_requester_insert`).
drop policy if exists "bookings_insert_accepted_request"
  on public.bookings;

create policy "bookings_insert_accepted_request"
  on public.bookings for insert
  to authenticated
  with check (
    (requester_id = auth.uid() or owns_tutor_profile(tutor_id))
    and exists (
      select 1
      from public.tutor_requests r
      where r.id = bookings.request_id
        and r.status = 'accepted'::request_status
        and r.tutor_id = bookings.tutor_id
        and r.requester_id = bookings.requester_id
        and r.subject = bookings.subject
    )
  );

-- Confirmed bookings may be lowered to `cancelled` (either party) or
-- `completed` (tutor only). USING pins the old row to `confirmed` so a
-- completed or cancelled booking is immutable from the client, and the
-- status-only UPDATE grant means no other column can change at the same time.
drop policy if exists "bookings_state_changes"
  on public.bookings;

create policy "bookings_state_changes"
  on public.bookings for update
  to authenticated
  using (
    status = 'confirmed'::booking_status
    and (requester_id = auth.uid() or owns_tutor_profile(tutor_id))
  )
  with check (
    (requester_id = auth.uid() and status = 'cancelled'::booking_status)
    or (
      owns_tutor_profile(tutor_id)
      and status in ('cancelled'::booking_status, 'completed'::booking_status)
    )
  );