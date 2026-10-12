-- TutorMatch IB - Admin console
--
-- STATUS: PREPARED. Apply after Stage B, Stage C and Stage C1 (this file is
-- ordered last by filename). Every statement is restart-safe, so a partial or
-- repeated run will not strand the migration.
--
-- Apply with (from TutorMatch_IB_Backend/):
--   supabase db push
-- or, against an explicit connection:
--   supabase db push --db-url "<postgres connection string>"
--
-- Why these statements exist:
--   * The base schema already lets an administrator READ everything: the
--     `is_admin()` helper backs `profiles_select_admin` and the `or is_admin()`
--     clauses on `tutor_requests_party_read` and `bookings_party_read`. What was
--     missing was any WRITE path, so an admin could see applications but not act
--     on them.
--   * `tutor_requests_admin_update` lets an administrator accept, decline or
--     cancel any application. The status/responded_at column grant already
--     exists from the base migration, so only a policy is needed.
--   * `bookings_admin_update` gives the administrator the same oversight of
--     sessions that the two parties already have.
--   * Verification of a tutor is a moderation decision. `is_verified` is
--     deliberately excluded from the tutor's own column grants, and Postgres
--     column grants are per-role (not per-policy), so `authenticated` cannot be
--     granted `is_verified` for admins only. The write is therefore funnelled
--     through the SECURITY DEFINER `admin_set_tutor_verified()` function, which
--     re-checks `is_admin()` for the caller before updating.
--
-- Preconditions: Stage C (booking write grants) is applied, since
-- `bookings_admin_update` relies on the `update (status)` grant it adds.

-- ============================================================================
-- 1. tutor_requests: administrators may manage any application
-- ============================================================================
-- `using (is_admin())` reads the OLD row, `with check (is_admin())` the NEW one,
-- so an administrator may move a request between any statuses. Non-admins never
-- match `is_admin()` and are unaffected by every existing party policy.
drop policy if exists "tutor_requests_admin_update"
  on public.tutor_requests;

create policy "tutor_requests_admin_update"
  on public.tutor_requests for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- 2. bookings: administrators may manage any session
-- ============================================================================
-- Rides on the Stage C `update (status)` grant. `is_admin()` on both sides keeps
-- the booking's parties, times and rate immutable to the administrator too.
drop policy if exists "bookings_admin_update"
  on public.bookings;

create policy "bookings_admin_update"
  on public.bookings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- 3. Tutor verification, re-checked inside the database
-- ============================================================================
-- SECURITY DEFINER so the update runs with the table owner's privileges and is
-- not limited by the calling role's column grants. The `is_admin()` guard is the
-- security boundary: a signed-in non-admin raises 42501 and the row is never
-- touched. `set search_path = ''` keeps the body independent of caller state.
create or replace function public.admin_set_tutor_verified(
  p_tutor_id uuid,
  p_verified boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator role required.'
      using errcode = '42501';
  end if;

  update public.tutor_profiles
    set is_verified = p_verified
    where id = p_tutor_id;

  return found;
end;
$$;

comment on function public.admin_set_tutor_verified(uuid, boolean) is
  'Sets tutor_profiles.is_verified for an administrator; refuses anyone else.';

revoke execute on function public.admin_set_tutor_verified(uuid, boolean)
  from public, anon;
grant execute on function public.admin_set_tutor_verified(uuid, boolean)
  to authenticated;

-- Verification (run after applying):
--   select policyname from pg_policies
--     where tablename in ('tutor_requests', 'bookings')
--       and policyname in ('tutor_requests_admin_update', 'bookings_admin_update');
--     -- expect 2 rows
--   select has_function_privilege(
--     'authenticated', 'public.admin_set_tutor_verified(uuid, boolean)', 'EXECUTE'
--   );  -- expect true
