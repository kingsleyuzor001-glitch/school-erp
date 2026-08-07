# Phase 1 — Architecture, Auth, Database, Design System

## Stack chosen

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite + TypeScript | Ships as static assets → deploys cleanly to Netlify, no server to run. Vite gives fast dev/build. |
| Styling | Tailwind CSS | Fast to build consistent, responsive UI; tokens defined once in `tailwind.config.js`. |
| Backend | Supabase (Postgres + Auth + Storage + Realtime) | Gives us a managed relational DB, JWT-based auth, file storage for passports/ID cards/videos, and — critically — **Row-Level Security**, which is the right primitive for hard tenant isolation. Avoids standing up and securing a custom API server for Phase 1. |
| Routing | React Router v6 | `ProtectedRoute` enforces role-based access per top-level path. |
| Documents | jsPDF + html2canvas (client) now; can move to a Supabase Edge Function for server-side generation later if volume grows | Report cards, ID cards, admission letters as downloadable/printable PDFs. |

## Multi-tenancy: how isolation is actually enforced

Two layers, not one:

1. **Every tenant table has `school_id`** (see `supabase/migrations/0001_core_schema.sql`).
2. **Row-Level Security policies** on every one of those tables restrict `select/insert/update/delete` to rows where `school_id = auth.school_id()`, where `auth.school_id()` reads a custom claim embedded in the user's JWT at login. `super_admin` bypasses this via `auth.is_super_admin()`.

This means isolation is enforced **at the database**, not just in application code — even a bug in the frontend query can't leak another school's rows, because Postgres itself rejects it. The `ProtectedRoute` component in the frontend is a UX convenience (redirects people to the right dashboard); it is explicitly *not* the security boundary.

To make `auth.school_id()` and `auth.role_name()` work, Phase 2 will wire up a Supabase Auth Hook (or a `profiles` trigger) that stamps `school_id` and `role` into the JWT custom claims whenever a user logs in.

## Folder structure

```
school-erp/
├── supabase/migrations/     # SQL schema + RLS, versioned
├── src/
│   ├── components/
│   │   ├── ui/               # Design-system primitives (Button, Card, ...)
│   │   ├── layout/            # Shells: sidebar, topbar, dashboard layout
│   │   └── shared/             # Cross-role composites (DataTable, SearchBar, ...)
│   ├── pages/
│   │   ├── super-admin/ school-admin/ principal/ teacher/ parent/ student/ auth/
│   ├── contexts/AuthContext.tsx   # session, profile, idle-logout
│   ├── routes/ProtectedRoute.tsx  # role-based route gating
│   ├── lib/supabase.ts            # single Supabase client instance
│   ├── types/                     # shared TS types (roles, domain models)
│   ├── hooks/  services/  utils/  constants/
```

Each role's pages live in their own folder so permissions and layout stay obviously scoped — a teacher page can never accidentally import a super-admin-only service.

## Database design highlights

- **Platform-level tables** (`schools`, `subscriptions`, `platform_announcements`) have no `school_id` — they're owned by the Super Admin layer.
- **Tenant tables** all carry `school_id` with a `references schools(id) on delete cascade`, and the loop at the bottom of the migration applies identical RLS policies to all of them — one pattern, no per-table drift.
- `result_scores.total_score` is a **generated column**, so totals can never drift from their inputs.
- `student_history` and `subscriptions` give an auditable trail for promotions/transfers and billing state.
- `audit_logs` captures actor, action, entity, and metadata for the security/audit requirement.

## Auth & RBAC

- `AuthContext` wraps Supabase auth state, loads the user's `profiles` row, and enforces a 20-minute idle auto-logout (configurable).
- `types/auth.ts` centralizes the role list, each role's default landing route (`ROLE_HOME`), and which roles may enter which route prefix (`ROUTE_ACCESS`) — one source of truth instead of scattered `if (role === ...)` checks.
- Password reset/forgot-password will use Supabase's built-in email flow in Phase 2 (`supabase.auth.resetPasswordForEmail`).

## Design system

- Tokens live in `tailwind.config.js`: a teal `brand` scale (default) + amber `accent`, `Sora` for display type, `Inter` for body — deliberately not the generic "cream + terracotta" AI-default palette. Each school's actual brand colors (`schools.brand_primary_color`) will override these at runtime via CSS variables in Phase 3, once school branding upload exists.
- `Card`, `StatCard`, and `Button` in `src/components/ui/` are the first primitives; every dashboard in later phases composes from these so the product feels like one system, not eight different screens.
- Reduced-motion is respected globally in `index.css`.

## Deployment

- `netlify.toml` builds with `npm run build` and publishes `dist/`, with an SPA redirect rule so React Router's client-side routes don't 404 on refresh.
- Environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are set in Netlify's dashboard, never committed — `.env.example` documents what's needed.

## What's deliberately deferred to later phases

- Actual page implementations (dashboards, tables, forms) — Phases 2–6, one module at a time as you specified.
- The JWT custom-claims hook that populates `school_id`/`role` (Phase 2, alongside school registration/approval).
- Storage bucket policies for passports/documents/videos (Phase 2/4).
- Report card / ID card generation logic (Phase 5).

## Next step

Phase 2: Super Admin module — school registration, approval workflow, subscription management, and the JWT claims hook that makes the RLS policies above actually resolve `school_id`. Say the word and I'll build it.
