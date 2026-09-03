# Homecare Redesign — Design Doc

**Date:** 31 August 2026
**Status:** **BUILT & TESTED — pushed to the live scenario 1 September 2026.** Intake + all 3 approval paths verified end-to-end (HCR001–HCR004 test rows). Blueprints saved: `volunteer-registration.blueprint.pre-homecare.json` / `.post-homecare.json`.
**Author:** drafted in Claude Code with Paul.

## Build result (1 Sep 2026)

New module IDs: **205** createAFolder, **206** filterRows (find last HCR), **207** SetVariable2, **208** addRow, **209** filterRows (decline), **210** updateRow (decline, +Resume id 53). Deleted: 33, 40, 41, 42. Edited: 35, 43, 38, 45, 47, 50, 48, 49, + module 1 (added `hcr_id` to interface).

Test results — 4 intakes + 4 approvals, all executions status 1:
- Intake: folder in `03 Homecare/01 Homecare Applications`, doc merged, `Homecarers` row with all 34 fields, `folder_id` linked, `status=Pending`. 7 ops.
- `approve_both` → `J`+`F`+`Active`+`start_date`, matched by `hcr_id`. `approve_jb` → `J`+`Active`. `decline` → `status=Declined` (row kept). 4 ops each.

**⚠ Numbering not yet seeded.** The test rows are HCR001–HCR004 because the sheet was empty. Make's counter is `max existing HCR + 1`, so **the next real application would get HCR005** — inside the mirror range. Before go-live, do the §6 backfill (assign HCR500+ to pure homecarers, HCR0XX-mirror to dual ones) or add one seed row at `HCR500`. Delete the HCR001–HCR004 test rows first.

Deviations from the design below: (1) the `"timestamp_display "` trailing-space key in module 35 was **left as-is** — the Docs template placeholder has the same trailing space, so "fixing" it would break the merge; (2) module 1 got `hcr_id` added to its interface (not mentioned below); (3) module 44 left byte-untouched, the `status=Declined` write is done entirely by new modules 209/210.

This is the spec for making Homecare an independent stream: its own people table, its own folder tree, its own IDs, no reference back to `Volunteers` — ever. The volunteer Stage-1 change (approval gate removed, 30 Aug 2026) is done and unrelated; this is the next piece.

---

## 1. Decisions locked

| # | Decision |
|---|---|
| 1 | Homecarers are tracked in a **new `Homecarers` tab** in `CAPS_walking_log_MASTER`, separate from `Volunteers`. |
| 2 | Person ID format: **`HCR0XX`** (zero-padded 3 digits, e.g. `HCR001`). Distinct from `HC0XX` which stays the *event* ID in the `Homecare` tab. |
| 3 | **Reuse the existing Homecare form and its bound file, unchanged.** Q1 ("have you completed a volunteer form?") stays and keeps being ignored. Same `form_type: "homecare_application"`. |
| 4 | Because the form/form_type is unchanged, we **edit the existing live Homecare branch in Make in place** — not a parallel branch. No "leave old branch inert" fallback this time; we save the pre-change blueprint instead. |
| 5 | **No lookup back to `Volunteers`, ever.** The folder-search step is deleted. Approval matches on `HCR0XX` ID carried in the email button URLs, not on name. |
| 6 | New folder tree: `[shared drive 4 Volunteers and Community] / 03 Homecare / 01 Homecare Applications / {surname}, {firstname}  {timestamp}`. |
| 7 | Approval stays **3 outcomes**: Approve Jailbreak + Foster / Approve Jailbreak only / Decline. |

**Reference IDs**

| Thing | ID |
|---|---|
| Make scenario | `6322986` (team `2010758`, org `8153520`, zone `eu1`) |
| `CAPS_walking_log_MASTER` | `1fHX7ciYDXNnzyM3aPHTsGrOh6rYM6FZPaea4h45740M` |
| Shared drive "4 Volunteers and Community" | `0AHkJnrqC-JOdUk9PVA` |
| `03 Homecare` folder | `1ZNrkxgpUfpt3N3S7ynxmjR43IbMx9Hga` |
| `01 Homecare Applications` folder | `11mOWmOIdhvyKV42giWfQjTID_xEj8Jyj` |
| Homecare doc template (existing) | `1Vtr6yrcgAT5wntt6R_d6ACSm0_dCZCVyiu0XKWyOhDQ` |
| Homecare form raw responses | `CAPS_volunteer_tracking_sheet`, "Homecare applications" tab (unchanged) |

---

## 2. Target architecture

### Three entities, cleanly separated

| Entity | Lives in | Key | Changed? |
|---|---|---|---|
| **Volunteer** — does shelter shifts | `Volunteers` tab | `Volunteer_ID` (`V0XX`) | untouched |
| **Homecare stint** — one dog placement | `Homecare` tab | `Homecare_ID` (`HC0XX`) | **+1 column** (`homecarer_id`) |
| **Homecarer** — approved to take a dog home | **new `Homecarers` tab** | `Homecarer_ID` (`HCR0XX`) | **new** |

A person who is both a volunteer and a homecarer has **one row in each tab**, maintained independently. That is the point — no cross-referencing means no shared identity. Their `Volunteers.jailbreak_approved` / `foster_approved` columns become **legacy** (left in place for history; nothing reads or writes them anymore).

### `Homecare` events tab change

Add one column: **`homecarer_id`** (holds `HCR0XX`). New stints populate it. The 96 historical rows keep their `Volunteer_ID` and leave `homecarer_id` blank — **no migration of history**. Optional tidy-up later: backfill `homecarer_id` on historical rows once the `Homecarers` table exists.

---

## 3. `Homecarers` tab — proposed columns

Short `snake_case`, aligned to the **webhook payload field names** (so the Make mapping is self-documenting). AppSheet can carry friendlier display names on top. Order below = column order = the `addRow` index order.

| Col | Header | Filled by | Value / notes |
|---|---|---|---|
| A | `homecarer_id` | Make (generated) | `HCR0XX` |
| B | `first_name` | Make intake | `{{1.firstname}}` |
| C | `surname` | Make intake | `{{1.surname}}` |
| D | `nickname` | Make intake | `{{1.vol_name}}` (form "preferred name") |
| E | `email` | Make intake | `{{1.email}}` |
| F | `phone` | Make intake | `{{1.phone}}` |
| G | `status` | Make | `Pending` at intake → `Active` on approve → `Declined` on decline; `Exited` set from the app |
| H | `start_date` | Make (on approve) | `formatDate(now; "DD/MM/YYYY"; "Australia/Brisbane")` |
| I | `end_date` | AppSheet (on exit) | blank until exited |
| J | `jailbreak_approved` | Make (on approve) | `J` or blank |
| K | `foster_approved` | Make (on approve) | `F` or blank |
| L | `applied_date` | Make intake | `{{1.timestamp_display}}` |
| M | `over_18` | Make intake | `{{1.over_18}}` |
| N | `address` | Make intake | `{{1.address}}` |
| O | `property_ownership` | Make intake | `{{1.property_ownership}}` |
| P | `fence_type` | Make intake | `{{1.fence_type}}` |
| Q | `fence_height` | Make intake | `{{1.fence_height}}` |
| R | `people_at_home` | Make intake | `{{1.people_at_home}}` |
| S | `children_u16` | Make intake | `{{1.children_u16}}` |
| T | `other_animals` | Make intake | `{{1.other_animals}}` |
| U | `animal_details` | Make intake | `{{1.animal_details}}` |
| V | `vaccines` | Make intake | `{{1.vaccines}}` |
| W | `experience` | Make intake | `{{1.experience}}` |
| X | `jb_day` | Make intake | `{{1.jb_day}}` — availability |
| Y | `jb_weekend` | Make intake | `{{1.jb_weekend}}` |
| Z | `jb_shift` | Make intake | `{{1.jb_shift}}` |
| AA | `jb_school` | Make intake | `{{1.jb_school}}` |
| AB | `foster_short` | Make intake | `{{1.foster_short}}` — `"interested"` or blank |
| AC | `foster_long` | Make intake | `{{1.foster_long}}` — `"interested"` or blank |
| AD | `folder_id` | Make intake | Drive folder ID of this applicant's folder (so the app can link straight to it — the thing `Volunteers.Folder_id` never got) |
| AE | `notes` | manual / app | free text |
| AF | `agree_terms` | Make intake | `{{1.agree_terms}}` *(optional — also in the doc)* |
| AG | `signature_name` | Make intake | `{{1.signature_name}}` *(optional)* |
| AH | `signature_date` | Make intake | `{{1.signature_date}}` *(optional)* |

**No emergency-contact columns** — the current Homecare form's payload has none (see open decision 4).

---

## 4. Make scenario changes

Path in the blueprint: `flow[1]` (top router, id 2) → `routes[0].flow[0]` (router id 30, "Application") → `routes[1].flow` is the Homecare intake; `flow[1].routes[1].flow[0]` (router 36 "Assessment") → `routes[1].flow[0]` (router 37 "Homecare Assessment") is the Homecare approval.

### 4a. Intake — before → after

**Before** (`router 30` route 1 = `[33, 40, 41]`):

| id | module | what |
|---|---|---|
| 33 | `google-drive:searchForFilesFolders` | searches `01 Volunteer Applications` for a folder named `{surname}, {firstname}` (contains) |
| 40 | `builtin:BasicAggregator` | collects the match ids into `40.array[]` |
| 41 | `builtin:BasicRouter` | route 0 "Folder Found" (`count > 1`) → `[35, 43]`; route 1 "No Folder Found" (`count < 2`) → `[42]` |
| 35 | `google-docs:createADocumentFromTemplate` | Homecare doc into the *found volunteer folder* |
| 43 | `google-email:sendAnEmail` | staff email, 3 buttons (pass `action, form_type, email, firstname, surname`) |
| 42 | `google-email:sendAnEmail` | "couldn't auto-match" staff email |

(The "Folder Found" / "No Folder Found" condition is also inverted — normal single-match falls into "No Folder Found". Moot; it's all being deleted.)

**After** — linear, no router, no volunteer lookup:

| new id | module | what | modelled on |
|---|---|---|---|
| `H1` | `google-drive:createAFolder` | folder `{{1.surname}}, {{1.firstname}}  {{1.timestamp_folder}}` in `01 Homecare Applications` (`11mOWmOIdhvyKV42giWfQjTID_xEj8Jyj`), shared drive `0AHkJnrqC-JOdUk9PVA` | volunteer module 7 |
| `35` (kept, repointed) | `google-docs:createADocumentFromTemplate` | same template `1Vtr6yrc…`, `folderId` → `{{H1.id}}` instead of `{{40.array[].id}}`. Fix the `"timestamp_display "` key's trailing space while we're in there. | — |
| `H2` | `google-sheets:filterRows` | `Homecarers` tab, last row where `homecarer_id` contains `HCR`, order by row number desc, limit 1 | volunteer module 201 |
| `H3` | `util:SetVariable2` | `New_Homecarer_ID` = `HCR` + zero-padded(`H2` number + 1) | volunteer module 202 |
| `H4` | `google-sheets:addRow` | insert the `Homecarers` row per §3, `status = Pending`, J/K blank, `folder_id = {{H1.id}}` | volunteer module 203 |
| `43` (kept, edited) | `google-email:sendAnEmail` | staff email. Intro → "A new Homecare application has been received and logged as **{{H3.New_Homecarer_ID}}**." Each of the 3 button URLs gains **`&hcr_id={{H3.New_Homecarer_ID}}`** (keep `email` + `firstname` too — the approval emails use them). | — |

**Deleted:** modules 33, 40, 42, and router 41.

### 4b. Approval — before → after

**Before** (`router 37`, filter `form_type == "homecare_application"`):

| route | ids | action |
|---|---|---|
| 0 | `[38, 45, 46]` | `approve_both` — `filterRows` Volunteers by First+Surname → `updateRow` set col R=`J`, S=`F` → email applicant |
| 1 | `[47, 50, 39]` | `approve_jb` — `filterRows` Volunteers → `updateRow` set col R=`J` → sub-router 39: `[48]` plain JB-approved email, `[49]` foster-declined **draft** |
| 2 | `[44]` | `decline` — `createADraft` only |

Known dead code: modules 48/49 filter on `{{1.foster_short}}` / `{{1.foster_long}}`, which **aren't in the approval GET URL**, so 48 always wins and 49 never fires.

**After** — same shape, repointed to `Homecarers` by ID:

| id | change |
|---|---|
| 38 / 47 | `filterRows` → sheet `Homecarers`, match **`homecarer_id` (col A) == `{{1.hcr_id}}`**. Drop the First/Surname match. |
| 45 | `updateRow` on `Homecarers` row `{{38.__ROW_NUMBER__}}`: set `jailbreak_approved`=`J` (col J), `foster_approved`=`F` (col K), `status`=`Active` (col G), `start_date`=today (col H). |
| 50 | `updateRow` on `Homecarers` row `{{47.__ROW_NUMBER__}}`: set `jailbreak_approved`=`J`, `status`=`Active`, `start_date`=today. Leave `foster_approved` blank. |
| 39 sub-router | **(decision 6: fix)** now that module 47 fetches the row, `[48]` vs `[49]` test **`{{47.foster_short}}` / `{{47.foster_long}}`** (real values from the `Homecarers` row) instead of empty URL params — so module 49 ("JB approved, foster interest present → draft a note") actually fires when it should. |
| decline path | **(decision 3)** add `filterRows`(`Homecarers` by `hcr_id`) + `updateRow`(`status = Declined`) ahead of module 44, so declined applicants aren't left `Pending` forever. |
| 46 / 48 / 49 / 44 | email bodies unchanged. They reference `{{1.firstname}}` / `{{1.email}}` from the URL — still supplied. |

### 4c. Connections — no new apps

All already in use in this scenario: `8642705` (Drive), `8648679` (Docs), `8643169` (Sheets), `8774783` (email "REAL INFO"), `8522170` (email, used by module 46). `scenarios_update` with `confirmed: true` covers it.

### 4d. Untouched

Volunteer branch (all of it), the Adoption stub (module 34), Homecare approval **email wording**, the `Homecare` events tab structure except the one added column (which Make doesn't write anyway).

---

## 5. AppSheet work (Paul)

Additive — nothing on the volunteer/walks side changes.

1. Add **`Homecarers`** as a table.
2. Views: **Homecarers (Active)** list, **Homecarer detail**, **Pending approval** (filtered `status = Pending`), **Exited homecarers** (filtered `status = Exited`).
3. **Homecare checkout / stint-logging:** change the person picker from `Volunteers` (filtered J/F) to **`Homecarers` filtered `status = Active` AND (`jailbreak_approved = J` OR `foster_approved = F`)**.
4. Add **`homecarer_id`** column to the `Homecare` events tab; the checkout form writes it on new stints.
5. **Homecarer exit action** — set `status = Exited`, `end_date = today` (mirror the volunteer exit action). This is the "exited homecare button" — separate from volunteer exit, because someone can stop fostering while still walking dogs.
6. **The two Homecare bots** ("Start Homecare Status Update", "End Homecare Status Update") — confirm they act on the **Dog / stint** side (dog status + dates), not the person row. If either reads `Volunteers` for anything, repoint to `Homecarers`. *(Still needs the trigger-settings inspection flagged as open Q2 in `homecare-current-state.md`.)*
7. Optionally hide the now-dead `Volunteers.jailbreak_approved` / `foster_approved` columns in the app.

---

## 6. Backfill (one-time)

The existing homecarers are currently "volunteers with a J or F". Move them into `Homecarers` so the app's checkout picker isn't empty on day one.

1. From the `Homecare` events tab, list the distinct people who are current homecarers (have `J` and/or `F` on their `Volunteers` row, `Status = Active`). Expect ~20–30.
2. For each, create a `Homecarers` row: copy `first_name`, `surname`, `nickname`, `email`, `phone` from `Volunteers`; set `jailbreak_approved` / `foster_approved` from `Volunteers`; `status = Active`; `start_date` = their volunteer start date (or a nominal date); household columns blank (they never filled the structured form — fill from their old application doc only if you care); `folder_id` = their existing folder if easily found, else blank.
3. Assign `HCR` numbers per decision 9:
   - Person has a clean `V0XX` volunteer ID → `HCR` = same digits (`V024` → `HCR024`), in the `HCR001`–`HCR199` mirror range.
   - Person has no volunteer record, or a hash-style volunteer ID → assign from `HCR500` upward.
4. Seed the auto range: the backfilled pure-homecarers occupy `HCR500`, `HCR501`, … so the first *live* submission becomes `max + 1` from there. If there are no pure-homecarers to backfill, add one placeholder row at `HCR500` (or set the first live one manually) so Make's counter starts in the right block.
5. Optional: fill `homecarer_id` on their historical `Homecare` event rows.

Can be a script (Claude can write one against the sheet) or done by hand — it's small.

---

## 7. Decisions — RESOLVED (Paul, 31 Aug 2026)

1. **Row created at intake** — YES, `status = Pending`.
2. **`status` vocabulary** — `Pending` / `Active` / `Exited` / `Declined`. Column **G** in the `Homecarers` tab.
3. **On decline** — keep the row, set `status = Declined`. Adds a `filterRows`(by `hcr_id`) + `updateRow` to the decline path ahead of module 44.
4. **Emergency contact** — NO EC columns. Homecarers take the dog to their own home; they're not on-site at CAPS, so CAPS doesn't hold their emergency contact. §3 list stands as-is.
5. **On approval** — YES, stamp `status = Active` and `start_date = today`.
6. **Fix the dead foster-interest branch** — YES. Module 39's sub-router will test `{{47.foster_short}}` / `{{47.foster_long}}` (real values from the fetched `Homecarers` row) so "JB approved but foster interest present → draft a note" (module 49) actually fires.
7. **Keep the Homecare application doc** (module 35) — YES, kept as a formatted archive copy in the applicant's folder.
8. **§3 column list** — APPROVED as written.
9. **`HCR` numbering — scheme (a), mirror the volunteer number.** Two ranges:
   - **`HCR001`–`HCR199` — mirror range.** For a person who is also a volunteer with a clean `V0XX` ID, `HCR` = the same digits (`V024` → `HCR024`). **Only ever assigned by the backfill or a manual tidy-up** — Make never auto-assigns here (it can't; no lookup).
   - **`HCR500`+ — auto range.** Everything Make creates live, sequential (`max + 1`). Backfilled pure-homecarers (exist today, no volunteer record, or a hash-style volunteer ID that can't be mirrored) also go here, starting at `HCR500`.
   - **Consequence Paul has accepted:** a brand-new applicant who is *also* a volunteer will get an `HCR5xx` number, not their `V`-number, because Make can't look them up. Staff can manually renumber into the mirror range later if it matters. This is the "tidy up".
   - Make's `H2`/`H3` = highest existing `HCR` number + 1. As long as the `HCR500`+ block stays the highest, manual mirror-range entries below it don't interfere.

---

## 8. Sequencing & risk

| Phase | Who | What |
|---|---|---|
| 1 | Claude | This doc. ✅ |
| 2 | Paul | Review; answer §7; create `Homecarers` tab headers from §3; add `homecarer_id` column to the `Homecare` events tab. |
| 3 | Claude | Fetch fresh blueprint, save `…blueprint.pre-homecare.json`, build the §4 changes, show the diff, push on your OK, test end-to-end (below). |
| 4 | Paul | AppSheet work (§5) + backfill (§6). |
| 5 | both | Update `homecare-current-state.md` + `system-overview.md` to the new live state. |

**Risk — this edit is more invasive than the volunteer one.** It deletes modules (33, 40, 42, 41) and rewrites the approval lookups, rather than only adding. So:

- The diff review in Phase 3 matters more — I'll show exactly what's removed/changed/added.
- During the build→push→test window, a real Homecare submission would hit a half-changed branch. **Pick a quiet time and tell Shayna not to process Homecare applications for ~30 min.**
- Pre-change blueprint saved for full revert (`scenarios_update` back to it).
- The old approval modules are *edited in place*, not left as a fallback — revert = re-push the saved blueprint.

---

## 9. Test plan (Phase 3)

Same approach as the volunteer test (`V059`):

1. **Intake:** POST a test Homecare payload to the webhook (`form_type: homecare_application`, no `action`, a name/email Paul controls, realistic household values).
   Verify: folder created in `01 Homecare Applications`; doc created + merged; `Homecarers` row `HCR0XX` with `status = Pending`, all household fields, `folder_id` set; staff email received with 3 buttons whose URLs carry `hcr_id=HCR0XX`.
2. **Approve JB + Foster:** GET the webhook with `action=approve_both&form_type=homecare_application&hcr_id=HCR0XX&email=…&firstname=…`.
   Verify: that `Homecarers` row now has `J`, `F`, `status = Active`, `start_date = today`; applicant approval email sent.
3. **Approve JB only** (fresh test row): `action=approve_jb`. Verify `J` only, `status = Active`; correct email/draft per decision 6.
4. **Decline** (fresh test row): `action=decline`. Verify draft created; row `status` per decision 3.
5. Re-fetch blueprint, diff against intended, confirm byte-exact.
6. Clean up test rows/folders or leave flagged, Paul's call.
