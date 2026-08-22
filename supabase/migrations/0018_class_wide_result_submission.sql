-- =====================================================================
-- 0018 — CLASS-WIDE RESULT SUBMISSION
--
-- A class teacher may enter/save results subject-by-subject, but the
-- final submission is atomic for the entire class.
--
-- Submission is rejected unless:
--   1. The teacher is the class teacher.
--   2. The term belongs to the teacher's school.
--   3. The class has assigned subjects.
--   4. Every active pupil in the class has a result row for EVERY
--      subject assigned to the class.
--   5. All required result rows are still in draft/submittable state.
--
-- If validation passes, ALL class/term result rows are changed to
-- 'submitted' in one transaction.
-- =====================================================================

create or replace function public.submit_class_results(
  p_class_id uuid,
  p_term_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid := public.current_school_id();
  v_role text := public.current_role_name();

  v_subject_count integer;
  v_student_count integer;
  v_expected_rows integer;
  v_actual_rows integer;

  v_missing_subjects text;
begin

  ----------------------------------------------------------------------
  -- BASIC CONTEXT
  ----------------------------------------------------------------------

  if v_school_id is null then
    raise exception 'No school context on this session';
  end if;

  if v_role <> 'teacher' then
    raise exception 'Only teachers can submit class results';
  end if;

  ----------------------------------------------------------------------
  -- VERIFY CLASS TEACHER
  ----------------------------------------------------------------------

  if not exists (
    select 1
    from classes c
    where c.id = p_class_id
      and c.class_teacher_id = auth.uid()
  ) then
    raise exception 'You are not the class teacher for this class';
  end if;

  ----------------------------------------------------------------------
  -- VERIFY TERM BELONGS TO THIS SCHOOL
  ----------------------------------------------------------------------

  if not exists (
    select 1
    from terms t
    where t.id = p_term_id
      and t.school_id = v_school_id
  ) then
    raise exception 'Invalid academic term for this school';
  end if;

  ----------------------------------------------------------------------
  -- COUNT SUBJECTS ASSIGNED TO THIS CLASS
  --
  -- The class_subjects table is the class-specific curriculum mapping
  -- managed through the class subject catalog.
  ----------------------------------------------------------------------

  select count(*)
  into v_subject_count
  from class_subjects cs
  where cs.class_id = p_class_id;

  if v_subject_count = 0 then
    raise exception 'No subjects are assigned to this class';
  end if;

  ----------------------------------------------------------------------
  -- COUNT ACTIVE STUDENTS IN THE CLASS
  ----------------------------------------------------------------------

  select count(*)
  into v_student_count
  from students s
  where s.class_id = p_class_id
    and s.school_id = v_school_id
    and s.status = 'active';

  if v_student_count = 0 then
    raise exception 'There are no active pupils in this class';
  end if;

  ----------------------------------------------------------------------
  -- EVERY SUBJECT × EVERY STUDENT MUST HAVE A RESULT ROW
  ----------------------------------------------------------------------

  v_expected_rows :=
    v_subject_count * v_student_count;

  select count(*)
  into v_actual_rows
  from result_scores rs
  where rs.class_id = p_class_id
    and rs.term_id = p_term_id
    and rs.school_id = v_school_id
    and rs.subject_id in (
      select cs.subject_id
      from class_subjects cs
      where cs.class_id = p_class_id
    )
    and rs.student_id in (
      select s.id
      from students s
      where s.class_id = p_class_id
        and s.school_id = v_school_id
        and s.status = 'active'
    );

  if v_actual_rows <> v_expected_rows then

    select string_agg(
      s.name,
      ', '
      order by s.name
    )
    into v_missing_subjects
    from subjects s
    join class_subjects cs
      on cs.subject_id = s.id
    where cs.class_id = p_class_id
      and exists (
        select 1
        from students st
        where st.class_id = p_class_id
          and st.school_id = v_school_id
          and st.status = 'active'
          and not exists (
            select 1
            from result_scores rs
            where rs.class_id = p_class_id
              and rs.term_id = p_term_id
              and rs.school_id = v_school_id
              and rs.subject_id = s.id
              and rs.student_id = st.id
          )
      );

    raise exception
      'Cannot submit class results. Some subjects are incomplete: %',
      coalesce(v_missing_subjects, 'one or more subjects');
  end if;

  ----------------------------------------------------------------------
  -- VERIFY THAT ALL REQUIRED ROWS ARE STILL SUBMITTABLE
  ----------------------------------------------------------------------

  if exists (
    select 1
    from result_scores rs
    where rs.class_id = p_class_id
      and rs.term_id = p_term_id
      and rs.school_id = v_school_id
      and rs.subject_id in (
        select cs.subject_id
        from class_subjects cs
        where cs.class_id = p_class_id
      )
      and rs.student_id in (
        select s.id
        from students s
        where s.class_id = p_class_id
          and s.school_id = v_school_id
          and s.status = 'active'
      )
      and rs.status not in ('draft')
  ) then
    raise exception
      'Some results have already been submitted or approved';
  end if;

  ----------------------------------------------------------------------
  -- ATOMIC CLASS-WIDE SUBMISSION
  ----------------------------------------------------------------------

  update result_scores
  set status = 'submitted'
  where class_id = p_class_id
    and term_id = p_term_id
    and school_id = v_school_id
    and subject_id in (
      select cs.subject_id
      from class_subjects cs
      where cs.class_id = p_class_id
    )
    and student_id in (
      select s.id
      from students s
      where s.class_id = p_class_id
        and s.school_id = v_school_id
        and s.status = 'active'
    );

  ----------------------------------------------------------------------
  -- AUDIT
  ----------------------------------------------------------------------

  insert into audit_logs (
    school_id,
    actor_id,
    action,
    entity,
    entity_id
  )
  values (
    v_school_id,
    auth.uid(),
    'results_class_submitted',
    'result_scores',
    p_class_id
  );

end;
$$;

grant execute on function public.submit_class_results(uuid, uuid)
to authenticated;
