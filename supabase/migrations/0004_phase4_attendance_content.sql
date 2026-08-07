-- =====================================================================
-- PHASE 4 — ATTENDANCE, LESSON NOTES, ANNOUNCEMENTS, SCHOOL ACTIVITIES
--
-- Also fixes a gap left open since Phase 1: the original tenant_isolation_*
-- policies allowed ANY authenticated member of a school to write to ANY
-- tenant table — a student could technically update another student's
-- row, because "school_id = auth.school_id()" says nothing about role.
-- That was fine while only admins had UI to write anything, but Phase 4
-- gives teachers real write access (attendance, lesson notes), so this
-- is the right moment to replace the blanket policies on the tables
-- this phase touches with role-aware ones. Phase 5 will do the same for
-- result_scores when it's built.
-- =====================================================================

-- ---------------------------------------------------------------------
-- HELPER FUNCTIONS for role-scoped visibility
-- ---------------------------------------------------------------------
create or replace function public.is_teacher_of_class(p_class_id uuid) returns boolean
language sql stable as $$
  select exists (select 1 from classes c where c.id = p_class_id and c.class_teacher_id = auth.uid())
      or exists (select 1 from class_subject_teachers cst where cst.class_id = p_class_id and cst.teacher_id = auth.uid());
$$;

create or replace function public.is_guardian_of_student(p_student_id uuid) returns boolean
language sql stable as $$
  select exists (
    select 1 from student_guardians sg
    join guardians g on g.id = sg.guardian_id
    where sg.student_id = p_student_id and g.profile_id = auth.uid()
  );
$$;

create or replace function public.is_own_student_record(p_student_id uuid) returns boolean
language sql stable as $$
  select exists (select 1 from students s where s.id = p_student_id and s.profile_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- CLASSES — tighten select (role/assignment-aware); writes admin-only
-- ---------------------------------------------------------------------
drop policy if exists tenant_isolation_select on classes;
drop policy if exists tenant_isolation_write on classes;
drop policy if exists tenant_isolation_update on classes;
drop policy if exists tenant_isolation_delete on classes;

create policy classes_select on classes for select using (
  auth.is_super_admin() or (school_id = auth.school_id() and (
    auth.role_name() in ('school_owner','school_admin','principal','vice_principal','parent','student')
    or (auth.role_name() = 'teacher' and is_teacher_of_class(id))
  ))
);
create policy classes_admin_write on classes for insert with check (
  auth.is_super_admin() or (school_id = auth.school_id() and auth.role_name() in ('school_owner','school_admin')));
create policy classes_admin_update on classes for update using (
  auth.is_super_admin() or (school_id = auth.school_id() and auth.role_name() in ('school_owner','school_admin')));
create policy classes_admin_delete on classes for delete using (
  auth.is_super_admin() or (school_id = auth.school_id() and auth.role_name() in ('school_owner','school_admin')));

-- ---------------------------------------------------------------------
-- STUDENTS — teachers see only their own class(es); parents/students
-- see only their own record; writes stay admin-only.
-- ---------------------------------------------------------------------
drop policy if exists tenant_isolation_select on students;
drop policy if exists tenant_isolation_write on students;
drop policy if exists tenant_isolation_update on students;
drop policy if exists tenant_isolation_delete on students;

create policy students_select on students for select using (
  auth.is_super_admin() or (school_id = auth.school_id() and (
    auth.role_name() in ('school_owner','school_admin','principal','vice_principal')
    or (auth.role_name() = 'teacher' and class_id is not null and is_teacher_of_class(class_id))
    or (auth.role_name() = 'parent' and is_guardian_of_student(id))
    or (auth.role_name() = 'student' and is_own_student_record(id))
  ))
);
create policy students_admin_write on students for insert with check (
  auth.is_super_admin() or (school_id = auth.school_id() and auth.role_name() in ('school_owner','school_admin')));
create policy students_admin_update on students for update using (
  auth.is_super_admin() or (school_id = auth.school_id() and auth.role_name() in ('school_owner','school_admin')));
create policy students_admin_delete on students for delete using (
  auth.is_super_admin() or (school_id = auth.school_id() and auth.role_name() in ('school_owner','school_admin')));

-- ---------------------------------------------------------------------
-- ATTENDANCE_RECORDS — teachers write only for classes they teach;
-- parents/students read only their own child's/own record.
-- ---------------------------------------------------------------------
drop policy if exists tenant_isolation_select on attendance_records;
drop policy if exists tenant_isolation_write on attendance_records;
drop policy if exists tenant_isolation_update on attendance_records;
drop policy if exists tenant_isolation_delete on attendance_records;

create policy attendance_select on attendance_records for select using (
  auth.is_super_admin() or (school_id = auth.school_id() and (
    auth.role_name() in ('school_owner','school_admin','principal','vice_principal')
    or (auth.role_name() = 'teacher' and is_teacher_of_class(class_id))
    or (auth.role_name() = 'parent' and is_guardian_of_student(student_id))
    or (auth.role_name() = 'student' and is_own_student_record(student_id))
  ))
);
create policy attendance_write on attendance_records for insert with check (
  auth.is_super_admin() or (school_id = auth.school_id() and (
    auth.role_name() in ('school_owner','school_admin')
    or (auth.role_name() = 'teacher' and is_teacher_of_class(class_id))
  ))
);
create policy attendance_update on attendance_records for update using (
  auth.is_super_admin() or (school_id = auth.school_id() and (
    auth.role_name() in ('school_owner','school_admin')
    or (auth.role_name() = 'teacher' and is_teacher_of_class(class_id))
  ))
);
create policy attendance_admin_delete on attendance_records for delete using (
  auth.is_super_admin() or (school_id = auth.school_id() and auth.role_name() in ('school_owner','school_admin')));

-- Bulk mark, one call per (class, date) — atomic + audited, and
-- re-checks the teacher actually owns this class server-side.
create or replace function public.mark_attendance(
  p_class_id uuid, p_session_id uuid, p_term_id uuid, p_date date, p_records jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_school_id uuid := auth.school_id();
  v_role text := auth.role_name();
  r jsonb;
begin
  if v_school_id is null then raise exception 'No school context'; end if;
  if v_role not in ('teacher','school_admin','school_owner') then raise exception 'Not authorized'; end if;
  if v_role = 'teacher' and not is_teacher_of_class(p_class_id) then raise exception 'Not your class'; end if;

  for r in select * from jsonb_array_elements(p_records) loop
    insert into attendance_records (school_id, student_id, class_id, session_id, term_id, marked_by, date, status)
    values (v_school_id, (r->>'student_id')::uuid, p_class_id, p_session_id, p_term_id, auth.uid(), p_date, (r->>'status')::attendance_status)
    on conflict (student_id, date) do update
      set status = excluded.status, marked_by = excluded.marked_by, class_id = excluded.class_id;
  end loop;

  insert into audit_logs (school_id, actor_id, action, entity, metadata)
  values (v_school_id, auth.uid(), 'attendance_marked', 'attendance_records', jsonb_build_object('class_id', p_class_id, 'date', p_date));
end;
$$;
grant execute on function public.mark_attendance to authenticated;

-- ---------------------------------------------------------------------
-- LESSON_NOTES — visible to the whole school (matches the brief:
-- parents/students can view); only the owning teacher or an admin can
-- write/edit/delete a given note.
-- ---------------------------------------------------------------------
drop policy if exists tenant_isolation_select on lesson_notes;
drop policy if exists tenant_isolation_write on lesson_notes;
drop policy if exists tenant_isolation_update on lesson_notes;
drop policy if exists tenant_isolation_delete on lesson_notes;

create policy lesson_notes_select on lesson_notes for select using (
  auth.is_super_admin() or school_id = auth.school_id());
create policy lesson_notes_write on lesson_notes for insert with check (
  auth.is_super_admin() or (school_id = auth.school_id() and (
    auth.role_name() in ('school_owner','school_admin')
    or (auth.role_name() = 'teacher' and teacher_id = auth.uid() and is_teacher_of_class(class_id))
  ))
);
create policy lesson_notes_update on lesson_notes for update using (
  auth.is_super_admin() or (school_id = auth.school_id() and (
    auth.role_name() in ('school_owner','school_admin') or (auth.role_name() = 'teacher' and teacher_id = auth.uid())
  ))
);
create policy lesson_notes_delete on lesson_notes for delete using (
  auth.is_super_admin() or (school_id = auth.school_id() and (
    auth.role_name() in ('school_owner','school_admin') or (auth.role_name() = 'teacher' and teacher_id = auth.uid())
  ))
);

-- ---------------------------------------------------------------------
-- ANNOUNCEMENTS — read scoped by target_audience; write restricted to
-- admin/principal roles per the brief ("Administrators create announcements").
-- ---------------------------------------------------------------------
drop policy if exists tenant_isolation_select on announcements;
drop policy if exists tenant_isolation_write on announcements;
drop policy if exists tenant_isolation_update on announcements;
drop policy if exists tenant_isolation_delete on announcements;

create policy announcements_select on announcements for select using (
  auth.is_super_admin() or (school_id = auth.school_id() and (
    target_audience = 'everyone'
    or (target_audience = 'teachers' and auth.role_name() in ('teacher','vice_principal','principal','school_admin','school_owner'))
    or (target_audience = 'parents' and auth.role_name() = 'parent')
    or (target_audience = 'students' and auth.role_name() = 'student')
  ))
);
create policy announcements_write on announcements for insert with check (
  auth.is_super_admin() or (school_id = auth.school_id() and auth.role_name() in ('school_owner','school_admin','principal','vice_principal')));
create policy announcements_update on announcements for update using (
  auth.is_super_admin() or (school_id = auth.school_id() and auth.role_name() in ('school_owner','school_admin','principal','vice_principal')));
create policy announcements_delete on announcements for delete using (
  auth.is_super_admin() or (school_id = auth.school_id() and auth.role_name() in ('school_owner','school_admin','principal','vice_principal')));

-- ---------------------------------------------------------------------
-- SCHOOL_ACTIVITIES (gallery/videos) — everyone in school can view;
-- admin/teacher/principal can upload; uploader or admin can delete.
-- ---------------------------------------------------------------------
drop policy if exists tenant_isolation_select on school_activities;
drop policy if exists tenant_isolation_write on school_activities;
drop policy if exists tenant_isolation_update on school_activities;
drop policy if exists tenant_isolation_delete on school_activities;

create policy activities_select on school_activities for select using (
  auth.is_super_admin() or school_id = auth.school_id());
create policy activities_write on school_activities for insert with check (
  auth.is_super_admin() or (school_id = auth.school_id() and auth.role_name() in
    ('school_owner','school_admin','teacher','principal','vice_principal')));
create policy activities_delete on school_activities for delete using (
  auth.is_super_admin() or (school_id = auth.school_id() and (
    auth.role_name() in ('school_owner','school_admin') or uploaded_by = auth.uid()
  ))
);

-- =====================================================================
-- STORAGE — private buckets, tenant-isolated by folder convention:
-- every object path starts with "{school_id}/...". RLS on
-- storage.objects checks that prefix against auth.school_id(), the
-- same way every table above does.
-- =====================================================================
insert into storage.buckets (id, name, public) values ('lesson-notes', 'lesson-notes', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('school-activities', 'school-activities', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('passports', 'passports', false)
  on conflict (id) do nothing;

create policy tenant_storage_select on storage.objects for select using (
  bucket_id in ('lesson-notes','school-activities','passports') and (
    auth.is_super_admin() or (storage.foldername(name))[1] = auth.school_id()::text
  )
);
create policy tenant_storage_insert on storage.objects for insert with check (
  bucket_id in ('lesson-notes','school-activities','passports') and (
    auth.is_super_admin() or (storage.foldername(name))[1] = auth.school_id()::text
  )
);
create policy tenant_storage_delete on storage.objects for delete using (
  bucket_id in ('lesson-notes','school-activities','passports') and (
    auth.is_super_admin() or (storage.foldername(name))[1] = auth.school_id()::text
  )
);

-- Videos/photos are private (signed URLs, not public links) — matches
-- "school data isolation is mandatory" even for media, not just rows.
-- The frontend must request a signed URL (supabase.storage.from(...).createSignedUrl)
-- rather than a public URL when displaying activity media.
