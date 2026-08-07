-- =====================================================================
-- PHASE 6 — PARENT PORTAL, STUDENT PORTAL, SECURITY REVIEW
--
-- The portal account creation itself (auth accounts for parents and
-- students) happens in supabase/functions/invite-portal-user/index.ts,
-- for the same reason staff invites did in Phase 3: creating another
-- person's login requires the service role key, which never runs
-- client-side. This migration's job is just the RLS tightening that
-- makes the resulting portal accounts see only what they should.
--
-- Security review finding: `guardians` and `student_guardians` were
-- still on Phase 1's blanket "anyone in the school can read" policy.
-- That was a real gap — any logged-in teacher or even another parent
-- could read every guardian's phone number and email in the school.
-- Fixed below, same pattern as Phase 4/5.
-- =====================================================================

drop policy if exists tenant_isolation_select on guardians;
drop policy if exists tenant_isolation_write on guardians;
drop policy if exists tenant_isolation_update on guardians;
drop policy if exists tenant_isolation_delete on guardians;

create policy guardians_select on guardians for select using (
  auth.is_super_admin() or (school_id = auth.school_id() and (
    auth.role_name() in ('school_owner','school_admin','principal','vice_principal')
    or profile_id = auth.uid()
  ))
);
create policy guardians_admin_write on guardians for insert with check (
  auth.is_super_admin() or (school_id = auth.school_id() and auth.role_name() in ('school_owner','school_admin')));
create policy guardians_admin_update on guardians for update using (
  auth.is_super_admin() or (school_id = auth.school_id() and auth.role_name() in ('school_owner','school_admin')));
create policy guardians_admin_delete on guardians for delete using (
  auth.is_super_admin() or (school_id = auth.school_id() and auth.role_name() in ('school_owner','school_admin')));

-- student_guardians is a junction table with no school_id of its own;
-- scope it by whether the caller is that guardian, or an admin whose
-- school owns the linked student.
drop policy if exists student_guardians_isolation on student_guardians;

create policy student_guardians_select on student_guardians for select using (
  auth.is_super_admin()
  or exists (select 1 from guardians g where g.id = guardian_id and g.profile_id = auth.uid())
  or exists (
    select 1 from students s where s.id = student_id and s.school_id = auth.school_id()
      and auth.role_name() in ('school_owner','school_admin','principal','vice_principal')
  )
);
create policy student_guardians_admin_write on student_guardians for insert with check (
  auth.is_super_admin() or exists (
    select 1 from students s where s.id = student_id and s.school_id = auth.school_id()
      and auth.role_name() in ('school_owner','school_admin')
  )
);
create policy student_guardians_admin_delete on student_guardians for delete using (
  auth.is_super_admin() or exists (
    select 1 from students s where s.id = student_id and s.school_id = auth.school_id()
      and auth.role_name() in ('school_owner','school_admin')
  )
);

-- ---------------------------------------------------------------------
-- students.profile_id write access: linking a student to a portal
-- login is otherwise covered by the students_admin_update policy from
-- Phase 4 (school_owner/school_admin can update any student row), so
-- no new policy is needed here — noted for completeness. The actual
-- write happens via the service-role Edge Function, which bypasses
-- RLS anyway, exactly like invite-staff did.
-- ---------------------------------------------------------------------
