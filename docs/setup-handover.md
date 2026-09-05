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
  that was deliberately separated on 4 Sep 2026). Account email is
  **`consult@capeanimalprotectionshelter.org.au`** (changed 5 Sep 2026 from
  the old placeholder `capeanimalprotectionshelter@gmail.com`, which is being
  deprecated — same account/org/project, just an email change, no migration).
  Org name **"CAPS2026's Org"**, org id `llduokiodtecjyvhzfdh`, plan **free**.
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
- **Live URLs (public, working):**
  - Production alias: **`https://capsapp-five.vercel.app`** — the `-five` is
    just Vercel disambiguating because plain `capsapp.vercel.app` is taken by
    someone else globally; cosmetic, fixed properly by adding a real custom
    domain later (Settings → Domains) when ready.
  - Also aliased: `https://capsapp-consult-8760.vercel.app`
  - Per-deploy URLs look like `https://capsapp-<hash>-consult-8760.vercel.app`
    (these stay behind Vercel Authentication/SSO by design — that's normal
    for preview/per-deploy URLs, not a bug)
- **Two setup bugs fixed 4–5 Sep 2026** (both were silently breaking the
  public site — build succeeded, but every Next-rendered route 404'd while
  `public/` static files served fine):
  1. **Deployment Protection (Vercel Authentication)** was on for all
     deployments including production → disabled via the API
     (`ssoProtection: null`). If it's ever back on and you need it off:
     Settings → Deployment Protection in the dashboard, or the same API call.
  2. **Framework Preset was never set** (`vercel link` created the project
     without Vercel's normal "detected Next.js" step, so it was `null` and
     requests never reached Next's routing layer). Fixed via the API
     (`framework: "nextjs"`) + a redeploy. If a project is ever linked this
     way again, check Settings → General → Framework Preset says "Next.js".
  3. Also downgraded `next` 16.3.4 → **15.5.25** while diagnosing (16 is very
     new) and kept it — 15.x is the well-trodden Vercel pairing.
- **Resuming CLI access on a new machine:** `npm install --global vercel@latest`,
  `vercel login --github` (or whichever method — opens a device-flow URL,
  visit it and approve), `vercel link` inside the cloned repo will find the
  existing `capsapp` project automatically.
- **The Vercel *connector* in Claude** (separate from the CLI) needs
  authorization per-session if you want a Claude session driving deploys/
  settings directly via MCP — claude.ai connector settings, signed in as the
  CAPS `consult-8760` account. Not required for normal work: pushing to
  `main` auto-deploys regardless, and the CLI (already logged in as
  `consult-8760` on this machine) can do everything the MCP connector can —
  including project-settings changes like the two bugs above, via
  `https://api.vercel.com` with the token in
  `%APPDATA%\xdg.data\com.vercel.cli\auth.json` (never print or commit it).

## 4. Local development

- **Node** v22, **npm** v10 (whatever's current is fine; no exotic version pin).
- `cd capsapp && npm install && npm run dev` → `http://localhost:3000`.
- `npm run build` to check it compiles before pushing anything significant.
- Stack: **Next.js 15.5.x** (App Router — downgraded from 16 after it broke
  Vercel routing, see §3), TypeScript, Tailwind v4, design tokens in
  `src/app/globals.css` (mirrors `docs/design.md`, matched to the live
  website's palette as of 5 Sep).
- `.env.local` exists locally (gitignored) with `NEXT_PUBLIC_SUPABASE_URL`
  already filled in (derivable from the project ref) but **the two keys are
  still blank** — see the box below. `.env.local.example` in the repo is the
  committed template.

### ⚠ Blocking: Supabase keys not wired in yet
Auth/data code is written (`src/lib/supabase/*`, `src/lib/auth.ts`,
`src/middleware.ts`, `/login`, `/auth/callback`) and **degrades gracefully**
without the keys — public pages serve, protected pages redirect to `/login`,
nothing 500s — but none of it actually works (no real sign-in, no data) until:
1. `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are fetched
   (Supabase MCP `get_publishable_keys`/dashboard → Project Settings → API,
   project `amozcnlvfcxzeaukgbjb`) and put in `.env.local` **and** as Vercel
   project env vars (dashboard → Settings → Environment Variables, or
   `vercel env add`). The service-role key is server-only — never
   `NEXT_PUBLIC_*`, never in a browser bundle.
2. Someone's `people` row exists with `staff` role active — otherwise even a
   successful sign-in lands with no roles (bootstrapping needs DB write
   access, i.e. the Supabase MCP connector reconnected, or the CLI-token
   method used for Vercel doesn't have an equivalent here yet).

## 5. Where things stand (5 Sep 2026)

- ✅ Phases 0–3 documented (`docs/`): features, schema, UI flows, design.
- ✅ Supabase schema live and verified (migrations 01–09).
- ✅ Next.js app scaffolded, branded, builds clean, **deployed to Vercel and
  publicly live** at `https://capsapp-five.vercel.app` (§3 has the two setup
  bugs found and fixed).
- ✅ **Phase 4 slice 1 built**: Supabase Auth wiring (magic link + Google),
  session middleware, the auth-callback that links a sign-in to an existing
  `people` row by email, and a role-gated app shell (bottom nav: Dogs/Site
  always, People/Reports staff-only). Placeholder pages prove the pipeline.
  **Not yet live-tested** — blocked on the keys above.
- ⏳ Next: slice 2, the real Dogs list, once the keys are in and there's at
  least one staff person to sign in as.
- The **old AppSheet system stays live and frozen** in parallel — see
  `docs/caps-system-review.md` and `docs/caps-rebuild-plan.md` §6 for the
  cutover plan. Nothing about this rebuild has touched AppSheet.

## 6. Quick sanity check for a fresh session

1. `gh auth status` — can it push to `CAPS2026/capsapp`?
2. Supabase MCP `list_organizations` — does it show **only** "CAPS2026's Org"
   (`llduokiodtecjyvhzfdh`)? `list_projects` should show "CAPS App"
   (`amozcnlvfcxzeaukgbjb`) — **not** `Plumb`/`greenlight-website`/`step-up`
   (those are Paul's personal projects; seeing them means the connector is
   still bound to the wrong account — see §7 below).
3. `vercel whoami` (after `vercel login`) — does it say `consult-8760`?
   Vercel MCP `list_teams` should return a real team, not `[]`.
4. `git -C capsapp log --oneline -5` — matches what's on
   `github.com/CAPS2026/capsapp/commits/main`?

If all four check out, you're fully back in context.

## 7. MCP connector account-mismatch — history, in case it recurs

Spent a long stretch across 4–5 Sep 2026 with the Supabase and Vercel MCP
connectors resolving to Paul's **personal** accounts no matter how many times
he re-authorized them in claude.ai's connector settings (Supabase kept
showing org `bjiewzffyxrrxssdxhhd` "easybeinggreen"; Vercel `list_teams`
stayed `[]`). Claude's own "Your connectors" settings page shows no
account/org/email identity — just a generic connected checkmark — so that's
not a useful diagnostic if this happens again.

**Actual root cause turned out to be simpler than an OAuth bug:** the
Supabase account was still sitting on the old placeholder email
`capeanimalprotectionshelter@gmail.com` (from before the org had its own
domain). Fixed by changing that account's email in place to
`consult@capeanimalprotectionshelter.org.au` — no new account, no project
migration, same org/project IDs throughout.

**One real gotcha to remember:** after fixing the account, the *same*
Claude Code conversation that had already connected kept showing the old
wrong data even after re-running `/mcp` — it had the token cached from
connect-time. A genuinely **fresh conversation** (not just `/mcp` in the
same one) was needed to pick up the corrected account. If connectors ever
look wrong again, always verify in a brand-new session before assuming
something's still broken upstream.
