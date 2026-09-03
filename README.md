# capsapp

The rebuild of the CAPS (Cape Animal Protection Shelter, Weipa QLD) dog-enrichment system —
replacing the current AppSheet + Google Sheets + Make.com stack with a single web app.

## Stack

| Layer | Choice |
|---|---|
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (magic link + Google) |
| App + API | Next.js on Vercel (PWA) |
| Public forms | in-app HTML pages |
| Email | Resend |

Make.com is removed; its intake/approval job becomes serverless functions in this repo.

## Where things are

- `docs/` — planning and reference documentation
  - `caps-rebuild-plan.md` — stack, decisions, phases, cutover
  - `caps-phase0-features.md` — entities, workflows, screens, v1 scope
  - `caps-system-review.md` — review of the current system (redundancy, fragility, keep-vs-rebuild)
  - `appsheet-current-state.md` / `.json` — full spec of the current AppSheet app (the rebuild target)
  - `system-overview.md` — entry point to the current-system docs
  - `*-current-state.md`, `homecare-redesign.md`, `homecarers-backfill-discrepancies.md` — per-area detail
  - `caps-scripts-reference.md` — the current Apps Scripts, verbatim
  - `reference/` — raw artifacts: the AppSheet documentation export, Make blueprint snapshots

## Status

Current AppSheet app is **frozen** and stays live until cutover. Build in progress: Phase 1 (schema).
