-- =====================================================================
-- PHASE 14 — GLOBAL PLATFORM LOGO
--
-- This is the School ERP platform logo.
--
-- IMPORTANT:
-- This is NOT tenant/school branding.
-- School owners/admins continue to manage their own school branding
-- separately through the existing Branding page.
--
-- The platform logo is global and is used by:
--   - Login page
--   - Application sidebar
--   - Other platform-level UI
--
-- Only super_admin users may upload/change it.
-- All users and unauthenticated visitors may read the active logo.
-- =====================================================================


-- ---------------------------------------------------------------------
-- PLATFORM SETTINGS TABLE
-- ---------------------------------------------------------------------

create table if not exists public.platform_settings (
  id uuid primary key default gen_random_uuid(),

  platform_name text not null default 'School ERP',

  logo_path text null,

  logo_url text null,

  updated_at timestamptz not null default now(),

  updated_by uuid null references auth.users(id)
);


-- ---------------------------------------------------------------------
-- ENSURE THERE IS ONLY ONE PLATFORM SETTINGS RECORD
-- ---------------------------------------------------------------------

insert into public.platform_settings (
  id,
  platform_name
)
values (
  '00000000-0000-0000-0000-000000000001',
  'School ERP'
)
on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY
-- ---------------------------------------------------------------------

alter table public.platform_settings enable row level security;


-- ---------------------------------------------------------------------
-- REMOVE OLD POLICIES IF THIS MIGRATION IS RE-RUN
-- ---------------------------------------------------------------------

drop policy if exists platform_settings_public_read
on public.platform_settings;

drop policy if exists platform_settings_super_admin_update
on public.platform_settings;


-- ---------------------------------------------------------------------
-- PUBLIC READ
--
-- The login page is available before authentication, so the platform
-- logo must be readable by anonymous visitors as well as authenticated
-- users.
-- ---------------------------------------------------------------------

create policy platform_settings_public_read
on public.platform_settings
for select
to anon, authenticated
using (true);


-- ---------------------------------------------------------------------
-- SUPER ADMIN UPDATE
--
-- Only users whose profile role is super_admin may change the platform
-- logo settings.
-- ---------------------------------------------------------------------

create policy platform_settings_super_admin_update
on public.platform_settings
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'
      and p.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'
      and p.status = 'active'
  )
);


-- ---------------------------------------------------------------------
-- STORAGE BUCKET
--
-- Public because the login page must display the logo before login.
-- Only the database/storage policies below allow super_admin users
-- to upload or replace files.
-- ---------------------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'platform-assets',
  'platform-assets',
  true
)
on conflict (id) do update
set public = true;


-- ---------------------------------------------------------------------
-- REMOVE OLD STORAGE POLICIES IF THIS MIGRATION IS RE-RUN
-- ---------------------------------------------------------------------

drop policy if exists platform_assets_public_read
on storage.objects;

drop policy if exists platform_assets_super_admin_insert
on storage.objects;

drop policy if exists platform_assets_super_admin_update
on storage.objects;

drop policy if exists platform_assets_super_admin_delete
on storage.objects;


-- ---------------------------------------------------------------------
-- PUBLIC READ OF PLATFORM LOGO
-- ---------------------------------------------------------------------

create policy platform_assets_public_read
on storage.objects
for select
to public
using (
  bucket_id = 'platform-assets'
);


-- ---------------------------------------------------------------------
-- SUPER ADMIN INSERT
-- ---------------------------------------------------------------------

create policy platform_assets_super_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'platform-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'
      and p.status = 'active'
  )
);


-- ---------------------------------------------------------------------
-- SUPER ADMIN UPDATE
-- ---------------------------------------------------------------------

create policy platform_assets_super_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'platform-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'
      and p.status = 'active'
  )
)
with check (
  bucket_id = 'platform-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'
      and p.status = 'active'
  )
);


-- ---------------------------------------------------------------------
-- SUPER ADMIN DELETE
-- ---------------------------------------------------------------------

create policy platform_assets_super_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'platform-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'
      and p.status = 'active'
  )
);


-- ---------------------------------------------------------------------
-- UPDATED_AT TRIGGER
-- ---------------------------------------------------------------------

create or replace function public.set_platform_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();

  return new;
end;
$$;


drop trigger if exists platform_settings_updated_at
on public.platform_settings;


create trigger platform_settings_updated_at
before update on public.platform_settings
for each row
execute function public.set_platform_settings_updated_at();


-- ---------------------------------------------------------------------
-- PUBLIC FUNCTION
--
-- This gives the frontend one simple function to retrieve the active
-- platform logo without exposing unnecessary platform settings.
-- ---------------------------------------------------------------------

create or replace function public.get_platform_logo()
returns table (
  platform_name text,
  logo_path text,
  logo_url text
)
language sql
security definer
set search_path = public
as $$
  select
    ps.platform_name,
    ps.logo_path,
    ps.logo_url
  from public.platform_settings ps
  where ps.id = '00000000-0000-0000-0000-000000000001';
$$;


-- ---------------------------------------------------------------------
-- ALLOW BOTH LOGGED-IN AND LOGGED-OUT USERS TO READ THE LOGO
-- ---------------------------------------------------------------------

grant execute
on function public.get_platform_logo()
to anon, authenticated;


-- ---------------------------------------------------------------------
-- COMMENTS
-- ---------------------------------------------------------------------

comment on table public.platform_settings is
'Global School ERP platform settings. Separate from tenant school branding.';

comment on column public.platform_settings.logo_path is
'Storage path for the global School ERP platform logo.';

comment on column public.platform_settings.logo_url is
'Public URL for the global School ERP platform logo.';