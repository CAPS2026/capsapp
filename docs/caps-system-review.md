# CAPS system review — full stack, September 2026

**Scope:** the whole live system — Google Forms → Make.com → Google Sheets → AppSheet → Apps Scripts.
**Question asked:** what's redundant, what's fragile, and should we keep-and-improve or rebuild?
**Short answer:** the *data model* is basically right; the *foundations* (Sheets as database, count-based IDs, free-tier AppSheet, no history tables) are not, and they block everything on your roadmap. **Recommendation: staged rebuild on Supabase + a web app.** Detail below.

---

## 0. "The Google Sheet isn't deployed" — clearing that up

`Deployable: No` in the AppSheet doc is **not** about the Sheet. The Sheet is live and is the foundation — data flows through it fine. `Deployable: No` is an AppSheet-only status meaning **the app is running in prototype / free mode**. Consequences of that specific flag:

- Sign-in security (which is turned ON) is not enforced to production standard without a paid plan.
- No SLA, no scaling guarantees, AppSheet can rate-limit or show prototype banners.
- You can't hand it to more users cleanly.

So the Sheet is fine as a *store today*; the *app* on top of it is a prototype that was never promoted. That's a finding, not a filing error.

---

## 1. How the pieces actually connect

```
 CAPS Volunteer Registration Form ─┐
 CAPS Homecare Registration Form  ─┤ (each has a bound Apps Script)
                                   ▼
                    Make.com scenario 6322986  ── ONE shared webhook
                    ├─ Volunteer branch  → writes Volunteers tab, makes Drive folder+doc, emails
                    ├─ Homecare branch   → writes Homecarers tab, makes Drive folder, emails
                    └─ Adoption branch   → not built
                                   ▼
        CAPS_walking_log_MASTER (Google Sheet)         CAPS_volunteer_tracking_sheet
        tabs: Dogs, Volunteers, Walks, Homecare,        (raw volunteer form output;
              Homecarers, Site_Visits                    read by Make only, one-way)
                                   ▲
                    AppSheet "CAPS Dog Enrichment App"
                    - reads/writes MASTER directly (as app creator, no row security)
                    - 257 columns, 10 slices, 58 views, 53 actions, 4 bots
                                   ▲
        Apps Script `sortDogsByLastWalk` on MASTER — timer, reorders Dogs rows
```

Two sources of truth (`MASTER` and `volunteer_tracking_sheet`), joined only by Make, one direction. Edits made in the app never flow back to the tracking sheet.

---

## 2. Redundant / dead — safe to remove

| # | Item | Why it's dead | Risk if left |
|---|---|---|---|
| ~~R1~~ | ~~`Dogs.Total Days with CAPS` = `=999`~~ — **FIXED 03/09/2026** | Was hardcoded `999` → every dog card showed a fake ~"2 Y 8 M". App formula now: `=IF(ISBLANK([Arrival Date]), 99999, IF([Status]="Exited", HOUR(DATE([Exit Date]) - DATE([Arrival Date]))/24, HOUR(TODAY() - DATE([Arrival Date]))/24))` | Real elapsed days where arrival known; "Time unknown" where not. Applied via legacy editor, saved, app green. |
| R2 | `Volunteers.Total Days with CAPS` **and** `Total Days with CAPS (Live)` | Identical formulas, two columns | Double maintenance, drift |
| R3 | `Walks.Test_Order`, `Walks.Dog Status Card` | "Test_" leftover; `Test_Order` re-implements the Dog_ID picker ordering | Confusion; extra recompute per row |
| R4 | `_Per User Settings` table — `Option 1..9`, `Country Option`, `Language Option` | AppSheet sample-app boilerplate, never referenced | Noise; looks like real config |
| R5 | `Volunteers.Homecare Approved` (Enum "H - Homecare Approved") | Superseded by `jailbreak_approved` / `foster_approved`; only still read by `Full Volunteer Name` | Stale approval signal |
| R6 | `Volunteers.jailbreak_approved` / `foster_approved` / `experience` / `ec_*` / `medical_issues` / `under_18` | Homecare is now its own stream (`Homecarers` table). The J/F on Volunteers is frozen in time and no longer maintained | People read it as current when it isn't |
| R7 | `Dogs.Last Homecare Start Date` (`initial: TODAY()`) | Nothing writes it now; card subtitles read `[Latest Homecare Event].[Homecare Start]` instead | Dead column, misleading name |
| R8 | `Homecare.Volunteer_ID` (old carer link) | Transitional. `Carer` virtual column coalesces old (`Volunteer_ID`) + new (`homecarer_id`). Once the backfill lands and open volunteer-era stints close, it's dead weight | Two carer fields to keep straight |
| R9 | `sortDogsByLastWalk` Apps Script | AppSheet's own view sort (`Dogs` view SortBy `Sort_Days_Since_Last_Walk`) does the same job | A timer job silently reordering the sheet under everything else |
| R10 | Manual column lists in the 5 Dogs slices (~25 cols each, retyped) | Every new Dogs column must be added to each slice or it's silently missing | Quiet data omissions |
| R11 | 58 views | ~35 are auto-generated `_Detail` / `_Form` / `_Inline` per table+slice. Normal for AppSheet, but only ~15 are real screens | Hard to see the actual UX surface |

---

## 3. Fragile — ranked by how likely it bites

### F1 — Count-based IDs (live time-bomb, same class as the HC99→HC00 bug you already hit)
- `Dogs.Dog_ID` = `"D" & RIGHT("000" & (22 + COUNT(SELECT(Dogs[Dog_ID], LEFT([Dog_ID],1)="D")) + 1), 3)`
- `Volunteers.Volunteer_ID` = `"V" & RIGHT("00" & (COUNT(...) + 1), **2**)` ← **only 2 digits; overflows at V99 → V00 → collision → silent row overwrite**, exactly like Milo/Reba on HC.
- **And** Make generates `V`/`HCR` IDs *its own way* ("find last ID + 1"). Two independent generators for the same tables. They *will* diverge — one path counts rows, the other reads the max.
- Concurrent add from two tablets, or a stale offline client, produces a duplicate key. Sheets has no unique constraint to stop it.

### F2 — Google Sheets as the database
No primary keys, no foreign keys, no transactions, no uniqueness, row-order-sensitive (a script literally reorders rows). Every multi-writer bug we've spent days on this month traces back here. AppSheet + Make + the sort script + humans all write the same cells.

### F3 — String-parsing pickers keyed on display text
- `Walks.Dog_ID` = `LOOKUP(LEFT([Dog_Picker], FIND(" | ", [Dog_Picker]) - 1), "Dogs", "Dog Name", "Dog_ID")` — parses the dog's name out of a label string. Breaks if the label format changes or a name contains `" | "`.
- `Homecare.Homecare_Dog_Picker` Valid_If selects **Dog Name**, not Dog_ID. You have **two dogs called "Cookie"** right now → ambiguous checkout, wrong dog gets the status change.

### F4 — Date math as `HOUR(a - b) / 24` everywhere, with no null guard
`Homecare_Stats_Label`, `Dynamic Card Subtitles`, `Days_Since_last_Walk`, `Total Days with CAPS (Live)` all do this. When `Due Back` / `Check In` is blank you get large or negative day counts printed on cards ("Ds Due:-4"). Timezone-sensitive.

### F5 — One Make webhook multiplexing Volunteer + Homecare + Adoption
Router branches share one entry point. A malformed payload or one branch erroring has historically bundle-failed the others (the ~25 unexplained `BundleValidationError` executions). No dead-letter / retry.

### F6 — AppSheet structural fragility
Any single red error on any table makes the **whole** app definition uncompilable ("changes couldn't be saved"). Regenerate wipes manual column config. You've lost hours to this twice. It gets worse as the app grows.

### F7 — No row-level security, "run as app creator"
Every signed-in user can edit or delete every row — any dog, any volunteer, any homecarer. Fine for 3 trusted staff; a real hazard the moment the user list grows or someone fat-fingers a delete.

### F8 — Bed Rest is fields on Dogs, not events
`Bed Rest Start / End / Due Back` are single columns on the Dogs row. A dog's bed-rest history is only ever its most recent episode — no log, no analysis. This is the exact pattern Homecare was moved *away* from; Dogs still has it.

### F9 — Two source-of-truth sheets, one-way sync
`volunteer_tracking_sheet` and `MASTER` only converge through Make. App-side edits don't propagate back. Reconciling them is manual (we just did a big one for Homecarers).

---

## 4. Against the roadmap you named

| You want | Today | Verdict |
|---|---|---|
| **Dog sign-in / check-out** | Exists (Walks + bots), but rides on F1/F3/F4 and Sheets writes | Works ~80% of the time; the failures are silent and annoying to chase |
| **Data analysis** | Nothing real. `Total Days = 999`, Bed Rest has no history, no query layer. Analysis = hand-built pivot tables | Not possible without new history tables + a real DB |
| **Alerts for not signing back in** | Not built. AppSheet *can* do a scheduled bot, but needs reliable timestamps (F4) and a delivery channel that isn't set up | Buildable on either stack, but needs the timestamp fragility fixed first |
| **Dog profiles** | Dogs table has the basics + one `Medical Notes` text field | Thin. No photos structure, no structured history |
| **Notes for users / per-user notes** | None | New tables needed |
| **Medical history** | One free-text `Medical Notes` column — not a history | New `dog_medical_events` table needed |

Four of six need new tables and a real query layer. That's a schema change either way — the question is whether you make it in Sheets (which makes F2 worse) or in a proper database.

---

## 5. The two options, honestly

### Option A — Keep AppSheet + Sheets, patch it
**Do:** convert `Dog_ID` / `Volunteer_ID` to `UNIQUEID()` (like `Homecare_ID` already is); delete R1–R11; kill the sort script; add security filters; add history tables *as new tabs* for Bed Rest + medical; add a scheduled overdue-alert bot; split the Make webhook into three.

**Buys you:** the ID time-bomb defused, less dead weight, basic alerts, ~2–4 weeks of stability.

**Doesn't fix:** still Sheets (F2 — concurrency, no constraints, row-order); still free-tier AppSheet (F6, F7, no real deploy); still no analytics engine; still painful and slow to change; every hour spent here is an hour not spent on the thing you've said you want to build. It's lipstick on the substrate.

### Option B — Staged rebuild (recommended)
Keep the current app **running and frozen** (no new features, no risky edits). In parallel:

1. **Schema on Supabase** derived from `appsheet-current-state.json` — same entities (Dogs, Volunteers, Walks, Homecare, Homecarers, Site_Visits) but with real PKs/FKs, `bed_rest_events` and `dog_medical_events` as proper history tables, `user_notes`, and computed values as views not stored junk.
2. **Migrate** the current Sheet data in (one-off scripts; I can do this directly now).
3. **Web app** (Vercel + installable PWA) — feature by feature: dog list + status, check-in/out, homecare checkout/return, site visits, volunteer/homecarer admin. Optimistic writes (fine now that the shelter has Starlink + a tablet — confirm with the caretakers).
4. **Fold Make into one webhook function** in the same codebase — form POST → insert row → Drive folder → email. Drop the Make subscription.
5. **Analytics + alerts** fall out of a real DB almost for free: overdue-return alerts, walk-frequency reports, length-of-stay, carer load.
6. **Parallel-run**, reconcile daily, cut over, keep AppSheet read-only as a safety net for a few weeks.

**Cost:** real work — weeks, not days — and you own a deployment afterward (hosting is ~$0 on free tiers but it's code now, and someone is the "it broke" contact). **I can build and change it directly** once the stack decisions are made, which is the thing that was never true for AppSheet.

---

## 6. Recommendation

**Go Option B, staged.** Reasons, in order:

1. Everything you listed for the roadmap (analysis, alerts, medical history, profiles, notes) needs new tables and a query layer. Adding those to Sheets deepens the exact fragility (F2) that's cost you the most time this month.
2. The current app is a **prototype that was never promoted** — no enforced security, no deploy tier, one-error-breaks-everything. That's not a base to build a shelter's operational system on.
3. You've already decided to leave AppSheet, Supabase is available to me right now, and the offline constraint that would have made this hard has probably gone away (Starlink + tablet).
4. Option A's stability gains are real but temporary, and the effort is largely throwaway.

**But** do the two cheap safety fixes on the live app now regardless, because the rebuild will take weeks and the live app has to survive them:
- **`Volunteer_ID` → `UNIQUEID()`** (it's 2-digit and the closest to overflowing — this is the urgent one). — ✅ **AppSheet side done 03/09/2026:** `Volunteers.Volunteer_ID` initial value is now `CONCATENATE("V", UNIQUEID())` (matches `Homecare_ID`), saved, app green. Existing `V0xx` rows untouched; new app-created rows get `V`+random. **Still to do:** Make's volunteer branch still generates count-based `V0xx` — needs the same change there (separate Make edit, needs an API token).
- **Split the Make webhook** into three, or at minimum add error isolation so one branch can't bundle-fail the others.

---

## 7. What I need from you to start Option B

1. **Confirm the offline answer** with the caretakers (tablet-on-Starlink for real check-in/out = yes?).
2. **Authorise the Vercel connector** in your claude.ai connector settings (Supabase is already available to me).
3. A **Supabase project** (free tier) — I can create one via tooling once you say go, or you make it and share the keys.
4. Decide: do you want Sheets kept as a **read-only mirror** for anyone who likes working in spreadsheets, or a clean break?
5. Green-light me to write `caps-rebuild-plan.md` (the phase-by-phase build plan) and start the schema.
