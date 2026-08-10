-- =====================================================================
-- PHASE 5 — RESULT MANAGEMENT
-- Score entry, automatic grading, the teacher -> principal -> admin
-- publish workflow, and report card generation.
-- =====================================================================

-- ---------------------------------------------------------------------
-- HELPER: class-teacher check (broader than subject-teacher — the
-- homeroom teacher can see all subjects for their own class, a
-- subject teacher can only see the subject(s) they actually teach).
-- ---------------------------------------------------------------------
create or replace function public.is_class_teacher(p_class_id uuid) returns boolean
language sql stable as $$
  select exists (select 1 from classes c where c.id = p_class_id and c.class_teacher_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- AUTOMATIC GRADING
-- Computed from the four raw score fields directly (not from the
-- `total_score` generated column — a BEFORE trigger runs before that
-- column's own value is finalized, so referencing it here would read
-- stale/null data). Falls back to the default Nigerian scale if a
-- school hasn't customized grading_scale yet.
-- ---------------------------------------------------------------------
create or replace function public.compute_result_grade() returns trigger
language plpgsql as $$
declare
  v_total numeric(5,2);
  v_grade text;
begin
  v_total := coalesce(new.assignment_score,0) + coalesce(new.classwork_score,0)
           + coalesce(new.ca_score,0) + coalesce(new.exam_score,0);

  select grade into v_grade from grading_scale
  where school_id = new.school_id and v_total between min_score and max_score
  limit 1;

  if v_grade is null then
    v_grade := case
      when v_total >= 70 then 'A' when v_total >= 60 then 'B' when v_total >= 50 then 'C'
      when v_total >= 45 then 'D' when v_total >= 40 then 'E' else 'F' end;
  end if;

  new.grade := v_grade;
  return new;
end;
$$;

drop trigger if exists trg_compute_result_grade on result_scores;
create trigger trg_compute_result_grade
  before insert or update on result_scores
  for each row execute function compute_result_grade();

-- Seed the default Nigerian grading scale for a school, if it has none
-- yet — schools can still override/add rows afterward via normal CRUD.
create or replace function public.seed_default_grading_scale(p_school_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from grading_scale where school_id = p_school_id) then return; end if;
  insert into grading_scale (school_id, grade, min_score, max_score, remark) values
    (p_school_id, 'A', 70, 100, 'Excellent'),
    (p_school_id, 'B', 60, 69.99, 'Very Good'),
    (p_school_id, 'C', 50, 59.99, 'Good'),
    (p_school_id, 'D', 45, 49.99, 'Fair'),
    (p_school_id, 'E', 40, 44.99, 'Pass'),
    (p_school_id, 'F', 0, 39.99, 'Fail');
end;
$$;

-- Approving a school now also seeds its grading scale — redefined in
-- full here (CREATE OR REPLACE) rather than patched, since a partial
-- ALTER of a PL/pgSQL function body isn't possible.
create or replace function public.approve_school(p_school_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'Not authorized'; end if;

  update schools set status = 'active', approved_at = now(), approved_by = auth.uid()
  where id = p_school_id;

  update subscriptions set status = 'active'
  where school_id = p_school_id and status = 'trial';

  perform seed_default_grading_scale(p_school_id);

  insert into audit_logs (school_id, actor_id, action, entity, entity_id)
  values (p_school_id, auth.uid(), 'school_approved', 'schools', p_school_id);
end;
$$;

-- ---------------------------------------------------------------------
-- RESULT_SCORES — role-aware RLS (replacing the Phase 1 blanket policy,
-- same reasoning as Phase 4's fix). Teachers only see/edit their own
-- entered scores (or, if they're the homeroom teacher, their whole
-- class); parents/students only see PUBLISHED results, never drafts.
-- ---------------------------------------------------------------------
drop policy if exists tenant_isolation_select on result_scores;
drop policy if exists tenant_isolation_write on result_scores;
drop policy if exists tenant_isolation_update on result_scores;
drop policy if exists tenant_isolation_delete on result_scores;

create policy result_scores_select on result_scores for select using (
  public.is_super_admin() or (school_id = public.current_school_id() and (
    public.current_role_name() in ('school_owner','school_admin','principal','vice_principal')
    or (public.current_role_name() = 'teacher' and (entered_by = auth.uid() or is_class_teacher(class_id)))
    or (public.current_role_name() = 'parent' and status = 'published' and is_guardian_of_student(student_id))
    or (public.current_role_name() = 'student' and status = 'published' and is_own_student_record(student_id))
  ))
);
create policy result_scores_insert on result_scores for insert with check (
  public.is_super_admin() or (school_id = public.current_school_id() and (
    public.current_role_name() in ('school_owner','school_admin')
    or (public.current_role_name() = 'teacher' and entered_by = auth.uid() and is_teacher_of_class(class_id))
  ))
);
create policy result_scores_update on result_scores for update using (
  public.is_super_admin() or (school_id = public.current_school_id() and (
    public.current_role_name() in ('school_owner','school_admin')
    or (public.current_role_name() = 'teacher' and entered_by = auth.uid() and status = 'draft')
  ))
);
create policy result_scores_delete on result_scores for delete using (
  public.is_super_admin() or (school_id = public.current_school_id() and public.current_role_name() in ('school_owner','school_admin')));

-- ---------------------------------------------------------------------
-- WORKFLOW: teacher submits -> principal approves -> admin publishes.
-- Each stage is a single RPC over a whole (class, subject, term) batch
-- rather than row-by-row, so a partial submission can't happen.
-- ---------------------------------------------------------------------
create or replace function public.submit_results(p_class_id uuid, p_subject_id uuid, p_term_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.current_role_name() != 'teacher' or not is_teacher_of_class(p_class_id) then
    raise exception 'Not authorized';
  end if;
  update result_scores set status = 'submitted'
  where class_id = p_class_id and subject_id = p_subject_id and term_id = p_term_id
    and entered_by = auth.uid() and status = 'draft';

  insert into audit_logs (school_id, actor_id, action, entity, metadata)
  values (public.current_school_id(), auth.uid(), 'results_submitted', 'result_scores',
    jsonb_build_object('class_id', p_class_id, 'subject_id', p_subject_id, 'term_id', p_term_id));
end;
$$;
grant execute on function public.submit_results to authenticated;

create or replace function public.approve_results(p_class_id uuid, p_subject_id uuid, p_term_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.current_role_name() not in ('principal','vice_principal') then raise exception 'Not authorized'; end if;
  update result_scores set status = 'approved', approved_by = auth.uid()
  where school_id = public.current_school_id() and class_id = p_class_id and subject_id = p_subject_id
    and term_id = p_term_id and status = 'submitted';

  insert into audit_logs (school_id, actor_id, action, entity, metadata)
  values (public.current_school_id(), auth.uid(), 'results_approved', 'result_scores',
    jsonb_build_object('class_id', p_class_id, 'subject_id', p_subject_id, 'term_id', p_term_id));
end;
$$;
grant execute on function public.approve_results to authenticated;

create or replace function public.publish_results(p_class_id uuid, p_term_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.current_role_name() not in ('school_owner','school_admin') then raise exception 'Not authorized'; end if;
  update result_scores set status = 'published', published_at = now()
  where school_id = public.current_school_id() and class_id = p_class_id and term_id = p_term_id and status = 'approved';

  insert into audit_logs (school_id, actor_id, action, entity, metadata)
  values (public.current_school_id(), auth.uid(), 'results_published', 'result_scores',
    jsonb_build_object('class_id', p_class_id, 'term_id', p_term_id));
end;
$$;
grant execute on function public.publish_results to authenticated;

-- ---------------------------------------------------------------------
-- REPORT CARD
-- SECURITY DEFINER because computing a class position requires ranking
-- against classmates' totals, which the caller's own RLS would
-- otherwise hide from them (correctly — a parent shouldn't be able to
-- query other children's scores directly). This function does that
-- aggregation internally but returns only the target student's own
-- subject breakdown + their computed position, never classmates' rows.
-- ---------------------------------------------------------------------
create or replace function public.get_report_card(p_student_id uuid, p_term_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_school_id uuid := public.current_school_id();
  v_class_id uuid;
  v_result jsonb;
  v_position integer;
  v_class_size integer;
  v_comments jsonb;
begin
  select class_id into v_class_id from students where id = p_student_id and school_id = v_school_id;
  if v_class_id is null then raise exception 'Student not found'; end if;

  -- Authorization: admin/principal/class-teacher, or the student's own guardian/self.
  if not (
    public.is_super_admin()
    or public.current_role_name() in ('school_owner','school_admin','principal','vice_principal')
    or (public.current_role_name() = 'teacher' and is_class_teacher(v_class_id))
    or (public.current_role_name() = 'parent' and is_guardian_of_student(p_student_id))
    or (public.current_role_name() = 'student' and is_own_student_record(p_student_id))
  ) then
    raise exception 'Not authorized';
  end if;

  -- Non-admin viewers only ever see published results.
  with visible_scope as (
    select case when public.current_role_name() in ('school_owner','school_admin','principal','vice_principal')
                  or public.is_super_admin() or (public.current_role_name()='teacher' and is_class_teacher(v_class_id))
      then array['draft','submitted','approved','published']
      else array['published'] end as statuses
  ),
  class_totals as (
    select rs.student_id, sum(rs.total_score) as total
    from result_scores rs, visible_scope
    where rs.class_id = v_class_id and rs.term_id = p_term_id and rs.status = any(visible_scope.statuses)
    group by rs.student_id
  ),
  ranked as (
    select student_id, total, rank() over (order by total desc) as pos, count(*) over () as class_size
    from class_totals
  )
  select pos, class_size into v_position, v_class_size from ranked where student_id = p_student_id;

  select jsonb_agg(jsonb_build_object(
    'subject', sub.name, 'assignment', rs.assignment_score, 'classwork', rs.classwork_score,
    'ca', rs.ca_score, 'exam', rs.exam_score, 'total', rs.total_score, 'grade', rs.grade,
    'teacher_comment', rs.teacher_comment, 'status', rs.status
  ))
  into v_result
  from result_scores rs
  join subjects sub on sub.id = rs.subject_id
  , visible_scope
  where rs.student_id = p_student_id and rs.term_id = p_term_id and rs.status = any(visible_scope.statuses);

  select jsonb_build_object('principal_comment', principal_comment, 'class_teacher_comment', class_teacher_comment)
  into v_comments from report_card_comments where student_id = p_student_id and term_id = p_term_id;

  return jsonb_build_object(
    'subjects', coalesce(v_result, '[]'::jsonb),
    'position', v_position, 'class_size', v_class_size,
    'comments', coalesce(v_comments, '{}'::jsonb)
  );
end;
$$;
grant execute on function public.get_report_card to authenticated;
