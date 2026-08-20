-- ============================================================
-- RESULT WORKFLOW SECURITY UPDATE
-- Only class teachers can submit results.
-- ============================================================

create or replace function public.submit_results(
  p_class_id uuid,
  p_subject_id uuid,
  p_term_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin

  if public.current_role_name() != 'teacher'
     or not public.is_result_class_teacher(p_class_id)
  then
    raise exception 'Not authorized';
  end if;


  update result_scores
  set status = 'submitted'
  where class_id = p_class_id
    and subject_id = p_subject_id
    and term_id = p_term_id
    and entered_by = auth.uid()
    and status = 'draft';


  insert into audit_logs
  (
    school_id,
    actor_id,
    action,
    entity,
    metadata
  )
  values
  (
    public.current_school_id(),
    auth.uid(),
    'results_submitted',
    'result_scores',
    jsonb_build_object(
      'class_id', p_class_id,
      'subject_id', p_subject_id,
      'term_id', p_term_id
    )
  );

end;
$$;


grant execute on function public.submit_results(
  uuid,
  uuid,
  uuid
)
to authenticated;