-- =====================================================================
-- PHASE 9 — CRITICAL FIX: JWT "role" claim collision with PostgREST
--
-- PostgREST reserves the JWT's top-level "role" claim to decide which
-- actual Postgres database role to SET ROLE to for each request — it
-- expects "authenticated", "anon", or "service_role", the built-in
-- Postgres roles Supabase creates. custom_access_token_hook() was
-- overwriting that same claim with the app's role values instead
-- ("super_admin", "teacher", "parent"...). Since no Postgres database
-- role literally named "super_admin" exists, PostgREST's own
-- `SET ROLE super_admin` failed before any RLS policy ever ran —
-- breaking every authenticated request, for every user, regardless
-- of which API key was used. This explains every 401 seen so far.
--
-- Fix: app-level role now goes in a separate claim, "user_role",
-- leaving PostgREST's own "role" claim untouched.
-- =====================================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claims jsonb;
  v_role text;
  v_school_id uuid;
begin
  select role, school_id into v_role, v_school_id
  from public.profiles
  where id = (event->>'user_id')::uuid;

  claims := coalesce(event->'claims', '{}'::jsonb);

  if v_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role));
  end if;

  claims := jsonb_set(claims, '{school_id}',
    case when v_school_id is null then 'null'::jsonb else to_jsonb(v_school_id::text) end);

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

create or replace function public.current_role_name() returns text
language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'user_role')
$$;

-- current_school_id() and is_super_admin() are unaffected — they
-- either read a different claim already, or call current_role_name()
-- internally and pick up this fix automatically.
