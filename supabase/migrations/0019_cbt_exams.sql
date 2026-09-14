-- =====================================================================
-- MIGRATION 0019 — CBT (COMPUTER-BASED TESTING)
--
-- Per-school exams, created by that school's own admin/teacher.
-- Students access via admission number + PIN — deliberately NOT a
-- full Supabase Auth account, since most students won't have one.
-- =====================================================================

alter table students add column if not exists cbt_pin_hash text;

create table cbt_exams (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  title text not null,
  subject_id uuid references subjects(id),
  class_id uuid references classes(id),
  term_id uuid references terms(id),
  duration_minutes integer not null default 30,
  pass_mark numeric(5,2),
  status text not null default 'draft' check (status in ('draft','published','closed')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table cbt_questions (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid not null references cbt_exams(id) on delete cascade,
  question_text text not null,
  marks numeric(5,2) not null default 1,
  order_index integer not null default 0
);

create table cbt_options (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid not null references cbt_questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  order_index integer not null default 0
);

create table cbt_tokens (
  token uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '3 hours'),
  created_at timestamptz not null default now()
);

create table cbt_sessions (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid not null references cbt_exams(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  school_id uuid not null references schools(id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  score numeric(6,2),
  max_score numeric(6,2),
  unique (exam_id, student_id)
);

create table cbt_answers (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references cbt_sessions(id) on delete cascade,
  question_id uuid not null references cbt_questions(id) on delete cascade,
  option_id uuid references cbt_options(id),
  is_correct boolean,
  unique (session_id, question_id)
);

alter table cbt_exams enable row level security;
create policy cbt_exams_select on cbt_exams for select using (
  public.is_super_admin() or (school_id = public.current_school_id() and
    public.current_role_name() in ('school_owner','school_admin','teacher','principal','vice_principal'))
);
create policy cbt_exams_write on cbt_exams for insert with check (
  public.is_super_admin() or (school_id = public.current_school_id() and
    public.current_role_name() in ('school_owner','school_admin','teacher'))
);
create policy cbt_exams_update on cbt_exams for update using (
  public.is_super_admin() or (school_id = public.current_school_id() and
    public.current_role_name() in ('school_owner','school_admin','teacher'))
);
create policy cbt_exams_delete on cbt_exams for delete using (
  public.is_super_admin() or (school_id = public.current_school_id() and
    public.current_role_name() in ('school_owner','school_admin'))
);

alter table cbt_questions enable row level security;
create policy cbt_questions_all on cbt_questions for all using (
  public.is_super_admin() or exists (
    select 1 from cbt_exams e where e.id = exam_id and e.school_id = public.current_school_id()
      and public.current_role_name() in ('school_owner','school_admin','teacher')
  )
) with check (
  public.is_super_admin() or exists (
    select 1 from cbt_exams e where e.id = exam_id and e.school_id = public.current_school_id()
      and public.current_role_name() in ('school_owner','school_admin','teacher')
  )
);

alter table cbt_options enable row level security;
create policy cbt_options_all on cbt_options for all using (
  public.is_super_admin() or exists (
    select 1 from cbt_questions q join cbt_exams e on e.id = q.exam_id
    where q.id = question_id and e.school_id = public.current_school_id()
      and public.current_role_name() in ('school_owner','school_admin','teacher')
  )
) with check (
  public.is_super_admin() or exists (
    select 1 from cbt_questions q join cbt_exams e on e.id = q.exam_id
    where q.id = question_id and e.school_id = public.current_school_id()
      and public.current_role_name() in ('school_owner','school_admin','teacher')
  )
);

alter table cbt_sessions enable row level security;
create policy cbt_sessions_staff_select on cbt_sessions for select using (
  public.is_super_admin() or (school_id = public.current_school_id() and
    public.current_role_name() in ('school_owner','school_admin','teacher','principal','vice_principal'))
);

alter table cbt_tokens enable row level security;
alter table cbt_answers enable row level security;

create or replace function public.set_student_cbt_pin(p_student_id uuid, p_pin text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.current_role_name() not in ('school_owner','school_admin') then raise exception 'Not authorized'; end if;
  update students set cbt_pin_hash = crypt(p_pin, gen_salt('bf'))
  where id = p_student_id and school_id = public.current_school_id();
end;
$$;
grant execute on function public.set_student_cbt_pin to authenticated;

create or replace function public.cbt_validate_token(p_token uuid)
returns table(student_id uuid, school_id uuid)
language sql stable security definer set search_path = public as $$
  select student_id, school_id from cbt_tokens where token = p_token and expires_at > now();
$$;

create or replace function public.cbt_login(p_school_slug text, p_admission_number text, p_pin text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_school_id uuid;
  v_student record;
  v_token uuid;
begin
  select id into v_school_id from schools where slug = p_school_slug and status = 'active';
  if v_school_id is null then raise exception 'Invalid school'; end if;

  select id, cbt_pin_hash into v_student from students
  where school_id = v_school_id and admission_number = p_admission_number and status = 'active';

  if v_student.id is null or v_student.cbt_pin_hash is null
     or v_student.cbt_pin_hash <> crypt(p_pin, v_student.cbt_pin_hash) then
    raise exception 'Invalid admission number or PIN';
  end if;

  insert into cbt_tokens (school_id, student_id) values (v_school_id, v_student.id)
  returning token into v_token;

  return v_token;
end;
$$;
grant execute on function public.cbt_login to anon, authenticated;

create or replace function public.cbt_list_available_exams(p_token uuid)
returns table(id uuid, title text, subject_name text, duration_minutes integer, already_attempted boolean)
language plpgsql security definer set search_path = public as $$
declare v_student_id uuid; v_school_id uuid; v_class_id uuid;
begin
  select t.student_id, t.school_id into v_student_id, v_school_id from public.cbt_validate_token(p_token) t;
  if v_student_id is null then raise exception 'Session expired, please log in again'; end if;

  select class_id into v_class_id from students where id = v_student_id;

  return query
  select e.id, e.title, s.name, e.duration_minutes,
    exists(select 1 from cbt_sessions cs where cs.exam_id = e.id and cs.student_id = v_student_id)
  from cbt_exams e
  left join subjects s on s.id = e.subject_id
  where e.school_id = v_school_id and e.class_id = v_class_id and e.status = 'published'
    and (e.starts_at is null or e.starts_at <= now())
    and (e.ends_at is null or e.ends_at >= now());
end;
$$;
grant execute on function public.cbt_list_available_exams to anon, authenticated;

create or replace function public.cbt_start_exam(p_token uuid, p_exam_id uuid)
returns table(session_id uuid, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_student_id uuid; v_school_id uuid; v_duration integer; v_existing record;
begin
  select t.student_id, t.school_id into v_student_id, v_school_id from public.cbt_validate_token(p_token) t;
  if v_student_id is null then raise exception 'Session expired, please log in again'; end if;

  select * into v_existing from cbt_sessions where exam_id = p_exam_id and student_id = v_student_id;
  if v_existing.id is not null then
    if v_existing.submitted_at is not null then raise exception 'You have already submitted this exam'; end if;
    return query select v_existing.id, v_existing.expires_at;
    return;
  end if;

  select duration_minutes into v_duration from cbt_exams
  where id = p_exam_id and school_id = v_school_id and status = 'published';
  if v_duration is null then raise exception 'Exam not available'; end if;

  return query
  insert into cbt_sessions (exam_id, student_id, school_id, expires_at)
  values (p_exam_id, v_student_id, v_school_id, now() + (v_duration || ' minutes')::interval)
  returning id, expires_at;
end;
$$;
grant execute on function public.cbt_start_exam to anon, authenticated;

create or replace function public.cbt_get_exam_questions(p_token uuid, p_session_id uuid)
returns table(question_id uuid, question_text text, marks numeric, option_id uuid, option_text text)
language plpgsql security definer set search_path = public as $$
declare v_student_id uuid;
begin
  select t.student_id into v_student_id from public.cbt_validate_token(p_token) t;
  if v_student_id is null then raise exception 'Session expired'; end if;

  if not exists (
    select 1 from cbt_sessions
    where id = p_session_id and student_id = v_student_id and submitted_at is null and expires_at > now()
  ) then
    raise exception 'Session invalid or expired';
  end if;

  return query
  select q.id, q.question_text, q.marks, o.id, o.option_text
  from cbt_questions q
  join cbt_options o on o.question_id = q.id
  where q.exam_id = (select exam_id from cbt_sessions where id = p_session_id)
  order by q.order_index, o.order_index;
end;
$$;
grant execute on function public.cbt_get_exam_questions to anon, authenticated;

create or replace function public.cbt_submit_answer(p_token uuid, p_session_id uuid, p_question_id uuid, p_option_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_student_id uuid;
begin
  select t.student_id into v_student_id from public.cbt_validate_token(p_token) t;
  if v_student_id is null then raise exception 'Session expired'; end if;

  if not exists (
    select 1 from cbt_sessions
    where id = p_session_id and student_id = v_student_id and submitted_at is null and expires_at > now()
  ) then
    raise exception 'Session invalid, expired, or already submitted';
  end if;

  insert into cbt_answers (session_id, question_id, option_id)
  values (p_session_id, p_question_id, p_option_id)
  on conflict (session_id, question_id) do update set option_id = excluded.option_id;
end;
$$;
grant execute on function public.cbt_submit_answer to anon, authenticated;

create or replace function public.cbt_submit_exam(p_token uuid, p_session_id uuid)
returns table(score numeric, max_score numeric)
language plpgsql security definer set search_path = public as $$
declare v_student_id uuid; v_score numeric; v_max numeric;
begin
  select t.student_id into v_student_id from public.cbt_validate_token(p_token) t;
  if v_student_id is null then raise exception 'Session expired'; end if;

  if not exists (select 1 from cbt_sessions where id = p_session_id and student_id = v_student_id and submitted_at is null) then
    raise exception 'Session invalid or already submitted';
  end if;

  update cbt_answers a set is_correct = o.is_correct
  from cbt_options o
  where a.option_id = o.id and a.session_id = p_session_id;

  select coalesce(sum(q.marks) filter (where a.is_correct), 0), coalesce(sum(q.marks), 0)
  into v_score, v_max
  from cbt_questions q
  left join cbt_answers a on a.question_id = q.id and a.session_id = p_session_id
  where q.exam_id = (select exam_id from cbt_sessions where id = p_session_id);

  update cbt_sessions set submitted_at = now(), score = v_score, max_score = v_max where id = p_session_id;

  return query select v_score, v_max;
end;
$$;
grant execute on function public.cbt_submit_exam to anon, authenticated;

create or replace function public.cbt_my_results(p_token uuid)
returns table(exam_title text, score numeric, max_score numeric, submitted_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_student_id uuid;
begin
  select t.student_id into v_student_id from public.cbt_validate_token(p_token) t;
  if v_student_id is null then raise exception 'Session expired'; end if;

  return query
  select e.title, cs.score, cs.max_score, cs.submitted_at
  from cbt_sessions cs join cbt_exams e on e.id = cs.exam_id
  where cs.student_id = v_student_id and cs.submitted_at is not null
  order by cs.submitted_at desc;
end;
$$;
grant execute on function public.cbt_my_results to anon, authenticated;