-- =====================================================================
-- SCHOOL MANAGEMENT ERP — CORE MULTI-TENANT SCHEMA (Phase 1)
-- Every tenant-owned table carries school_id and is protected by RLS.
-- Isolation model: Postgres Row-Level Security keyed off school_id,
-- resolved from the JWT via a SECURITY DEFINER helper (public.current_school_id()).
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type user_role as enum (
  'super_admin','school_owner','school_admin','principal',
  'vice_principal','teacher','parent','student'
);

create type school_status as enum ('pending','active','suspended','expired');
create type subscription_status as enum ('trial','active','expired','suspended','renewed');
create type attendance_status as enum ('present','absent','late','excused');
create type admission_status as enum ('pending','approved','rejected');
create type result_status as enum ('draft','submitted','approved','published');

-- ---------------------------------------------------------------------
-- PLATFORM-LEVEL TABLES (no school_id — owned by Super Admin)
-- ---------------------------------------------------------------------
create table schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  email text not null,
  phone text,
  address text,
  website text,
  motto text,
  logo_url text,
  brand_primary_color text default '#0F766E',
  brand_secondary_color text default '#F59E0B',
  principal_signature_url text,
  official_stamp_url text,
  status school_status not null default 'pending',
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  plan text not null default 'trial',
  status subscription_status not null default 'trial',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table platform_announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  message text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- USERS (extends Supabase auth.users; school_id null only for super_admin)
-- ---------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references schools(id) on delete cascade,
  role user_role not null,
  full_name text not null,
  email text not null,
  phone text,
  passport_url text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_school on profiles(school_id);

-- ---------------------------------------------------------------------
-- ACADEMIC STRUCTURE (all tenant-owned: school_id required)
-- ---------------------------------------------------------------------
create table sessions (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,               -- e.g. 2025/2026
  is_current boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique(school_id, name)
);

create table terms (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  name text not null,               -- First/Second/Third Term
  is_current boolean not null default false,
  start_date date,
  end_date date,
  unique(school_id, session_id, name)
);

create table classes (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,               -- e.g. JSS 1
  arm text,                         -- e.g. Gold
  class_teacher_id uuid references profiles(id),
  unique(school_id, name, arm)
);

create table subjects (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  code text,
  unique(school_id, name)
);

create table class_subject_teachers (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  unique(class_id, subject_id)
);

-- ---------------------------------------------------------------------
-- STUDENTS & GUARDIANS
-- ---------------------------------------------------------------------
create table students (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  admission_number text not null,
  student_id_code text not null,
  full_name text not null,
  date_of_birth date,
  gender text,
  address text,
  medical_info text,
  emergency_contact text,
  class_id uuid references classes(id),
  session_id uuid references sessions(id),
  status text not null default 'active',   -- active, transferred, graduated, withdrawn
  passport_url text,
  created_at timestamptz not null default now(),
  unique(school_id, admission_number)
);
create index idx_students_school on students(school_id);
create index idx_students_class on students(school_id, class_id);

create table guardians (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  full_name text not null,
  relationship text,
  phone text,
  email text
);

create table student_guardians (
  student_id uuid not null references students(id) on delete cascade,
  guardian_id uuid not null references guardians(id) on delete cascade,
  primary key (student_id, guardian_id)
);

create table student_history (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  event_type text not null,   -- promotion, transfer, withdrawal
  from_class_id uuid references classes(id),
  to_class_id uuid references classes(id),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- STAFF
-- ---------------------------------------------------------------------
create table staff (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  staff_id_code text not null,
  department text,
  position text,
  qualification text,
  employment_date date,
  unique(school_id, staff_id_code)
);

create table staff_attendance (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete cascade,
  clock_in timestamptz,
  clock_out timestamptz,
  date date not null default current_date
);

-- ---------------------------------------------------------------------
-- ADMISSIONS
-- ---------------------------------------------------------------------
create table admission_applications (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  applicant_name text not null,
  date_of_birth date,
  gender text,
  guardian_name text,
  guardian_phone text,
  guardian_email text,
  passport_url text,
  documents jsonb default '[]',
  class_applied_for uuid references classes(id),
  status admission_status not null default 'pending',
  admission_number text,
  reviewed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ATTENDANCE (students)
-- ---------------------------------------------------------------------
create table attendance_records (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  term_id uuid not null references terms(id) on delete cascade,
  marked_by uuid references profiles(id),
  date date not null,
  status attendance_status not null,
  unique(student_id, date)
);
create index idx_attendance_school_date on attendance_records(school_id, date);

-- ---------------------------------------------------------------------
-- RESULTS
-- ---------------------------------------------------------------------
create table result_scores (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  term_id uuid not null references terms(id) on delete cascade,
  assignment_score numeric(5,2) default 0,
  classwork_score numeric(5,2) default 0,
  ca_score numeric(5,2) default 0,
  exam_score numeric(5,2) default 0,
  total_score numeric(5,2) generated always as
    (coalesce(assignment_score,0)+coalesce(classwork_score,0)+coalesce(ca_score,0)+coalesce(exam_score,0)) stored,
  grade text,
  teacher_comment text,
  entered_by uuid references profiles(id),
  status result_status not null default 'draft',
  approved_by uuid references profiles(id),
  published_at timestamptz,
  unique(student_id, subject_id, term_id)
);
create index idx_results_school_term on result_scores(school_id, term_id);

create table grading_scale (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  grade text not null,
  min_score numeric(5,2) not null,
  max_score numeric(5,2) not null,
  remark text
);

create table report_card_comments (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  term_id uuid not null references terms(id) on delete cascade,
  principal_comment text,
  class_teacher_comment text
);

-- ---------------------------------------------------------------------
-- LESSON NOTES
-- ---------------------------------------------------------------------
create table lesson_notes (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  term_id uuid not null references terms(id) on delete cascade,
  week integer,
  title text not null,
  file_url text,
  file_type text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ANNOUNCEMENTS & ACTIVITIES
-- ---------------------------------------------------------------------
create table announcements (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  created_by uuid references profiles(id),
  title text not null,
  message text not null,
  target_audience text not null default 'everyone', -- everyone/teachers/parents/students
  attachments jsonb default '[]',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create table school_activities (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  uploaded_by uuid references profiles(id),
  title text,
  media_type text not null, -- photo/video
  media_url text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- GENERATED DOCUMENTS
-- ---------------------------------------------------------------------
create table generated_documents (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  document_type text not null, -- id_card, admission_letter, report_card, transcript...
  related_student_id uuid references students(id),
  related_staff_id uuid references staff(id),
  file_url text,
  generated_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- AUDIT LOG
-- ---------------------------------------------------------------------
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,
  entity text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- RLS HELPER FUNCTIONS
-- =====================================================================
create or replace function public.current_school_id() returns uuid
language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'school_id')::uuid
$$;

create or replace function public.current_role_name() returns text
language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'user_role')
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable as $$
  select public.current_role_name() = 'super_admin'
$$;

-- =====================================================================
-- ENABLE RLS + TENANT ISOLATION POLICIES
-- Pattern: super_admin sees all rows across schools; every other role
-- is restricted to rows where school_id = public.current_school_id().
-- =====================================================================
do $$
declare
  t text;
  tenant_tables text[] := array[
    'profiles','sessions','terms','classes','subjects','class_subject_teachers',
    'students','guardians','student_history','staff','staff_attendance',
    'admission_applications','attendance_records','result_scores','grading_scale',
    'report_card_comments','lesson_notes','announcements','school_activities',
    'generated_documents','audit_logs','subscriptions'
  ];
begin
  foreach t in array tenant_tables loop
    execute format('alter table %I enable row level security', t);
    execute format($f$
      create policy tenant_isolation_select on %I
      for select using (public.is_super_admin() or school_id = public.current_school_id())
    $f$, t);
    execute format($f$
      create policy tenant_isolation_write on %I
      for insert with check (public.is_super_admin() or school_id = public.current_school_id())
    $f$, t);
    execute format($f$
      create policy tenant_isolation_update on %I
      for update using (public.is_super_admin() or school_id = public.current_school_id())
    $f$, t);
    execute format($f$
      create policy tenant_isolation_delete on %I
      for delete using (public.is_super_admin() or school_id = public.current_school_id())
    $f$, t);
  end loop;
end $$;

-- Schools table: only super_admin manages; school members can read their own row
alter table schools enable row level security;
create policy schools_select on schools
  for select using (public.is_super_admin() or id = public.current_school_id());
create policy schools_super_admin_write on schools
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- student_guardians (junction, no school_id — inherit via student)
alter table student_guardians enable row level security;
create policy student_guardians_isolation on student_guardians
  for all using (
    public.is_super_admin() or
    exists (select 1 from students s where s.id = student_id and s.school_id = public.current_school_id())
  );
