# Phase 7 — Document Generation

## What this closes out

Every phase's doc since Phase 5 pointed here: ID cards, PDF report cards, and the school branding they depend on. This phase delivers the two most-requested document types end-to-end (Student ID Card, Staff ID Card) plus PDF export on the report card built in Phase 5.

## Another real gap found and fixed

The `schools` table has had an UPDATE policy since Phase 1 — `schools_super_admin_write` — restricted to `auth.is_super_admin()` only. No `school_owner` or `school_admin` has ever been able to update their own school's row, for anything, including the branding fields (`logo_url`, `motto`, brand colors, etc.) that this phase needs to write to.

RLS can't cleanly solve this with a row policy: a policy is all-or-nothing for the whole row, so opening `schools` UPDATE to owners would also let them rewrite their own `status` back to `'active'` right after a suspension — defeating the entire Phase 2 approval/suspension system. So `update_school_branding()` is a narrow RPC that touches only branding columns, exactly the same shape as `update_school_branding` restricting scope the way `create_student` restricts what a teacher can touch in Phase 3.

## Why `school-assets` is a public bucket when everything else is private

Lesson notes, activity media, and passport photos (Phase 4) are private — tenant-confidential, served via signed URLs. Logos, principal signatures, and official stamps are different: they're *meant* to appear on documents that get printed, downloaded, and handed to parents. Making them signed-URL-only would mean re-signing on every document render for zero actual confidentiality benefit — nobody's information is protected by hiding a school's own logo. So `school-assets` is public for reads; write access is still tenant-scoped (only your own school's admins can upload into your folder).

## ID cards: one template, two roles

`IdCardTemplate.tsx` takes a role-agnostic `IdCardData` shape and renders identically for students and staff — same CR80 card layout, same QR code (encoding the admission/staff ID), same branding. `StudentIdCardsPage` and `StaffIdCardsPage` are thin wrappers that fetch the right data and pass it in. Photos come from the `passports` bucket (private, Phase 4) via signed URL — the one piece of a generated document that *does* stay confidential, since a photo is more sensitive than a logo.

`exportElementToPdf()` (`src/lib/pdf.ts`) uses `html2canvas` to rasterize the rendered card, then `jsPDF` to place it centered on a correctly-sized page — CR80 (85.6×54mm) for cards, A4 for the report card. This is the same function both document types call; a third document type just needs a template component and a call to this helper.

## New files

```
supabase/migrations/0007_phase7_documents.sql   # update_school_branding RPC, school-assets bucket + RLS
src/lib/pdf.ts                                    # html2canvas + jsPDF export helper
src/services/branding.ts                            # get/update branding, asset upload
src/pages/school-admin/BrandingPage.tsx               # logo/signature/stamp + school details
src/components/documents/IdCardTemplate.tsx              # shared card layout (student + staff)
src/pages/school-admin/StudentIdCardsPage.tsx               # student ID card + photo upload + PDF download
src/pages/school-admin/StaffIdCardsPage.tsx                   # staff ID card + photo upload + PDF download
src/pages/shared/ReportCardPage.tsx (updated)                   # added Download PDF button
```

Also extended, not new: `services/students.ts` gained passport upload/signed-URL functions, `services/staff.ts` gained the same for staff (stored on `profiles.passport_url`, since a staff photo is identity data, not employment data), and the `School` type in `services/schools.ts` — which was missing `address`, `website`, `motto`, and every branding column despite them existing in the database since Phase 1 — got filled in properly rather than papered over with `as any` casts.

## What's deliberately still open

- **Admission letters, promotion letters, transcripts, certificates** — the brief's other document types. They follow the exact same pattern (a template component + `exportElementToPdf`), but admission letters specifically depend on the Online Admission review workflow, which was never built in any earlier phase — that's a real missing module, not just a missing document.
- **`generated_documents` logging** — the table exists and could record every card/report generated for an audit trail, but wiring it in wasn't done here to keep this phase focused on the documents actually working first.
- **Bulk ID card generation** (whole class at once) — currently one student/staff member at a time; the per-person flow is what needed to exist first.

## Where things stand overall

Every module from the original brief now has real, working code except: Online Admission, the remaining blanket-RLS tables noted in Phase 6, and the "everything else" document types listed above. That's a fair place to either keep building or stop and do the live end-to-end test that's been recommended — and deferred — for three phases running now.
