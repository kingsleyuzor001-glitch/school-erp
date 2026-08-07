# Phase 6 — Parent Portal, Student Portal, Security Review, Deployment

## Closing the loop from Phase 5

Phase 5's report card feature depended on students having a `profile_id` link to an actual login account — which didn't exist yet. `supabase/functions/invite-portal-user/index.ts` closes that gap: an admin can invite a parent (creates a `guardians` row + `student_guardians` link) or give a student their own login (`students.profile_id` set), the same service-role pattern as `invite-staff` from Phase 3.

**Bug fix caught while wiring this up:** `ReportCardPage` was resolving a logged-in student's identity as `profile.id` (the auth user id) and passing that straight to `get_report_card`, which expects an actual `students.id`. Those are different values — the function would have silently failed `is_own_student_record()` for every real student login. Fixed by resolving the student's own row first via `getMyStudentRecord()` (itself just a plain `select * from students` — RLS already narrows it to their own row, no explicit filter needed).

## Security review

This is the point in the brief's roadmap explicitly reserved for it, so here's the actual state of RLS coverage across every tenant table as of this phase:

| Table | Coverage |
|---|---|
| `classes`, `students`, `attendance_records`, `lesson_notes`, `announcements`, `school_activities` | Role-aware (Phase 4) |
| `result_scores` | Role-aware (Phase 5) |
| `guardians`, `student_guardians` | Role-aware (this phase — see finding below) |
| `schools` | Role-aware since Phase 1 (super-admin write, own-school read) |
| `profiles`, `sessions`, `terms`, `subjects`, `class_subject_teachers`, `staff`, `staff_attendance`, `admission_applications`, `grading_scale`, `report_card_comments`, `generated_documents`, `audit_logs`, `subscriptions` | Still Phase 1's blanket "any authenticated member of the school" policy |

**Finding fixed this phase:** `guardians` and `student_guardians` were still on the blanket policy — meaning any logged-in teacher, or even another parent, could read every guardian's phone number and email for the whole school. Tightened to: admins see everyone, a guardian sees only their own row.

**Remaining items for the blanket-policy tables**, roughly in order of what I'd fix first if this were going to production:
1. `staff`/`profiles` — a teacher can currently see every other staff member's profile row school-wide. Low severity (it's colleague directory info, not sensitive), but worth narrowing to admin + self eventually.
2. `admission_applications` — currently any staff member can read pending applications, not just admins. Applicant data (guardian phone/email) is the same sensitivity class as `guardians`, so this deserves the same fix.
3. `subscriptions`, `audit_logs` — billing and audit trail data probably should be admin/owner-only reads, not all-staff.

None of these are exploitable *across* schools — the school_id boundary from Phase 1 holds throughout. They're all *within-school* over-exposure, the same category of issue Phase 4/5/6 have been closing one table group at a time.

## Performance

Added a debounced `<SearchBar>` (`src/components/shared/SearchBar.tsx`, 300ms) wired into the Students page's `full_name`/`admission_number` search — the "Debounced Search" and "Global Search" items from the original brief. The same component drops into Staff or any other list page with server-side `ilike` filtering the same way.

Beyond that, I'm not fabricating performance work that can't actually be measured — code-splitting, caching tuning, and query optimization are meaningfully different once there's real data volume and a deployed instance to profile. The honest next step is: deploy, seed realistic data, then optimize against real numbers rather than guesses.

## Deployment checklist

**Supabase:**
1. Run all six migrations in order (`0001` → `0006`).
2. Register the JWT hook: Authentication → Hooks → Customize Access Token (JWT) Claims → `public.custom_access_token_hook`.
3. Deploy both Edge Functions: `supabase functions deploy invite-staff` and `supabase functions deploy invite-portal-user`.
4. Manually create the first `super_admin` (no self-service path exists for this, on purpose — see Phase 2 doc).

**Netlify:**
1. Connect the repo (or use the Netlify MCP connector, as set up earlier in this conversation).
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as site environment variables.
3. `netlify.toml` already handles the build command and SPA redirect.

**Before real users touch it:** work through the manual test checklist that's been deferred twice now — register a school, approve it, invite a teacher, create a student, mark attendance, run a result through the full submit→approve→publish workflow, and view the resulting report card as both an admin and an actual parent/student portal login. Six phases of code have never touched a live database yet; that first end-to-end run is where anything genuinely wrong will surface.

## New files

```
supabase/migrations/0006_phase6_portals.sql        # guardians/student_guardians RLS tightening
supabase/functions/invite-portal-user/index.ts        # parent + student portal account creation
src/services/portal.ts                                  # getMyStudentRecord, getMyChildren, invitePortalUser
src/pages/school-admin/PortalAccessPage.tsx                # admin: grant parent/student portal access
src/pages/parent/ParentPortalPage.tsx                        # child selector + profile/attendance
src/pages/student/StudentPortalPage.tsx                        # own profile/attendance
src/components/shared/SearchBar.tsx                              # debounced search, reusable
```

## What's deliberately still open

- The remaining blanket-RLS tables listed above.
- Document generation (ID cards, admission letters, printable/PDF report cards) — every phase's doc has pointed here; it's real, undone work, not an oversight repeated for effect. It deserves its own pass with a PDF library rather than being squeezed into whichever phase happened to touch adjacent data.
- Bulk CSV student import, subscription/billing plan changes, platform-wide Super Admin analytics.

## This closes the six-phase roadmap

Everything in the original brief has a home now except document generation. If you want to keep going, that's the natural next phase — or, given six phases of untested code, the live walkthrough above.
