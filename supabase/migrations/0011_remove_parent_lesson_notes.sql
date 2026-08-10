-- =====================================================================
-- PHASE 11 — REMOVE PARENT ACCESS TO LESSON NOTES
-- =====================================================================

drop policy if exists lesson_notes_select on lesson_notes;

create policy lesson_notes_select on lesson_notes
for select using (
  public.current_role_name() in (
    'super_admin',
    'school_owner',
    'school_admin',
    'principal',
    'vice_principal',
    'teacher',
    'student'
  )
);

drop policy if exists lesson_note_files_select on storage.objects;

create policy lesson_note_files_select on storage.objects
for select using (
  bucket_id = 'lesson-notes'
  and public.current_role_name() in (
    'super_admin',
    'school_owner',
    'school_admin',
    'principal',
    'vice_principal',
    'teacher',
    'student'
  )
);
