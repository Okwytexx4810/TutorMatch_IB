-- TutorMatch IB - backfill profiles for pre-existing auth accounts
--
-- Why this exists: accounts created before 20260103000000_initial_schema.sql have
-- no `profiles` row, because `handle_new_user()` did not exist yet. Without a
-- backfill those users authenticate successfully but have no trusted role, so
-- `requireRole()` would deny them every protected route.
--
-- Runs after the schema migration and is idempotent: re-running inserts nothing,
-- because the NOT EXISTS guard skips users who already have a profile.
--
-- It deliberately does NOT promote anyone to admin, even when their metadata
-- claims it. Admin is granted out of band, by a human, after review.

insert into public.profiles (id, email, full_name, role)
select
  u.id,
  u.email,
  coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Member'
  ),
  case
    when u.raw_user_meta_data ->> 'role' in ('student', 'parent', 'tutor')
      then (u.raw_user_meta_data ->> 'role')::public.user_role
    else 'student'::public.user_role
  end
from auth.users u
-- `profiles.email` is NOT NULL UNIQUE. This project is email/password only, so
-- every real account has one; the filter just keeps a hypothetical phone-only
-- account from aborting the whole backfill.
where u.email is not null
  and not exists (
    select 1 from public.profiles p where p.id = u.id
  );

-- Verification query, run manually after applying:
--
--   select count(*) as users_without_profile
--   from auth.users u
--   where u.email is not null
--     and not exists (select 1 from public.profiles p where p.id = u.id);
--
-- Expected result: 0.
--
-- Granting the first administrator, never from user metadata:
--
--   update public.profiles set role = 'admin' where id = '<user uuid>';
--
-- Note that `anon` holds no UPDATE privilege on `profiles.role` (see the grants
-- section of the schema migration), so this cannot be done through the client
-- API by any account, including an existing one.