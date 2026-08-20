-- ============================================================
-- RESULT SUBJECT DROPDOWN RPC
-- Returns subjects available for a class teacher's class.
-- ============================================================


create or replace function public.get_my_result_subjects(
  p_class_id uuid
)
returns setof subjects
language sql
stable
as $$

  select s.*

  from subjects s

  join class_subject_teachers cst
    on cst.subject_id = s.id

  where cst.class_id = p_class_id

  order by s.name;

$$;


grant execute on function public.get_my_result_subjects(
  uuid
)
to authenticated;