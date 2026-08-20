-- ============================================================
-- RESULT SUBJECT VALIDATION
-- Class teachers can prepare all subjects assigned to their class.
-- Subject teachers cannot prepare results.
-- ============================================================


create or replace function public.is_subject_for_class(
  p_class_id uuid,
  p_subject_id uuid
)
returns boolean
language sql
stable
as $$

  select exists (

    select 1

    from class_subject_teachers cst

    where cst.class_id = p_class_id
    and cst.subject_id = p_subject_id

  );

$$;


grant execute on function public.is_subject_for_class(
  uuid,
  uuid
)
to authenticated;



drop policy if exists result_scores_insert
on result_scores;


create policy result_scores_insert

on result_scores

for insert

with check (

  public.is_super_admin()

  or

  (

    school_id = public.current_school_id()

    and public.current_role_name() = 'teacher'

    and entered_by = auth.uid()

    and public.is_result_class_teacher(class_id)

    and public.is_subject_for_class(
      class_id,
      subject_id
    )

  )

  or

  public.current_role_name()
  in ('school_owner','school_admin')

);



drop policy if exists result_scores_update
on result_scores;


create policy result_scores_update

on result_scores

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

    and public.is_subject_for_class(
      class_id,
      subject_id
    )

  )

  or

  public.current_role_name()
  in ('school_owner','school_admin')

);