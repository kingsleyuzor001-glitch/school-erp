# Phase 8 — App Shell (critical fix) + Online Admissions

## The bigger issue, found first

Before touching Admissions, a check turned up something more serious: across seven phases, dozens of pages, services, and RPCs were built — but the project never had an `index.html`, `src/main.tsx`, `src/App.tsx`, a Login page component, an Account Suspended page, or any navigation connecting pages to each other. `npm run dev` would have failed immediately; nothing built in Phases 1–7 was ever reachable by a browser.

This got fixed first, since Admissions built on top of a non-functional shell would just be one more unreachable page.

**What was added:**
- `index.html` / `src/main.tsx` — the actual Vite entry point and React root, missing since Phase 1.
- `src/pages/auth/LoginPage.tsx` — real auth UI existed only in the abandoned single-file demo; the React project never got one.
- `src/pages/auth/AccountSuspendedPage.tsx` — `ProtectedRoute` has redirected here since Phase 1; the page didn't exist.
- `src/components/layout/AppLayout.tsx` — role-aware sidebar navigation. Without it, every page from every phase was an island with no link to any other.
- Three dashboard landing pages (`school-admin`, `principal`, `teacher`) built on a shared `QuickLinksDashboard` component, since `ROLE_HOME` (Phase 1) pointed at `/…/dashboard` routes that never had anything behind them.
- `src/App.tsx` — the router. Every page from every phase is wired in here, grouped by the `allowed` roles `ProtectedRoute` already supported (that prop existed since Phase 1 but was never actually used by a router, because there was no router).

One routing decision worth flagging: `/pending-approval` and `/account-suspended` sit behind a lighter `RequireSession` guard, not the full `ProtectedRoute` — wrapping them in `ProtectedRoute` would create a redirect loop, since those pages *are* what `ProtectedRoute` redirects to when it blocks someone.

## Online Admissions

The one brief module with zero code behind it until now. The defining difference from every other feature built so far: **the applicant has no account.** Every table's RLS up to this point assumes a logged-in user with a `school_id` JWT claim — admissions needed a genuinely different pattern.

- **`get_school_by_slug()` / `get_public_school_classes()`** — narrow, `SECURITY DEFINER` functions granted to the `anon` role, exposing just enough (which school, which classes) for the public form to render, without opening `schools` or `classes` to anonymous reads generally.
- **Anonymous INSERT, never anonymous SELECT** — an applicant can submit an application and upload files, but can never read another applicant's submission, even by guessing a path. This is enforced at both the table (`admission_applications`) and storage (`admission-uploads` bucket) level, scoped to `sc.status = 'active'` schools only.
- **One numbering sequence, not two** — `approve_application()` generates the admission number through the exact same `next_counter(..., 'admission')` counter that direct student creation (Phase 3) uses. A school approving both walk-in registrations and online applications never gets colliding or out-of-sequence numbers.
- **Approval creates the student atomically** — `approve_application()` inserts the `students` row, generates the number, links `admission_applications.student_id` back to it, and updates status, all in one transaction. Rejection is a single-field update with an optional reason, logged to `audit_logs` either way.

## New files

```
index.html  src/main.tsx  src/App.tsx
src/pages/auth/LoginPage.tsx
src/pages/auth/AccountSuspendedPage.tsx
src/components/layout/AppLayout.tsx
src/components/layout/QuickLinksDashboard.tsx
src/pages/school-admin/DashboardPage.tsx
src/pages/principal/DashboardPage.tsx
src/pages/teacher/DashboardPage.tsx
supabase/migrations/0008_phase8_admissions.sql
src/services/admissions.ts
src/pages/public/ApplyPage.tsx           # public, no auth — route: /apply/:schoolSlug
src/pages/school-admin/AdmissionsPage.tsx  # admin review queue
```

## How to actually reach the public application form

Each school's link is `https://yourdomain/apply/<school-slug>` — the slug is the one generated automatically at registration (`register_school()`, Phase 2). There's no admin UI yet to display/copy that link from within the app; for now it needs to be read from the `schools.slug` column directly. Worth adding as a small addition to the Branding page.

## What's deliberately still open

- **Admission letters** — the one document type Phase 7 explicitly deferred pending this module. Now that applications exist, it's a straightforward addition: a template component (same pattern as `IdCardTemplate`) plus a "Download admission letter" button on approved applications in `AdmissionsPage`.
- **Displaying the public application link in-app** (see above).
- **`generated_documents` audit logging**, still not wired in from Phase 7.
- The remaining blanket-RLS tables from the Phase 6 security review (`staff`/`profiles` broad read, `subscriptions`/`audit_logs` visible to all staff).

## Where things stand

With this phase, every module in the original brief has real code, and — for the first time — a way to actually run and click through it. The honest next step really is the live test that's been deferred since Phase 4: register a school through the real `/register` flow, approve it as super admin, invite a teacher, enroll a student both manually and through `/apply/<slug>`, mark attendance, run a result through the full workflow, and generate an ID card. That first end-to-end pass is where anything still wrong — and after eight phases of unexecuted code, something likely is — will actually surface.
