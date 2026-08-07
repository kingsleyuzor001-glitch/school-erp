-- =====================================================================
-- PHASE 3 — SCHOOL ADMINISTRATION
-- Students, staff, classes, subjects, sessions, terms.
-- Classes/subjects/sessions/terms are plain tenant tables already
-- covered by the RLS from 0001 — no RPC needed, the frontend just
-- inserts with school_id = auth.school_id(). Students and staff need
-- RPCs because they involve generated IDs (and, for staff, an auth
-- account) that must not be left to client-side logic to get right.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ID GENERATION
-- Per-school running counters so admission/staff numbers are dense,
-- sequential, and never collide, even with concurrent inserts.
-- ---------------------------------------------------------------------
create table id_counters (
  school_id uuid not null references schools(id) on delete cascade,
  counter_type text not null,   -- 'admission' | 'staff'
  value integer not null default 0,
  primary key (school_id, counter_type)
);
alter table id_counters enable row level security;
create policy id_counters_isolation on id_counters
  for all using (auth.is_super_admin() or school_id = auth.school_id());

create or replace function public.next_counter(p_school_id uuid, p_type text)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_value integer;
begin
  insert into id_counters (school_id, counter_type, value)
  values (p_school_id, p_type, 1)
  on conflict (school_id, counter_type)
  do update set value = id_counters.value + 1
  returning value into v_value;
  return v_value;
end;
$$;

-- ---------------------------------------------------------------------
-- STUDENT CREATION
-- Generates admission_number (e.g. STU/2026/000042) and a separate
-- student_id_code used on the printed ID card/QR, in one transaction
-- so an admin never has to invent or double-check a number by hand.
-- ---------------------------------------------------------------------
create or replace function public.create_student(
  p_full_name text,
  p_date_of_birth date,
  p_gender text,
  p_class_id uuid,
  p_session_id uuid,
  p_address text default null,
  p_medical_info text default null,
  p_emergency_contact text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_school_id uuid := auth.school_id();
  v_role text := auth.role_name();
  v_seq integer;
  v_year text;
  v_admission_number text;
  v_student_id uuid;
begin
  if v_school_id is null then raise exception 'No school context on this session'; end if;
  if v_role not in ('school_owner','school_admin') then raise exception 'Not authorized'; end if;

  v_seq := next_counter(v_school_id, 'admission');
  v_year := to_char(now(), 'YYYY');
  v_admission_number := 'STU/' || v_year || '/' || lpad(v_seq::text, 6, '0');

  insert into students (
    school_id, admission_number, student_id_code, full_name, date_of_birth,
    gender, address, medical_info, emergency_contact, class_id, session_id, status
  ) values (
    v_school_id, v_admission_number, v_admission_number, p_full_name, p_date_of_birth,
    p_gender, p_address, p_medical_info, p_emergency_contact, p_class_id, p_session_id, 'active'
  ) returning id into v_student_id;

  insert into audit_logs (school_id, actor_id, action, entity, entity_id)
  values (v_school_id, auth.uid(), 'student_created', 'students', v_student_id);

  return v_student_id;
end;
$$;
grant execute on function public.create_student to authenticated;

-- ---------------------------------------------------------------------
-- STUDENT PROMOTION / TRANSFER
-- Writes student_history so the move is auditable, not just a silent
-- class_id overwrite.
-- ---------------------------------------------------------------------
create or replace function public.move_student(
  p_student_id uuid,
  p_to_class_id uuid,
  p_event_type text, -- 'promotion' | 'transfer'
  p_notes text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_school_id uuid := auth.school_id();
  v_from_class uuid;
begin
  if auth.role_name() not in ('school_owner','school_admin','principal') then
    raise exception 'Not authorized';
  end if;

  select class_id into v_from_class from students where id = p_student_id and school_id = v_school_id;
  if v_from_class is null and not found then
    raise exception 'Student not found in this school';
  end if;

  update students set class_id = p_to_class_id where id = p_student_id and school_id = v_school_id;

  insert into student_history (school_id, student_id, event_type, from_class_id, to_class_id, notes)
  values (v_school_id, p_student_id, p_event_type, v_from_class, p_to_class_id, p_notes);
end;
$$;
grant execute on function public.move_student to authenticated;

-- ---------------------------------------------------------------------
-- STAFF ID GENERATION (auth account creation itself happens in the
-- invite-staff Edge Function, which needs the service role — see
-- supabase/functions/invite-staff/index.ts. This RPC just generates
-- the ID code for that function to use, and inserts the staff row.)
-- ---------------------------------------------------------------------
create or replace function public.generate_staff_id_code(p_school_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_seq integer;
begin
  v_seq := next_counter(p_school_id, 'staff');
  return 'STF/' || lpad(v_seq::text, 5, '0');
end;
$$;
grant execute on function public.generate_staff_id_code to service_role;
