-- =====================================================================
-- PHASE 10 — SHARED CURRICULUM
-- Classes, subjects, and lesson notes become platform-wide content:
-- only the super_admin can create/edit/delete them, and every school
-- automatically sees the same ones. This is a deliberate, explicit
-- exception to the "data isolation is mandatory" rule that governs
-- everything else in this app — it applies ONLY to these three
-- tables. Students, staff, attendance, and results remain fully
-- isolated per school; nothing about that changes here.
-- =====================================================================

-- ---------------------------------------------------------------------
-- CLASSES — drop the per-school ownership, make it global.
-- ---------------------------------------------------------------------
alter table classes alter column school_id drop not null;
update classes set school_id = null;

alter table classes drop constraint if exists classes_school_id_name_arm_key;
alter table classes add constraint classes_name_arm_key unique (name, arm);

drop policy if exists classes_select on classes;
drop policy if exists classes_admin_write on classes;
drop policy if exists classes_admin_update on classes;
drop policy if exists classes_admin_delete on classes;

create policy classes_select on classes for select using (true);
create policy classes_super_admin_write on classes for insert with check (public.is_super_admin());
create policy classes_super_admin_update on classes for update using (public.is_super_admin());
create policy classes_super_admin_delete on classes for delete using (public.is_super_admin());

-- A teacher's own dropdown ("my classes" for attendance/results entry)
-- can no longer rely on SELECT-level RLS to narrow the list, since
-- SELECT is now open to everyone. This RPC does that narrowing
-- explicitly instead.
create or replace function public.get_my_teaching_classes() returns setof classes
language sql stable as $$
  select c.* from classes c
  where c.class_teacher_id = auth.uid()
     or exists (select 1 from class_subject_teachers cst where cst.class_id = c.id and cst.teacher_id = auth.uid());
$$;
grant execute on function public.get_my_teaching_classes to authenticated;

-- ---------------------------------------------------------------------
-- SUBJECTS — same treatment.
-- ---------------------------------------------------------------------
alter table subjects alter column school_id drop not null;
update subjects set school_id = null;

alter table subjects drop constraint if exists subjects_school_id_name_key;
alter table subjects add constraint subjects_name_key unique (name);

drop policy if exists tenant_isolation_select on subjects;
drop policy if exists tenant_isolation_write on subjects;
drop policy if exists tenant_isolation_update on subjects;
drop policy if exists tenant_isolation_delete on subjects;

create policy subjects_select on subjects for select using (true);
create policy subjects_super_admin_write on subjects for insert with check (public.is_super_admin());
create policy subjects_super_admin_update on subjects for update using (public.is_super_admin());
create policy subjects_super_admin_delete on subjects for delete using (public.is_super_admin());

-- ---------------------------------------------------------------------
-- LESSON_NOTES — global too. session_id/term_id are tenant-scoped
-- tables (each school has its own sessions/terms), which doesn't fit
-- a genuinely shared note — made nullable so a global note doesn't
-- need to pick one school's arbitrary term.
-- ---------------------------------------------------------------------
alter table lesson_notes alter column school_id drop not null;
alter table lesson_notes alter column session_id drop not null;
alter table lesson_notes alter column term_id drop not null;
update lesson_notes set school_id = null;

drop policy if exists lesson_notes_select on lesson_notes;
drop policy if exists lesson_notes_write on lesson_notes;
drop policy if exists lesson_notes_update on lesson_notes;
drop policy if exists lesson_notes_delete on lesson_notes;

create policy lesson_notes_select on lesson_notes for select using (true);
create policy lesson_notes_super_admin_write on lesson_notes for insert with check (public.is_super_admin());
create policy lesson_notes_super_admin_update on lesson_notes for update using (public.is_super_admin());
create policy lesson_notes_super_admin_delete on lesson_notes for delete using (public.is_super_admin());

-- lesson-notes storage bucket (Phase 4) was keyed by {school_id}/...
-- for tenant isolation. Global notes now upload under a fixed
-- "global/" prefix instead — update the storage policies to match.
drop policy if exists tenant_storage_select on storage.objects;
drop policy if exists tenant_storage_insert on storage.objects;
drop policy if exists tenant_storage_delete on storage.objects;

create policy lesson_note_files_select on storage.objects for select using (
  bucket_id = 'lesson-notes'
);
create policy lesson_note_files_write on storage.objects for insert with check (
  bucket_id = 'lesson-notes' and public.is_super_admin()
);
create policy lesson_note_files_delete on storage.objects for delete using (
  bucket_id = 'lesson-notes' and public.is_super_admin()
);

-- school-activities and passports buckets shared the old tenant_storage_*
-- policies with lesson-notes (Phase 4) — restore their own tenant-scoped
-- policies now that lesson-notes has split off with different rules.
create policy tenant_storage_select on storage.objects for select using (
  bucket_id in ('school-activities','passports') and (
    public.is_super_admin() or (storage.foldername(name))[1] = public.current_school_id()::text
  )
);
create policy tenant_storage_insert on storage.objects for insert with check (
  bucket_id in ('school-activities','passports') and (
    public.is_super_admin() or (storage.foldername(name))[1] = public.current_school_id()::text
  )
);
create policy tenant_storage_delete on storage.objects for delete using (
  bucket_id in ('school-activities','passports') and (
    public.is_super_admin() or (storage.foldername(name))[1] = public.current_school_id()::text
  )
);
