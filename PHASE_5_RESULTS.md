# Phase 5 — Result Management

## The workflow, as three separate RPCs

`submit_results()` (teacher) → `approve_results()` (principal/VP) → `publish_results()` (admin), matching the brief exactly. Each is a batch operation over a whole `(class, subject, term)` — or for publishing, a whole `(class, term)` across all its approved subjects — rather than row-by-row, so a page refresh mid-action can't leave some students published and others not.

**Important asymmetry to know about:** `submit_results`/`approve_results` operate per subject, but `publish_results` operates per class+term (all approved subjects at once) — publishing is naturally a "release the whole report card" action, not a per-subject one. The Publish queue page reflects this: it groups by class only and labels the action "All approved subjects," rather than implying each row publishes just that one subject.

## Grading is computed by trigger, not by the frontend

`compute_result_grade()` runs `BEFORE INSERT OR UPDATE` on `result_scores` and sets `grade` from the four raw score fields — not from the `total_score` generated column, deliberately: a `BEFORE` trigger fires before Postgres finalizes that row's own generated columns, so reading `NEW.total_score` there would see a stale/null value. The trigger recomputes the same sum itself instead.

It looks up the school's `grading_scale` first, and only falls back to the hardcoded default Nigerian bands (70=A … 0–39=F) if the school hasn't customized one. `seed_default_grading_scale()` — now called automatically from `approve_school()` — means every school has a working scale from the moment they're approved, without you needing to remember to set one up.

## Why report cards need a SECURITY DEFINER function, not a client query

"Position in class" requires comparing a student's total against every classmate's total — but a parent's RLS access correctly stops at their own child, so a plain client-side query physically cannot see the data needed to compute a rank. `get_report_card()` solves this the same way `custom_access_token_hook` does: it runs with elevated rights to do the aggregation internally, checks the caller's authorization itself (admin, principal, the class's homeroom teacher, the student's own guardian, or the student themself), and returns *only* that one student's subject breakdown plus the computed number — never the classmates' raw scores that made the ranking possible.

It also automatically restricts non-privileged viewers to `status = 'published'` rows — a parent or student calling this before publish day just gets an empty subject list, not an error, not a peek at drafts.

## `result_scores` gets the same RLS tightening as Phase 4

Same reasoning as the Phase 4 note: teachers can only insert/edit scores for classes they actually teach, and only while `status = 'draft'` (once submitted, edits go through the workflow, not a direct table update). Parents/students can only ever *select* rows where `status = 'published'`.

## New files

```
supabase/migrations/0005_phase5_results.sql   # grading trigger, workflow RPCs, get_report_card
src/services/results.ts                        # score entry, workflow calls, report card fetch
src/pages/teacher/ResultsEntryPage.tsx           # score grid with live total, save draft / submit
src/pages/shared/ResultsWorkflowPage.tsx           # ApproveResultsPage + PublishResultsPage (one queue component, two exports)
src/pages/shared/ReportCardPage.tsx                # student/parent/admin report card view
```

## One assumption worth flagging

`get_report_card` resolves "is this my own record" via `students.profile_id = auth.uid()` — which only works for students who've actually been given a portal login (a `profiles` row linked back to their `students` row). Phase 3 created students as plain records; linking a student to a login account is Phase 6's job (student/parent portal). Until then, `ReportCardPage` works correctly for admin/principal/teacher/parent viewers, but a student trying to view their own card needs that link to exist first.

## What's deliberately deferred

- Editing `report_card_comments` (principal/class-teacher comment entry) — the table and the report card read-path both exist; a small entry form for it is a quick follow-up.
- PDF/printable report card rendering — this phase gets the *data* fully correct (scores, grading, positions, comments); Phase 5's original brief item "PDF Report Card, Printable Report Card" is really a document-generation concern that belongs with ID cards and admission letters. I'd suggest bundling all of those into one "document generation" pass rather than doing report-card PDFs in isolation now and ID cards later with different tooling.
- Result editing/correction after publish (admin override) — deliberately not built casually; if you want it, it should write to `audit_logs` with an explicit "correction" action, not just an update.

## Next step

Phase 6: Parent Portal, Student Portal, and final optimization/security review/deployment — including the student-profile link this phase's report card feature depends on.
