# School ERP — Project Summary

Eight build phases, documented individually in `PHASE_1_ARCHITECTURE.md` through
`PHASE_8_APP_SHELL_AND_ADMISSIONS.md`. This file is the map across all of them —
what exists, what to run, and what's honestly still missing.

## Setup, in order

**Supabase:**
1. Create a project.
2. Run every file in `supabase/migrations/` in order, `0001` through `0008`, in the SQL Editor.
3. Register the JWT hook: **Authentication → Hooks → Customize Access Token (JWT) Claims → `public.custom_access_token_hook`**. Nothing role-restricted works without this — RLS fails closed (empty results), not open, so the symptom is "everything looks empty," not an error.
4. Deploy both Edge Functions:
   ```
   supabase functions deploy invite-staff
   supabase functions deploy invite-portal-user
   ```
5. Manually create the first `super_admin` — sign them up in Authentication → Users, then insert their `profiles` row by hand with `role = 'super_admin'`, `school_id = null`. There's no self-service path for this on purpose (see Phase 2 doc).

**Frontend:**
1. `cp .env.example .env`, fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. `npm install && npm run dev` locally, or connect the repo to Netlify (`netlify.toml` already handles build + SPA redirect).

## What each phase built

| Phase | Delivered |
|---|---|
| 1 | Multi-tenant schema, RLS foundation, auth context, design system primitives |
| 2 | School registration/approval, subscriptions, JWT custom claims hook |
| 3 | Students, staff (via Edge Function invite), classes/subjects/sessions/terms |
| 4 | Attendance, lesson notes, announcements, school activities, tenant-scoped file storage |
| 5 | Result entry, auto-grading, submit→approve→publish workflow, report cards |
| 6 | Parent/student portal accounts, RLS security review, debounced search |
| 7 | School branding, student/staff ID cards (QR code), PDF export |
| 8 | **App shell (router, layout, login — the project couldn't actually run before this)**, online admissions |

## A pattern worth naming, since it repeated across nearly every phase

Almost every phase's doc opens with "found and fixed a gap from an earlier phase." That's not a formatting habit — it's what actually happened: RLS too broad in Phase 1 (fixed in 4/5/6), `schools` UPDATE unreachable by owners since Phase 1 (fixed in 7), a report card bug from Phase 5 (fixed in 6), a broken app entry point that existed for seven phases before anyone could have run the app to notice (fixed in 8), a self-inflicted edit bug caught by the same brace-balance check that's been run after every phase since Phase 3. None of this was caught by running the software — none of it has been run — it was caught by static review each time, which is a real check but a categorically weaker one than actually executing the code.

That's the honest headline for this whole project: it is thorough, internally consistent, and has never once been started with `npm run dev` against a live Supabase project. Static review is good at catching wiring mistakes (wrong import, wrong RPC argument, mismatched types) and was run rigorously every phase. It cannot catch what only Postgres, a real browser, and a real click can show you.

## Feature checklist against the original brief

**Done:** multi-tenant architecture & isolation, all 8 role dashboards, authentication (including forgot/reset/idle-logout), student & staff management, online admissions, attendance, result management with grading/workflow/report cards, lesson notes, announcements, school activities, document generation (ID cards, admission letters, report card PDFs), school branding, parent & student portals, responsive Tailwind UI, Netlify deployment config.

**Not done, and not quietly dropped — each named in its phase's doc:**
- Promotion letters, transcripts, certificates (same template pattern as ID cards/admission letters — quick to add, just not built)
- Bulk CSV student import
- Subscription/billing plan management beyond trial→active→suspended
- Platform-wide Super Admin analytics dashboard
- Remaining blanket-RLS tables: `staff`/`profiles` (any staff member can read any colleague's profile), `admission_applications` review access is correctly scoped but `subscriptions`/`audit_logs` are still school-wide-staff-readable rather than admin-only
- Attendance/result analytics rollups (daily/weekly/term aggregates) — raw data is correct and complete; dashboards summarizing it aren't built
- Dark mode (tokens exist in `tailwind.config.js`, `darkMode: "class"` is set, no toggle UI built)

## The one thing I'd actually insist on before this touches real users

Run it. Register a school through `/register`, approve it as super admin, invite a teacher through the staff flow, enroll a student both manually and through `/apply/<slug>`, mark attendance, take one result through submit→approve→publish, generate an ID card and an admission letter, log in as the resulting parent/student portal accounts. That's roughly 45 minutes and it is the only step in this entire project that has never happened. Everything above this line is what static review can promise; only that walkthrough can actually confirm it works.
