# Supabase

**Project:** CAPS App — ref `amozcnlvfcxzeaukgbjb` — region ap-southeast-2 (Sydney) — org "CAPS2026's Org" (free plan).
This is **production**. A separate `CAPS App staging` project comes later.

## Migrations

`migrations/` holds the schema, applied in filename order. As of 2026-09-04 the
project is at `09_restore_helper_grants` (see `docs/schema.md` for the design and
rationale). The files here match the migration history in the Supabase project,
so once the Supabase CLI is set up locally, `supabase migration list` will show
them all as applied.

Applying a new migration: add a `YYYYMMDDHHMMSS_NN_name.sql` file here and run it
against the project (Supabase CLI `supabase db push`, or the dashboard SQL editor,
or the MCP `apply_migration`).

## Outstanding advisory notes (all WARN, accepted)

- `citext` extension is in the `public` schema. Cosmetic; moving an in-use
  extension carries risk, left as-is.
- `current_person_id` / `has_role` / `is_staff` are executable by `authenticated`
  via `/rest/v1/rpc/*`. Required — RLS policy evaluation needs it. They return
  null/false for non-staff, so nothing leaks. `anon`/`public` are revoked.

## Keys & config

The project URL and publishable/anon key go into the app's environment
(`.env.local` locally, Vercel project settings in prod) — never committed.
The service-role key is used only by server-side API routes (registration
intake, scheduled alert job) and must never reach the browser.
