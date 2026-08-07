-- =====================================================================
-- PHASE 2 — SUPER ADMIN MODULE
-- 1) Custom Access Token Hook: stamps role + school_id into the JWT
--    so the RLS policies from 0001 can actually resolve auth.school_id().
-- 2) register_school(): atomic signup for a new school + its owner.
-- 3) approve/suspend/activate/delete school: super-admin-only actions,
--    each writing an audit_logs row.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) CUSTOM ACCESS TOKEN HOOK
-- Register this function in Supabase Dashboard → Authentication → Hooks
-- → "Customize Access Token (JWT) Claims" → select
-- public.custom_access_token_hook. This cannot be wired up from SQL
-- alone; the dashboard step is required once per project.
-- ---------------------------------------------------------------------
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
    claims := jsonb_set(claims, '{role}', to_jsonb(v_role));
  end if;

  claims := jsonb_set(claims, '{school_id}',
    case when v_school_id is null then 'null'::jsonb else to_jsonb(v_school_id::text) end);

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- The hook runs as supabase_auth_admin; it needs read access to profiles.
grant usage on schema public to supabase_auth_admin;
grant select on public.profiles to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;

-- ---------------------------------------------------------------------
-- 2) SCHOOL REGISTRATION
-- Runs SECURITY DEFINER so a brand-new user (no school_id claim yet)
-- can create their school + owner profile in one atomic transaction,
-- without needing broad insert policies on schools/profiles.
-- ---------------------------------------------------------------------
create or replace function public.register_school(
  p_school_name text,
  p_school_email text,
  p_school_phone text,
  p_owner_full_name text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid;
  v_slug text;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in to register a school';
  end if;

  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'This account is already linked to a school';
  end if;

  v_slug := lower(regexp_replace(p_school_name, '[^a-zA-Z0-9]+', '-', 'g'))
            || '-' || substr(md5(random()::text), 1, 6);

  insert into schools (name, email, phone, slug, status)
  values (p_school_name, p_school_email, p_school_phone, v_slug, 'pending')
  returning id into v_school_id;

  insert into subscriptions (school_id, plan, status, starts_at, ends_at)
  values (v_school_id, 'trial', 'trial', now(), now() + interval '14 days');

  insert into profiles (id, school_id, role, full_name, email, status)
  values (auth.uid(), v_school_id, 'school_owner', p_owner_full_name, p_school_email, 'active');

  insert into audit_logs (school_id, actor_id, action, entity, entity_id)
  values (v_school_id, auth.uid(), 'school_registered', 'schools', v_school_id);

  return v_school_id;
end;
$$;

grant execute on function public.register_school to authenticated;

-- ---------------------------------------------------------------------
-- 3) SUPER-ADMIN SCHOOL LIFECYCLE ACTIONS
-- Each checks auth.is_super_admin() itself rather than relying only on
-- RLS, so the caller gets a clear error instead of a silent no-op.
-- ---------------------------------------------------------------------
create or replace function public.approve_school(p_school_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not auth.is_super_admin() then raise exception 'Not authorized'; end if;

  update schools set status = 'active', approved_at = now(), approved_by = auth.uid()
  where id = p_school_id;

  update subscriptions set status = 'active'
  where school_id = p_school_id and status = 'trial';

  insert into audit_logs (school_id, actor_id, action, entity, entity_id)
  values (p_school_id, auth.uid(), 'school_approved', 'schools', p_school_id);
end;
$$;

create or replace function public.suspend_school(p_school_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not auth.is_super_admin() then raise exception 'Not authorized'; end if;

  update schools set status = 'suspended' where id = p_school_id;
  update subscriptions set status = 'suspended' where school_id = p_school_id;

  insert into audit_logs (school_id, actor_id, action, entity, entity_id)
  values (p_school_id, auth.uid(), 'school_suspended', 'schools', p_school_id);
end;
$$;

create or replace function public.activate_school(p_school_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not auth.is_super_admin() then raise exception 'Not authorized'; end if;

  update schools set status = 'active' where id = p_school_id;
  update subscriptions set status = 'active' where school_id = p_school_id;

  insert into audit_logs (school_id, actor_id, action, entity, entity_id)
  values (p_school_id, auth.uid(), 'school_activated', 'schools', p_school_id);
end;
$$;

create or replace function public.delete_school(p_school_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not auth.is_super_admin() then raise exception 'Not authorized'; end if;

  insert into audit_logs (school_id, actor_id, action, entity, entity_id)
  values (p_school_id, auth.uid(), 'school_deleted', 'schools', p_school_id);

  delete from schools where id = p_school_id; -- cascades to all tenant tables
end;
$$;

grant execute on function public.approve_school, public.suspend_school,
  public.activate_school, public.delete_school to authenticated;

-- ---------------------------------------------------------------------
-- Bootstrap: the very first super_admin has no school to register
-- against, so it must be created by hand once (see PHASE_2 doc).
-- No RPC is provided for this on purpose — it should never be
-- self-service.
-- ---------------------------------------------------------------------
