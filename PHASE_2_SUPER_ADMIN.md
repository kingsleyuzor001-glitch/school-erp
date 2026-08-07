# Phase 2 — Super Admin Module

## What this phase adds

1. **The JWT custom-claims hook** — the missing piece from Phase 1. `auth.school_id()` and `auth.role_name()` (used everywhere in RLS) read from JWT claims; those claims didn't exist until now. `custom_access_token_hook()` reads `role`/`school_id` off `profiles` and stamps them into every token issued.
2. **Self-service school registration** (`register_school` RPC) — a school owner signs up and registers their school in one flow; the school starts `pending`.
3. **Super Admin approval workflow** — approve / suspend / reactivate / delete, each as its own RPC that checks `auth.is_super_admin()` itself and writes to `audit_logs`.
4. **Gating on school status** — `ProtectedRoute` now also checks the *school's* status, not just the individual user's, so a suspended school locks out everyone under it in one move.

## One manual step required

The custom access token hook **must be registered in the Supabase Dashboard** — this can't be done from SQL alone:

`Dashboard → Authentication → Hooks → Customize Access Token (JWT) Claims → select public.custom_access_token_hook → Enable`

Until you do this, `school_id`/`role` claims won't be present and every RLS-protected query will return zero rows (fail closed, not fail open — safe, but confusing if you forget this step).

## Why registration is a SECURITY DEFINER RPC, not a plain insert

A brand-new user has no `school_id` claim yet (their school doesn't exist), so ordinary RLS insert policies can't cleanly authorize them to create a `schools` row. `register_school()` runs with elevated privileges but only performs a fixed, narrow action: create exactly one school + one trial subscription + one `school_owner` profile tied to `auth.uid()`, and it refuses if that user already has a profile. No general-purpose bypass — the function is the boundary.

## Why approve/suspend/etc. are RPCs instead of raw table updates

They *could* be plain `update schools set status = ...` calls under the existing `schools_super_admin_write` RLS policy. They're RPCs instead so that:
- Every action gets an audit log entry automatically, in the same transaction.
- Approving also flips the trial subscription to active — one call, one guaranteed-consistent effect, instead of two separate writes the frontend could forget to pair.

## Token refresh gotcha

At the moment `register_school()` runs, the user's *current* access token was issued before their `profiles` row existed — so it still carries no `school_id`. `services/schools.ts` calls `supabase.auth.refreshSession()` right after registration so the very next request already carries correct claims. Skipping this step is the most common cause of "I just registered and now nothing loads."

## New files

```
supabase/migrations/0002_phase2_super_admin.sql   # hook + RPCs
src/services/schools.ts                            # registration + admin actions
src/pages/auth/RegisterSchool.tsx                   # public signup form
src/pages/auth/PendingApproval.tsx                   # waiting/suspended screen
src/pages/super-admin/SchoolsPage.tsx                 # approve/suspend/delete table
src/routes/ProtectedRoute.tsx (updated)                # now checks school status too
```

## What's deliberately deferred

- Subscription plan management UI (upgrade/downgrade, billing) — trial/active/suspended is wired, paid plan changes come later once a payment provider is chosen.
- Platform-wide analytics and broadcast announcements on the Super Admin dashboard — Phase 2 covers the school lifecycle only.
- Email notifications on approval/suspension (Supabase can trigger these via a Postgres webhook to an Edge Function once you're ready).

## Next step

Phase 3: School Administration — student management, teacher management, classes, subjects, sessions, terms. This is where the school_admin/school_owner dashboards start doing real work.
