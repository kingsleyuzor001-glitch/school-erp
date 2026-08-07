# Phase 3 — School Administration

## What this phase adds

Students, staff, classes, subjects, sessions, terms — the core academic data a school admin manages day to day.

## Two different patterns, on purpose

**Classes, subjects, sessions, terms** are plain tenant tables. The RLS from Phase 1 already restricts them correctly, so the frontend (`services/academic.ts`) just does direct `insert`/`select` calls with `school_id` from the caller's own profile. No RPC needed — adding one would just be indirection around something RLS already guarantees.

**Students and staff are different, for two separate reasons:**

- **Students** need a generated, collision-proof `admission_number`. Left to client code, two admins double-clicking "Save" at the same moment could generate the same number. `create_student()` is a `SECURITY DEFINER` RPC that increments a per-school counter (`id_counters`, via `next_counter()`) inside the same transaction as the insert — so numbering is dense, sequential, and race-safe.

- **Staff accounts need a login**, and creating another person's auth account requires Supabase's `service_role` key. That key must never reach the browser. So staff invites go through **`supabase/functions/invite-staff/index.ts`**, an Edge Function that:
  1. Verifies the caller is actually a `school_owner`/`school_admin` (re-checked server-side — never trust the client, even one that passed RLS elsewhere).
  2. Sends the invite email via `inviteUserByEmail`.
  3. Creates the `profiles` and `staff` rows for the new user.
  4. Logs the action to `audit_logs`.

  This is the one place in the whole app where privileged server-side logic is unavoidable — everything else runs on RLS alone.

## Deploying the Edge Function

```
supabase functions deploy invite-staff
```

It needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set as function secrets (Supabase sets these automatically for you in most projects — check `supabase secrets list` if the invite fails with a config error).

## Student promotion/transfer

`move_student()` doesn't just overwrite `class_id` — it writes a `student_history` row first, so "why is this student in a different class than last term" always has an answer. Same RPC handles both promotion and transfer via `p_event_type`.

## New files

```
supabase/migrations/0003_phase3_school_admin.sql   # counters, create_student, move_student
supabase/functions/invite-staff/index.ts             # staff account creation (service role)
src/services/academic.ts                              # sessions/terms/classes/subjects
src/services/students.ts                                # student CRUD + promotion/transfer
src/services/staff.ts                                    # staff list + invite
src/pages/school-admin/AcademicSetupPage.tsx               # sessions/terms/classes/subjects UI
src/pages/school-admin/StudentsPage.tsx                     # student list + create form
src/pages/school-admin/StaffPage.tsx                         # staff list + invite form
```

## About the single-file demo

From this phase on, I'm not extending `index.html` in parallel. Five interrelated entities (students, staff, classes, subjects, sessions/terms), an Edge Function, and generated-ID logic are the point where a no-build single file stops being a faithful demo and starts being a second codebase to keep in sync. The full Vite project is the source of truth going forward — run it locally with `npm install && npm run dev`, or connect the repo to Netlify for continuous deploys, rather than hand-editing one HTML file.

## What's deliberately deferred

- Editing/deleting students and staff, and deactivating a staff account — Phase 3 covers creation and listing; edit/delete follow the same RPC pattern and can be added on request.
- Restricting teachers to only their assigned classes — that scoping matters once attendance and results exist (Phase 4/5), so it's built there rather than speculatively now.
- Student ID card and staff ID card generation (QR code, printable layout) — Phase 5's document generation module.
- Bulk student import (CSV) — can be added as a variant of `create_student` once single-record creation is confirmed working end-to-end.

## Next step

Phase 4: Attendance, Lesson Notes, Announcements, School Activities — plus the teacher-scoped RLS (a teacher only sees their own assigned classes) that Phase 3 intentionally deferred.
