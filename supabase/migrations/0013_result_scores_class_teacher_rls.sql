-- ============================================================
-- RESULT SCORES RLS UPDATE
-- Only class teachers prepare results.
-- Subject teachers cannot enter results.
-- ============================================================


drop policy if exists result_scores_insert on result_scores;
drop policy if exists result_scores_update on result_scores;


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
  )

  or

  (
    public.current_role_name() in ('school_owner','school_admin')
  )

);



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
  )

  or

  (
    public.current_role_name() in ('school_owner','school_admin')
  )

);