-- ============================================================
-- 0017 CLASS SUBJECT CATALOG
--
-- Separates:
--   1. Subjects belonging to a class
--   2. Teachers assigned to teach those subjects
--
-- CLASS TEACHERS can prepare results for every subject in
-- class_subjects, regardless of subject-teacher assignment.
--
-- Existing class_subject_teachers data is preserved.
-- ============================================================


-- ============================================================
-- 1. CREATE CLASS SUBJECTS
-- ============================================================

create table if not exists public.class_subjects (
  id uuid primary key default uuid_generate_v4(),

  school_id uuid not null
    references public.schools(id)
    on delete cascade,

  class_id uuid not null
    references public.classes(id)
    on delete cascade,

  subject_id uuid not null
    references public.subjects(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  constraint class_subjects_class_subject_key
    unique (class_id, subject_id)
);


-- ============================================================
-- 2. INDEXES
-- ============================================================

create index if not exists idx_class_subjects_class_id
  on public.class_subjects(class_id);

create index if not exists idx_class_subjects_subject_id
  on public.class_subjects(subject_id);

create index if not exists idx_class_subjects_school_id
  on public.class_subjects(school_id);


-- ============================================================
-- 3. ENABLE RLS
-- ============================================================

alter table public.class_subjects enable row level security;


-- ============================================================
-- 4. BASIC READ POLICY
--
-- Authenticated users can read class-subject relationships
-- belonging to their current school.
-- ============================================================

drop policy if exists class_subjects_select
on public.class_subjects;

create policy class_subjects_select
on public.class_subjects
for select
using (
  public.is_super_admin()
  or school_id = public.current_school_id()
);


-- ============================================================
-- 5. ADMIN WRITE POLICY
--
-- School owners/admins and super admins can manage the
-- class-subject catalog.
-- ============================================================

drop policy if exists class_subjects_insert
on public.class_subjects;

create policy class_subjects_insert
on public.class_subjects
for insert
with check (
  public.is_super_admin()
  or (
    school_id = public.current_school_id()
    and public.current_role_name() in ('school_owner', 'school_admin')
  )
);


drop policy if exists class_subjects_update
on public.class_subjects;

create policy class_subjects_update
on public.class_subjects
for update
using (
  public.is_super_admin()
  or (
    school_id = public.current_school_id()
    and public.current_role_name() in ('school_owner', 'school_admin')
  )
)
with check (
  public.is_super_admin()
  or (
    school_id = public.current_school_id()
    and public.current_role_name() in ('school_owner', 'school_admin')
  )
);


drop policy if exists class_subjects_delete
on public.class_subjects;

create policy class_subjects_delete
on public.class_subjects
for delete
using (
  public.is_super_admin()
  or (
    school_id = public.current_school_id()
    and public.current_role_name() in ('school_owner', 'school_admin')
  )
);


-- ============================================================
-- 6. MIGRATE EXISTING CLASS/SUBJECT RELATIONSHIPS
--
-- Every existing class_subject_teachers row already tells us
-- that the subject belongs to that class.
--
-- We copy those relationships into class_subjects.
--
-- Existing teacher assignments are NOT changed.
-- ============================================================

insert into public.class_subjects (
  school_id,
  class_id,
  subject_id
)
select distinct
  cst.school_id,
  cst.class_id,
  cst.subject_id
from public.class_subject_teachers cst
where not exists (
  select 1
  from public.class_subjects cs
  where cs.class_id = cst.class_id
    and cs.subject_id = cst.subject_id
);


-- ============================================================
-- 7. REPLACE SUBJECT DROPDOWN RPC
--
-- The class teacher now sees every subject belonging to the
-- selected class, not only subjects with a teacher assignment.
-- ============================================================

create or replace function public.get_my_result_subjects(
  p_class_id uuid
)
returns setof public.subjects
language sql
stable
security definer
set search_path = public
as $$

  select s.*
  from public.subjects s
  join public.class_subjects cs
    on cs.subject_id = s.id
  where cs.class_id = p_class_id
    and exists (
      select 1
      from public.classes c
      where c.id = p_class_id
        and c.class_teacher_id = auth.uid()
    )
  order by s.name;

$$;


grant execute on function public.get_my_result_subjects(uuid)
to authenticated;


-- ============================================================
-- 8. RESULT VALIDATION
--
-- A class teacher may enter results for ANY subject that
-- belongs to their class.
--
-- Subject-teacher assignment is NOT required.
-- ============================================================

create or replace function public.is_subject_for_class(
  p_class_id uuid,
  p_subject_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$

  select exists (
    select 1
    from public.class_subjects cs
    where cs.class_id = p_class_id
      and cs.subject_id = p_subject_id
  );

$$;


grant execute on function public.is_subject_for_class(uuid, uuid)
to authenticated;


-- ============================================================
-- 9. REBUILD RESULT INSERT POLICY
-- ============================================================

drop policy if exists result_scores_insert
on public.result_scores;

create policy result_scores_insert
on public.result_scores
for insert
with check (

  public.is_super_admin()

  or

  (
    school_id = public.current_school_id()
    and public.current_role_name() = 'teacher'
    and entered_by = auth.uid()
    and public.is_result_class_teacher(class_id)
    and public.is_subject_for_class(class_id, subject_id)
  )

  or

  public.current_role_name()
  in ('school_owner', 'school_admin')

);


-- ============================================================
-- 10. REBUILD RESULT UPDATE POLICY
-- ============================================================

drop policy if exists result_scores_update
on public.result_scores;

create policy result_scores_update
on public.result_scores
for update
using (

  public.is_super_admin()

  or

  (
    school_id = public.current_school_id()
    and public.current_role_name() = 'teacher'
    and entered_by = auth.uid()
    and status = 'draft'
    and public.is_result_class_teacher(class_id)
    and public.is_subject_for_class(class_id, subject_id)
  )

  or

  public.current_role_name()
  in ('school_owner', 'school_admin')

)
with check (

  public.is_super_admin()

  or

  (
    school_id = public.current_school_id()
    and public.current_role_name() = 'teacher'
    and entered_by = auth.uid()
    and public.is_result_class_teacher(class_id)
    and public.is_subject_for_class(class_id, subject_id)
  )

  or

  public.current_role_name()
  in ('school_owner', 'school_admin')

);


-- ============================================================
-- COMPLETE
-- ============================================================
