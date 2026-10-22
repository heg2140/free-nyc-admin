-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It is safe to run more than once.

-- 1. The superadmin flag. Everyone starts as a regular user.
alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;

-- 2. Nobody can make themselves a superadmin through the app or the public API.
--    Requests from the website run as the "anon" or "authenticated" role, so any
--    change they try to make to is_superadmin is thrown away. The SQL Editor runs
--    as the database owner, so it can still change the flag (see step 6).
create or replace function public.protect_is_superadmin()
returns trigger
language plpgsql
as $$
begin
  if auth.role() in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.is_superadmin := false;
    else
      new.is_superadmin := old.is_superadmin;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_is_superadmin on public.profiles;
create trigger protect_is_superadmin
  before insert or update on public.profiles
  for each row execute function public.protect_is_superadmin();

-- 3. Helper used by the policies below. "security definer" lets it read the
--    caller's own profile row without tripping over the profiles policies.
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_superadmin from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_superadmin() from public;
grant execute on function public.is_superadmin() to anon, authenticated;

-- 4. Extra row-level security policies for superadmins. These are added on
--    top of the main app's existing policies (Postgres ORs them together),
--    so regular users keep exactly the access they had before.
drop policy if exists "Superadmins can read all profiles" on public.profiles;
create policy "Superadmins can read all profiles"
  on public.profiles for select to authenticated
  using (public.is_superadmin());

drop policy if exists "Superadmins can read all generations" on public.generations;
create policy "Superadmins can read all generations"
  on public.generations for select to authenticated
  using (public.is_superadmin());

drop policy if exists "Superadmins can read all suggestions" on public.suggestions;
create policy "Superadmins can read all suggestions"
  on public.suggestions for select to authenticated
  using (public.is_superadmin());

drop policy if exists "Superadmins can create suggestions" on public.suggestions;
create policy "Superadmins can create suggestions"
  on public.suggestions for insert to authenticated
  with check (public.is_superadmin());

drop policy if exists "Superadmins can update suggestions" on public.suggestions;
create policy "Superadmins can update suggestions"
  on public.suggestions for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "Superadmins can delete suggestions" on public.suggestions;
create policy "Superadmins can delete suggestions"
  on public.suggestions for delete to authenticated
  using (public.is_superadmin());

drop policy if exists "Superadmins can read all votes" on public.votes;
create policy "Superadmins can read all votes"
  on public.votes for select to authenticated
  using (public.is_superadmin());

-- 5. Schema tweaks the admin area needs:
--    - Suggestions an admin writes by hand don't come from an AI search, so
--      they have no generation.
--    - Deleting a suggestion also deletes its votes (otherwise the delete is
--      blocked by the votes -> suggestions foreign key).
alter table public.suggestions alter column generation_id drop not null;

do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.votes'::regclass
      and confrelid = 'public.suggestions'::regclass
      and contype = 'f'
  loop
    execute format('alter table public.votes drop constraint %I', c.conname);
  end loop;
  alter table public.votes
    add constraint votes_suggestion_id_fkey
    foreign key (suggestion_id) references public.suggestions (id)
    on delete cascade;
end;
$$;

-- Account emails and sign-in dates live in auth.users, which the website can't
-- read. This returns them only when the caller is a superadmin.
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id, u.email::text, u.created_at, u.last_sign_in_at
  from auth.users u
  where public.is_superadmin();
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

-- 6. Make yourself the first superadmin (this is how you avoid locking
--    yourself out). Replace the email with the Google account you sign in
--    with, then run this line. To add more admins later, run it again with
--    their email.
--
-- update public.profiles
--   set is_superadmin = true
--   where id = (select id from auth.users where email = 'you@example.com');
