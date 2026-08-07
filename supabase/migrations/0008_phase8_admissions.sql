-- =====================================================================
-- PHASE 8 — ONLINE ADMISSIONS
-- The one module from the original brief with no code behind it until
-- now. The defining difference from every other module: the applicant
-- is NOT authenticated. Every other table in this app assumes a
-- logged-in user with a school_id JWT claim; here we need narrow,
-- explicit anon-role policies instead.
-- =====================================================================

alter table admission_applications add column if not exists student_id uuid references students(id);
alter table admission_applications add column if not exists review_notes text;

-- ---------------------------------------------------------------------
-- PUBLIC READ HELPERS (SECURITY DEFINER, granted to anon)
-- An unauthenticated applicant can't read `schools` or `classes`
-- directly — RLS on those tables requires a school_id JWT claim that
-- doesn't exist without a session. These two functions expose the
-- minimum needed for the public application form: which school they're
-- applying to (by slug) and which classes it offers — nothing else.
-- ---------------------------------------------------------------------
create or replace function public.get_school_by_slug(p_slug text)
returns table(id uuid, name text, logo_url text, brand_primary_color text, motto text)
language sql stable security definer set search_path = public as $$
  select id, name, logo_url, brand_primary_color, motto from schools where slug = p_slug and status = 'active';
$$;
grant execute on function public.get_school_by_slug to anon, authenticated;

create or replace function public.get_public_school_classes(p_school_id uuid)
returns table(id uuid, name text, arm text)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.arm from classes c
  join schools sc on sc.id = c.school_id
  where c.school_id = p_school_id and sc.status = 'active';
$$;
grant execute on function public.get_public_school_classes to anon, authenticated;

-- ---------------------------------------------------------------------
-- ADMISSION_APPLICATIONS — replace Phase 1's blanket policy. Anonymous
-- applicants may INSERT only (never read other applications — that
-- would leak every applicant's contact details to any visitor).
-- Reading/reviewing is admin/principal/VP only.
-- ---------------------------------------------------------------------
drop policy if exists tenant_isolation_select on admission_applications;
drop policy if exists tenant_isolation_write on admission_applications;
drop policy if exists tenant_isolation_update on admission_applications;
drop policy if exists tenant_isolation_delete on admission_applications;

grant insert on public.admission_applications to anon;

create policy admissions_public_insert on admission_applications for insert to anon with check (
  exists (select 1 from schools sc where sc.id = school_id and sc.status = 'active')
);
create policy admissions_authenticated_insert on admission_applications for insert to authenticated with check (
  school_id = auth.school_id() and auth.role_name() in ('school_owner','school_admin')
);
create policy admissions_select on admission_applications for select using (
  auth.is_super_admin() or (school_id = auth.school_id() and auth.role_name() in
    ('school_owner','school_admin','principal','vice_principal'))
);
create policy admissions_update on admission_applications for update using (
  auth.is_super_admin() or (school_id = auth.school_id() and auth.role_name() in ('school_owner','school_admin')));
create policy admissions_delete on admission_applications for delete using (
  auth.is_super_admin() or (school_id = auth.school_id() and auth.role_name() in ('school_owner','school_admin')));

-- ---------------------------------------------------------------------
-- REVIEW WORKFLOW
-- approve_application() creates the actual student record and
-- generates the admission number through the SAME counter
-- (`next_counter`, 'admission') that direct student creation uses in
-- Phase 3 — one numbering sequence per school, not two competing ones.
-- ---------------------------------------------------------------------
create or replace function public.approve_application(
  p_application_id uuid, p_class_id uuid, p_session_id uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_school_id uuid := auth.school_id();
  v_app admission_applications;
  v_student_id uuid;
  v_seq integer;
  v_admission_number text;
begin
  if auth.role_name() not in ('school_owner','school_admin') then raise exception 'Not authorized'; end if;

  select * into v_app from admission_applications where id = p_application_id and school_id = v_school_id;
  if not found then raise exception 'Application not found'; end if;
  if v_app.status = 'approved' then raise exception 'Already approved'; end if;

  v_seq := next_counter(v_school_id, 'admission');
  v_admission_number := 'STU/' || to_char(now(), 'YYYY') || '/' || lpad(v_seq::text, 6, '0');

  insert into students (
    school_id, admission_number, student_id_code, full_name, date_of_birth,
    gender, class_id, session_id, status, passport_url
  ) values (
    v_school_id, v_admission_number, v_admission_number, v_app.applicant_name, v_app.date_of_birth,
    v_app.gender, p_class_id, p_session_id, 'active', v_app.passport_url
  ) returning id into v_student_id;

  update admission_applications
    set status = 'approved', admission_number = v_admission_number, student_id = v_student_id, reviewed_by = auth.uid()
  where id = p_application_id;

  insert into audit_logs (school_id, actor_id, action, entity, entity_id)
  values (v_school_id, auth.uid(), 'application_approved', 'admission_applications', p_application_id);

  return v_student_id;
end;
$$;
grant execute on function public.approve_application to authenticated;

create or replace function public.reject_application(p_application_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.role_name() not in ('school_owner','school_admin') then raise exception 'Not authorized'; end if;

  update admission_applications set status = 'rejected', review_notes = p_reason, reviewed_by = auth.uid()
  where id = p_application_id and school_id = auth.school_id();

  insert into audit_logs (school_id, actor_id, action, entity, entity_id)
  values (auth.school_id(), auth.uid(), 'application_rejected', 'admission_applications', p_application_id);
end;
$$;
grant execute on function public.reject_application to authenticated;

-- ---------------------------------------------------------------------
-- STORAGE: admission-uploads is private (applicant passports/documents
-- are sensitive) but must accept anonymous writes — the applicant has
-- no account. Anonymous INSERT is scoped to an active school's folder;
-- only that school's admins (or super admin) can ever read or delete.
-- No anon SELECT policy exists at all, so an applicant can't enumerate
-- or view other applicants' uploads even by guessing a path.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('admission-uploads', 'admission-uploads', false)
  on conflict (id) do nothing;

create policy admission_uploads_public_insert on storage.objects for insert to anon with check (
  bucket_id = 'admission-uploads' and exists (
    select 1 from schools sc where sc.id::text = (storage.foldername(name))[1] and sc.status = 'active'
  )
);
create policy admission_uploads_admin_select on storage.objects for select using (
  bucket_id = 'admission-uploads' and (
    auth.is_super_admin() or (
      (storage.foldername(name))[1] = auth.school_id()::text
      and auth.role_name() in ('school_owner','school_admin','principal','vice_principal')
    )
  )
);
create policy admission_uploads_admin_delete on storage.objects for delete using (
  bucket_id = 'admission-uploads' and (
    auth.is_super_admin() or (
      (storage.foldername(name))[1] = auth.school_id()::text and auth.role_name() in ('school_owner','school_admin')
    )
  )
);
