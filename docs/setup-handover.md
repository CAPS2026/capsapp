# CAPS App — setup & handover

Everything needed to pick this project up from scratch, on a different machine
or a different account. Kept current as of **4 Sep 2026 (evening)**.

For the *what/why* of the app itself, start at `README.md`, then `docs/caps-rebuild-plan.md`
→ `caps-phase0-features.md` → `schema.md` → `ui-flows.md` → `design.md` in order.
This file is the *where do the accounts live and how do I get back in* reference.

---

## 1. GitHub

- **Repo:** `https://github.com/CAPS2026/capsapp` — owned by the shelter's own
  GitHub account, **`CAPS2026`** (email `capeanimalprotectionshelter@gmail.com`).
- **Collaborator:** `easybeinggreen` (Paul's personal account) has **write** access
  — used by the Claude Code session that's been building this. Grant/accept
  happens under Settings → Collaborators on the repo.
- **Local clone convention:** `C:\Users\green\capsapp` — **deliberately outside
  OneDrive** (a live `.git` folder inside a OneDrive-synced directory risks
  corruption from concurrent sync writes). The OneDrive `Documents\CAPS\` folder
  is Paul's separate working-notes area for the *old* AppSheet system — not
  part of this repo.
- To resume on a new machine: `git clone https://github.com/CAPS2026/capsapp.git`,
  then `gh auth login` (or ensure git credentials can push to CAPS2026), then
  `npm install` inside the folder.

## 2. Supabase (database)

- **Account/org:** a CAPS-owned Supabase account (not Paul's personal one —
  that was deliberately separated on 4 Sep 2026). Org name **"CAPS2026's Org"**,
  org id `llduokiodtecjyvhzfdh`, plan **free**.
- **Project:** **"CAPS App"**, ref **`amozcnlvfcxzeaukgbjb`**, region
  `ap-southeast-2` (Sydney), status ACTIVE_HEALTHY. This is **production** —
  a second free-tier project (`CAPS App staging`) is planned but not yet created.
- **Schema:** applied directly via the Supabase MCP connector (`apply_migration`),
  mirrored as SQL files in `supabase/migrations/` in this repo (see
  `supabase/README.md`). 18 tables, RLS on everything — full design rationale
  in `docs/schema.md`.
- **Connecting a fresh Claude session to it:** in Claude's connector settings,
  authorize the **Supabase** connector as the CAPS Supabase account (sign in
  with the CAPS Supabase login, not a personal one), then `/mcp` to reconnect
  the session. Once connected, `list_organizations` should show only
  "CAPS2026's Org" — if it shows a different org, the wrong account is signed in.
- **Connecting the *app* to it (env vars, not MCP):** the Next.js app needs the
  project URL and a publishable/anon key — fetch via the Supabase MCP
  (`get_project_url`, `get_publishable_keys` for project `amozcnlvfcxzeaukgbjb`)
  or the Supabase dashboard → Project Settings → API. These go in `.env.local`
  locally and in Vercel's Environment Variables in prod — **never commit them**
  (`.env*` is gitignored). The **service-role key** (also in Project Settings →
  API) is more powerful — used only server-side (API routes for registration
  intake, the alerts job) and must never reach the browser bundle or a
  `NEXT_PUBLIC_*` env var.

## 3. Vercel (hosting)

- **Account:** signed in via `vercel login --github` (device-flow OAuth) as
  **`consult-8760`** — tied to the CAPS email, separate from Paul's personal
  Vercel account if he has one.
- **Project:** **`capsapp`**, under `consult-8760`, linked to this repo —
  `vercel link` created it, `vercel git connect` wired it to
  `github.com/CAPS2026/capsapp` for **auto-deploy on every push to `main`**.
- **Live URLs:**
  - Production alias: `https://capsapp-five.vercel.app`
  - Also aliased: `https://capsapp-consult-8760.vercel.app`
  - Per-deploy URLs look like `https://capsapp-<hash>-consult-8760.vercel.app`
- **⚠ Outstanding — Deployment Protection:** the project currently has Vercel's
  default protection enabled, which returns **404 to the public** on the
  production alias (and an SSO redirect on per-deploy URLs) instead of serving
  the site. This is fine for a private in-progress project but **must be
  turned off before real users need the public registration pages**. Fix:
  Vercel dashboard → project `capsapp` → Settings → Deployment Protection →
  set Production to not require authentication (or scope protection to Preview
  only). One click, needs a human in the dashboard.
- **Resuming CLI access on a new machine:** `npm install --global vercel@latest`,
  `vercel login --github` (or whichever method — opens a device-flow URL,
  visit it and approve), `vercel link` inside the cloned repo will find the
  existing `capsapp` project automatically.
- **The Vercel *connector* in Claude** (separate from the CLI) still needs
  authorization if you want a Claude session driving deploys directly via MCP
  — do that in claude.ai connector settings. Not required for normal work:
  pushing to `main` auto-deploys regardless.

## 4. Local development

- **Node** v22, **npm** v10 (whatever's current is fine; no exotic version pin).
- `cd capsapp && npm install && npm run dev` → `http://localhost:3000`.
- `npm run build` to check it compiles before pushing anything significant.
- Stack: Next.js 16 (App Router, Turbopack), TypeScript, Tailwind v4, design
  tokens in `src/app/globals.css` (mirrors `docs/design.md`).
- No `.env.local` committed — recreate it locally with the Supabase URL +
  publishable key (see §2) once API routes / the Supabase client are wired in
  (not yet done as of this doc).

## 5. Where things stand (4 Sep 2026)

- ✅ Phases 0–3 documented (`docs/`): features, schema, UI flows, design.
- ✅ Supabase schema live and verified (migrations 01–09).
- ✅ Next.js app scaffolded, branded (logo/favicon/manifest from the assets
  CAPS2026 added), builds clean, **deployed to Vercel** (blocked from public
  view by Deployment Protection — see §3).
- ⏳ Not yet built: Supabase client wiring, auth, and any real screens (Phase 4
  — see `ui-flows.md` §15 for the build order, starting with the dogs list and
  the take-out/bring-in flow).
- The **old AppSheet system stays live and frozen** in parallel — see
  `docs/caps-system-review.md` and `docs/caps-rebuild-plan.md` §6 for the
  cutover plan. Nothing about this rebuild has touched AppSheet.

## 6. Quick sanity check for a fresh session

1. `gh auth status` — can it push to `CAPS2026/capsapp`?
2. Supabase MCP `list_organizations` — does it show "CAPS2026's Org" only?
3. `vercel whoami` (after `vercel login`) — does it say `consult-8760`?
4. `git -C capsapp log --oneline -5` — matches what's on
   `github.com/CAPS2026/capsapp/commits/main`?

If all four check out, you're fully back in context.
