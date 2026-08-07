# Phase 4 — Attendance, Lesson Notes, Announcements, School Activities

## The security fix that had to happen this phase

Phases 1–3's RLS used one blanket pattern: `school_id = auth.school_id()` for every operation, on every tenant table. That's correct for *isolation between schools*, but it says nothing about *roles within a school* — technically, a student's own session could have inserted or updated rows in `students`, `classes`, or `attendance_records`, because the policy only checked which school they belonged to, not what they were allowed to do in it.

This didn't bite yet because only admin-facing UI existed. Phase 4 is the first phase where a non-admin role (teacher) needs real write access, and where parent/student read access needs to be *narrower* than "everyone in the school" — a parent should see their own child's attendance, not the whole class's. So this was the right moment to replace the blanket policies on `classes`, `students`, `attendance_records`, `lesson_notes`, `announcements`, and `school_activities` with role-aware ones. (`result_scores` gets the same treatment in Phase 5, when it starts being written to.)

## How the scoping works

Three helper functions do the actual checking, reused across every policy:
- `is_teacher_of_class(class_id)` — true if you're the class teacher or a subject teacher assigned to that class.
- `is_guardian_of_student(student_id)` — true if a `guardians` row links your profile to that student.
- `is_own_student_record(student_id)` — true if the student row's `profile_id` is you (for student portal logins).

Every policy on the affected tables now branches on `auth.role_name()` and calls the relevant helper, instead of a flat school-wide check.

## Attendance: one RPC, not raw inserts

`mark_attendance()` takes a whole class's marks for one date as a JSON array and upserts them in a loop inside one transaction — a teacher submitting the form gets one atomic write, not N separate round trips that could partially fail. It re-checks `is_teacher_of_class()` server-side even though the RLS insert policy would also catch a violation — belt and suspenders, and a much clearer error message than a generic RLS denial.

## File storage is tenant-isolated too

Lesson notes and activity photos/videos live in private Supabase Storage buckets (`lesson-notes`, `school-activities`, plus `passports` for later). Every object path is prefixed `{school_id}/...`, and `storage.objects` RLS checks that prefix the same way table rows are checked. Media is served via **signed URLs** (`createSignedUrl`, 10min for notes / 1hr for activities) rather than public links — consistent with "school data isolation is mandatory" applying to files, not just database rows.

## New files

```
supabase/migrations/0004_phase4_attendance_content.sql   # RLS tightening, mark_attendance, storage buckets/policies
src/services/attendance.ts   lessonNotes.ts   announcements.ts   activities.ts
src/pages/teacher/AttendancePage.tsx
src/pages/teacher/LessonNotesPage.tsx
src/pages/shared/AnnouncementsPage.tsx    # used by admin (create) + everyone (read)
src/pages/shared/ActivitiesPage.tsx        # used by uploader roles + everyone (read)
```

## What's deliberately deferred

- Attendance analytics (daily/weekly/monthly/term rollups, class/school statistics) — the raw records are captured correctly now; aggregation views are a reporting concern, cleaner to build once Phase 5's results data exists alongside it for combined dashboards.
- Video streaming optimization (adaptive bitrate, thumbnails) — signed-URL playback works but is basic; revisit if upload volume grows.
- Announcement attachments — the schema supports a `jsonb` attachments field; wiring up file upload for it follows the same storage pattern as lesson notes, deferred to keep this phase focused.

## Next step

Phase 5: Result Management — score entry, automatic grade/position calculation, the teacher → principal → admin publish workflow, and report cards. This is also where `result_scores` gets the same role-aware RLS treatment applied here.
