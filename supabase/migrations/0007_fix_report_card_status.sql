-- Fix result_status enum vs text[] comparison in get_report_card()

create or replace function public.get_report_card(
  p_student_id uuid,
  p_term_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid := public.current_school_id();
  v_class_id uuid;
  v_result jsonb;
  v_position integer;
  v_class_size integer;
  v_comments jsonb;
begin
  select class_id
  into v_class_id
  from students
  where id = p_student_id
    and school_id = v_school_id;

  if v_class_id is null then
    raise exception 'Student not found';
  end if;

  if not (
    public.is_super_admin()
    or public.current_role_name() in (
      'school_owner',
      'school_admin',
      'principal',
      'vice_principal'
    )
    or (
      public.current_role_name() = 'teacher'
      and is_class_teacher(v_class_id)
    )
    or (
      public.current_role_name() = 'parent'
      and is_guardian_of_student(p_student_id)
    )
    or (
      public.current_role_name() = 'student'
      and is_own_student_record(p_student_id)
    )
  ) then
    raise exception 'Not authorized';
  end if;

  with visible_scope as (
    select case
      when public.current_role_name() in (
        'school_owner',
        'school_admin',
        'principal',
        'vice_principal'
      )
      or public.is_super_admin()
      or (
        public.current_role_name() = 'teacher'
        and is_class_teacher(v_class_id)
      )
      then array[
        'draft'::result_status,
        'submitted'::result_status,
        'approved'::result_status,
        'published'::result_status
      ]
      else array[
        'published'::result_status
      ]
    end as statuses
  ),
  class_totals as (
    select
      rs.student_id,
      sum(rs.total_score) as total
    from result_scores rs, visible_scope
    where rs.class_id = v_class_id
      and rs.term_id = p_term_id
      and rs.status = any(visible_scope.statuses)
    group by rs.student_id
  ),
  ranked as (
    select
      student_id,
      total,
      rank() over (order by total desc) as pos,
      count(*) over () as class_size
    from class_totals
  )
  select
    pos,
    class_size
  into
    v_position,
    v_class_size
  from ranked
  where student_id = p_student_id;

  select jsonb_agg(
    jsonb_build_object(
      'subject', sub.name,
      'assignment', rs.assignment_score,
      'classwork', rs.classwork_score,
      'ca', rs.ca_score,
      'exam', rs.exam_score,
      'total', rs.total_score,
      'grade', rs.grade,
      'teacher_comment', rs.teacher_comment,
      'status', rs.status
    )
  )
  into v_result
  from result_scores rs
  join subjects sub
    on sub.id = rs.subject_id
  , visible_scope
  where rs.student_id = p_student_id
    and rs.term_id = p_term_id
    and rs.status = any(visible_scope.statuses);

  select jsonb_build_object(
    'principal_comment', principal_comment,
    'class_teacher_comment', class_teacher_comment
  )
  into v_comments
  from report_card_comments
  where student_id = p_student_id
    and term_id = p_term_id;

  return jsonb_build_object(
    'subjects', coalesce(v_result, '[]'::jsonb),
    'position', v_position,
    'class_size', v_class_size,
    'comments', coalesce(v_comments, '{}'::jsonb)
  );
end;
$$;

grant execute on function public.get_report_card(uuid, uuid) to authenticated;