# Homecare (Jail Break / Foster) — Current State

**Snapshot date:** 28 August 2026 · **Superseded:** 1 September 2026
**Status:** **The flow described in §2 is no longer live.** On 1 Sep 2026 Homecare was rebuilt as an independent stream — own `Homecarers` tab, own `HCR0XX` IDs, own folder tree, no lookup back to `Volunteers`. See **`homecare-redesign.md`** for the current design + the as-built module map + test results. This document is kept as the pre-change baseline / revert reference (blueprint: `volunteer-registration.blueprint.pre-homecare.json`).
**Scope:** Homecare only (Jail Break and Foster). Does not cover Adoption, which exists as a form_type in the webhook but has no build-out yet.

## What changed (1 Sep 2026) — summary

- New tab **`Homecarers`** in `CAPS_walking_log_MASTER` (34 cols) is now the person/household record. `Volunteers.jailbreak_approved` / `foster_approved` are **legacy** — nothing reads or writes them any more.
- New person ID **`HCR0XX`**. `Homecare` events tab gained a `homecarer_id` column (the old `Volunteer_ID` column stays for the 96 historical rows).
- **Intake:** the Volunteer-folder search (modules 33/40/41/42) is deleted. Now: create folder in `03 Homecare / 01 Homecare Applications`, generate the doc, find last `HCR`, compute next `HCR0XX`, insert `Homecarers` row (`status=Pending`), email staff (3 buttons carrying `hcr_id`).
- **Approval:** the name-match against `Volunteers` (modules 38/47) is replaced by an `hcr_id` match against `Homecarers`; the `updateRow`s (45/50) write `J`/`F`/`status=Active`/`start_date` onto the `Homecarers` row. Decline now sets `status=Declined` (new modules 209/210). The dead "foster interest → draft a note" branch (module 49) is fixed to read the fetched row.
- Still pending (Paul): AppSheet wiring (new table + views + repoint the checkout picker + homecarer exit action), the one-time backfill of existing homecarers, and **seeding the `HCR` counter into the `HCR500`+ range** before real traffic (see `homecare-redesign.md`).

---

## 1. The systems involved

| System | Role |
|---|---|
| **`CAPS Homecare Registration Form`** (Google Form) + bound Apps Script | Public application form. Its `onFormSubmit` script fires unconditionally on every submission and POSTs to the same webhook Volunteer Registration uses — see Section 1a. |
| **Make.com "Integration Webhooks"** (scenario `6322986`) | Same single scenario as Volunteer Registration — handles both. |
| **`CAPS_walking_log_MASTER`**, tab `Homecare` | Records of individual jail break/foster stints: `Homecare_ID, Dog_ID, Volunteer_ID, Homecare Type, Homecare Start, Homecare End, Homecare Due Back, Homecare_Dog_Picker`. 96 rows as of this snapshot (HC01–HC96). |
| **`CAPS_walking_log_MASTER`**, tab `Volunteers` | `jailbreak_approved` and `foster_approved` columns (values "J" / "F") are the actual approval flags — separate from general volunteer Status. |
| **AppSheet** | Reads `Homecare` and `Volunteers` directly. Two Bots exist ("Start Homecare Status Update", "End Homecare Status Update") whose exact trigger settings I have **not** inspected the way I did for the Walks bots — see Open Questions. |

**Important distinction from Volunteer Registration:** Homecare approval is a *real* gate that already exists correctly in principle — someone must already be a Volunteer before Homecare applies to them. The problem here isn't "there's no gate," it's "the gate depends on matching two form submissions by name."

### 1a. The webhook — confirmed mechanism

Same pattern as Volunteer Registration: a form-bound `onFormSubmit` Apps Script, firing unconditionally on every submission, POSTing synchronously to the same shared webhook URL. Same silent-failure risk — the POST is wrapped in try/catch with only a `Logger.log()` on failure, nothing a person would ever see. See Issue 4 below.

One field worth calling out directly: the form asks **"Have you completed a volunteer registration form?"** (`vol_registration` in the payload) — a self-reported yes/no from the applicant. As far as I've traced through the Make logic, **this answer is never checked or acted on.** It's captured and then not used — which is notable given Issue 1 below is entirely about the system failing to reliably confirm someone's already a volunteer. The form is already asking the question; the automation just isn't using the answer.

---

## 2. End-to-end flow — SUPERSEDED (pre 1 Sep 2026)

> Everything in this section describes the **old** approval-gated, name-matching flow. It was replaced on 1 Sep 2026 (see the summary above and `homecare-redesign.md`). Modules 33/40/41/42 are deleted; 38/45/47/50/48/49 were repointed. Kept here only as the revert reference.

**Step A — Homecare application submitted** (`form_type == "homecare_application"`, no `action`):
1. `searchForFilesFolders` — searches Drive for a folder titled `{surname}, {firstname}` (**contains** match, not exact) inside the Volunteer Applications folder. This is the step trying to find the volunteer's *existing* folder from when they originally applied as a volunteer.
2. Results are aggregated, then routed on how many matches came back:
   - **"Folder Found"** branch — condition is literally `count > 1` (more than one match)
   - **"No Folder Found"** branch — condition is `count < 2` (zero *or exactly one* match)

   **Open question, not yet resolved:** the normal, working case — the search finds exactly one correct folder — falls into the "No Folder Found" branch under this logic, not "Folder Found." I haven't confirmed whether this is a genuine inversion (a bug) or whether I'm misreading Make's comparison semantics. Needs verification before touching this branch.
3. **If routed as "Folder Found":** generates a Homecare application doc from a template into that folder, then emails staff with applicant details and a link to the doc, asking them to review and choose an outcome.
4. **If routed as "No Folder Found":** emails staff a different message explaining the auto-match failed, suggesting they check manually, with a drafted follow-up email to send the applicant asking whether they've completed a Volunteer Application under a different name/email.

**Step B — Staff decides**, by clicking one of three links embedded directly in the staff notification email from Step A (confirmed — these are real GET-request buttons baked into the email HTML, not a second form):
- **✓ Approve Jailbreak + Foster** → `action=approve_both`
- **◐ Approve Jailbreak Only** → `action=approve_jb`
- **✗ Decline** → `action=decline`

Each click hits the same webhook with `form_type=homecare_application` plus the chosen `action`, and the applicant's name/email as URL parameters.

**Step B1 — Approve Both:**
1. `filterRows` on `Volunteers`, matching **exact** First Name + Surname (not email — different from the Volunteer approval lookup, which also checks email).
2. `updateRow` — sets that Volunteer's `jailbreak_approved = J` and `foster_approved = F` in place (edits the existing row, does not create a new one — this path doesn't have the duplicate-row risk Volunteer Registration has).
3. Sends an approval email to the applicant.

**Step B2 — Approve Jailbreak Only:**
1. Same `filterRows` lookup by First Name + Surname.
2. `updateRow` — sets `jailbreak_approved = J` only.
3. A sub-router then picks which email to send based on whether the applicant *also* expressed interest in fostering: a plain "Jailbreak approved" email if not, or a "Jailbreak approved, fostering declined" email **drafted, not sent**, if they did.

**Step B3 — Decline:** creates a draft email only, same pattern as Volunteer Decline. No row is touched.

---

## 3. Known issues in this current state

**Issue 1 — Name-only matching, both at intake and at approval.**
Two separate places rely purely on name text matching, with no ID or email cross-check as a fallback:
- Step A's folder search (`contains` match on `surname, firstname`)
- Step B's Volunteers lookup (`exact` match on First Name + Surname only — no email check here, unlike the Volunteer Registration approval path)

Any nickname, spelling difference, married name, or simple typo between the original Volunteer Application and the later Homecare Application breaks the chain. This is the mechanism behind what you described — the system telling you it "can't find" someone who's actually already in it.

**Issue 1 — RESOLVED (1 Sep 2026).** Both name-matching points are gone: intake no longer searches for a Volunteer folder, and approval matches on `hcr_id` (carried in the staff-email buttons), not on name.

**Issue 2 — MOOT (1 Sep 2026).** The `searchForFilesFolders` step and the whole "Folder Found / No Folder Found" router were deleted, so the inversion no longer exists.

**Issue 4 — Failed webhook deliveries are silent.** STILL OPEN — the form and its Apps Script were not touched by the 1 Sep change. Same root cause as Volunteer Registration's Issue 5: the form's Apps Script swallows POST failures into a private log nobody watches, no retry, no alert. A Homecare application can fail to reach Make entirely with no trace visible to the applicant or staff.

**Issue 3 — Volume pattern worth a look.** `V001` and `V002` account for a large share of the 96 Homecare rows, including runs of same-day, back-to-back entries (e.g., HC78–HC90 all logged within about four minutes on 25 Aug). I'm not asserting this is wrong — it may simply be a staff member bulk-entering real historical records — but it's different enough from the rest of the data that it's worth you confirming what it actually represents before I read anything more into it.

---

## 4. Open questions

1. ~~The "Folder Found" condition inversion~~ — moot, that step is deleted (Issue 2 above).
2. **AppSheet's two Homecare Bots ("Start Homecare Status Update", "End Homecare Status Update")** — still not inspected (trigger event type / condition). Needed for the AppSheet part of the redesign: confirm they act on the Dog/stint side and don't read `Volunteers` for anything. **Still open.**
3. What the V001/V002 volume pattern actually represents. **Still open** (unrelated to the redesign).
4. ~~Whether Homecare should move to a "just a decision" model~~ — answered by the 1 Sep redesign: folder + doc are kept, and the structured `Homecarers` record was added. See `homecare-redesign.md`.
