# CAPS App — setup & handover

Everything needed to pick this project up from scratch, on a different machine
or a different Claude account. Accounts/access (§1–4, §6–8) current as of
**10 Sep 2026**. **§5 "where things stand" is behind** — People, Registration
and the homecare approval flow have all been built since; see the project
memory file (`~/.claude/projects/C--/memory/project_caps_automation.md`) and
`git log` for the current feature state.

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

### Supabase keys — RESOLVED 5-6 Sep 2026
`NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are wired into
both `.env.local` and all three Vercel environments (production/preview/
development). Auth is genuinely live: magic-link sign-in works end to end
(shouldCreateUser: false — an email with no matching `people` row can't sign
in at all, bounced to `/login?error=not_registered`; this is deliberate, see
§5). Google sign-in is NOT enabled as a provider in Supabase yet (separate,
non-blocking — magic link is the only working path today).

## 5. Where things stand (8 Sep 2026)

**Live and working** at `https://capsapp-five.vercel.app`:

- **Auth** (Phase 4 slice 1): magic-link sign-in, session middleware, the
  auth-callback that links a sign-in to an existing `people` row by email
  and refuses anyone unregistered. Google OAuth not enabled (non-blocking).
- **Dogs list** (`/dogs`, slice 2): status-grouped cards (Walking/Yard/
  Available/Bed Rest/Jail Break/Fostered), sorted longest-since-last-walk
  first, live alert-coloured timers, 3 filter chips (Available/Out now/My
  dogs — single-select).
- **Dog detail** (`/dogs/[id]`, slice 3): public info, Listing/SavourLife
  fields, staff-only panel, activity log (shows walker + out/in times +
  total duration, so it's obvious what a wrong record needs fixing to),
  notes, time-with-CAPS.
- **Take-out/bring-in** (slice 4, `src/lib/actions/dog-activity.ts` +
  `src/components/dogs/*`): one-tap Start Walk / End Walk/Yard/Bed Rest/
  Homecare, a staff-only "⋯" action menu for Start Yard/Bed Rest/Jail
  Break/Foster (each a focused per-type form, not a type-picker), Manual
  entry (a walk that never touched the app), Edit times on any activity row.
  **Kiosk mode**: staff get a "Who's walking?" person-picker instead of the
  fast tap assuming themselves — the real primary workflow is one staff
  member on a shared iPad checking people in/out, not individual self-serve
  logins (those are the rare case, kept as the instant tap for non-staff).
  Yard's due-back is a duration/countdown picker (15min-4hr buttons), not a
  date/time field — other types keep exact date+time (multi-day spans).
- **Site — who's here** (`/site`, slice 8-ish): sign in/out board, any
  registered person or a walk-up guest, reason picker.
- App shell constrained to a phone-width column (`max-w-lg`) even on
  desktop — this is a mobile app first.
- Region: Vercel functions pinned to `syd1` (`vercel.json`) to co-locate
  with the Sydney-region Supabase DB — was a real performance issue before.

**Explicitly paused, not forgotten:**
- **Registration** (`/apply/volunteer`) — still a stub page. Paul is
  unresolved on how to model the volunteer/homecarer distinction and the
  broader registered-vs-self-serve-vs-admin split (see project memory /
  ask him directly) — **do not build registration or People until he says
  go**, both would likely need redoing once that's settled.
- **People** (`/people`) — staff people-management/approval screens, not
  started. Blocked on the same open question as Registration.
- **Mobile visual sizing pass** — Paul flagged card/row height will need
  work once there are ~20+ real dogs (currently only test data). Explicitly
  "hold on that" — a dedicated pass, not something to guess at blind.
- **Logs / Reports / Alerts** (`ui-flows.md` §10-12) — not started. Alerts
  needs a real email provider (Resend) since Supabase's built-in email
  sender is capped at 2/hour project-wide — not yet set up, Paul deferred it.

**Known test-data note:** dogs in the DB are seeded test rows with
deliberately fictional/celebrity names (Beethoven Rex, Lassie, Hooch, Toto,
Old Yeller, Marley, Bolt) — Paul's explicit instruction, so test data is
never confusable with a real shelter dog. **Apply this convention to any
future test data too.** Delete these before real dog data migration.

**Real bugs found and fixed via Paul's live testing this week** (see git log
for full detail, all on `main`): an ambiguous-embed bug that silently broke
role lookups for every sign-in (PGRST201, `person_roles` has two FKs to
`people`); "End Bed Rest" never appearing (button visibility was keyed to
the wrong flag); "Last walk: today" for a walk from yesterday (calendar-day
vs rolling-24h bug); the reverse version of that bug ("Last walk" using
start time instead of end time); a native `<input type="datetime-local">`
that had no explicit confirm step and didn't respect a fixed 24-hour clock
(replaced with a custom date+hour+minute picker); an inline "confirm" UI
that could be tapped-through by a phantom second click on touch devices
(now avoided by using real `<dialog>` modals for any such follow-up).

The **old AppSheet system stays live and frozen** in parallel — see
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
   **The Vercel MCP connector has never resolved correctly** (`list_teams`
   returns `[]`, `get_runtime_logs` 403s, even with the right project/team
   ID passed explicitly) — confirmed still broken as of 8 Sep 2026, unlike
   Supabase's connector which the email fix resolved. Don't spend time
   re-diagnosing this; **the local Vercel CLI is the reliable path for
   everything** (`vercel --prod` to deploy, `vercel logs <url>` for runtime
   logs) and is what every deploy in this project has used. `vercel --prod`
   occasionally (~3 times in one session) returns a transient
   `{"reason":"deploy_failed","message":"Not authorized"}` even though
   `vercel whoami` is fine — just retry once, it's never needed a second
   retry.
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

## 8. Switching Claude Code accounts on the same machine

If you sign into Claude Code with a **different account (different email)** but
stay on **this machine** and **this repo**, it's close to plug-and-play. Almost
everything this project depends on is tied to the *machine* or to *external
accounts*, not to your Claude login.

**Carries over automatically — no action needed:**

| Thing | Why it's unaffected |
|---|---|
| GitHub (`CAPS2026/capsapp`) | Uses `git` / `gh` credentials on the machine |
| Vercel — CLI, deploys, env vars, logs | `vercel login` token lives on the machine (`%APPDATA%\xdg.data\com.vercel.cli\auth.json`); pushes to `main` auto-deploy regardless of who's driving |
| Resend | API key is in Vercel env + `.env.local` — nothing to do with Claude |
| Local repo `C:\Users\green\capsapp` + `.env.local` | Files on disk |
| **Project memory** (`~/.claude/projects/C--/memory/`) | Keyed to the **Windows user + project path**, not the Claude login — same machine + same folder = same memory files |
| `.claude/settings.json`, hooks, `.mcp.json` / MCP server config | On disk under `.claude/` / the repo |

**Needs redoing on the new account:**

- **MCP connectors.** Connector authorizations are per Claude account — the new
  account starts with none. Re-authorize the **Supabase** connector in
  claude.ai → connector settings, signing in as the **CAPS Supabase account**
  (`consult@capeanimalprotectionshelter.org.au`, *not* a personal Supabase
  login). Then open a **fresh conversation** and run the §6 sanity check —
  `list_organizations` must show only "CAPS2026's Org". The old account-mismatch
  saga in §7 was a wrong-email-on-the-Supabase-account problem (now fixed), so a
  clean re-auth on a new Claude account should just work.
- The **Vercel MCP connector** has never resolved and isn't used — skip it; the
  CLI covers everything (§3).
- Any **user-scope plugins/skills** you'd added (e.g. the `vercel` plugin) —
  re-add if wanted. Repo/project-scope skills carry over.

**Does the different login email matter?** Only in three ways, none blocking:
1. Fresh connector-authorization space → the Supabase re-auth above.
2. The new account needs its own **Claude Code entitlement / plan**.
3. Your Claude login email is **unrelated** to the GitHub / Supabase / Vercel /
   Resend account emails — those are all separate and untouched. The Supabase
   connector cares which *Supabase* account you sign it in as, not your Claude
   email.

**In short:** re-auth the Supabase connector as the CAPS account → open a fresh
session → run the §6 check. That's the whole switch. If it's *also* a new
machine, add the §1/§3 clone + `gh auth` + `vercel login` steps and copy
`.env.local` and the `memory/` folder across.
