# Volunteer Registration — Current State

**Snapshot date:** 28 August 2026 · **Updated:** 30 August 2026 (Stage 1 pushed live and tested)
**Status:** Live. The "Stage 1: remove approval gate" change was pushed to the Make scenario on 30 August 2026 and verified with a test submission (execution `dfd472a269a4448b98c0a83eeee8f966`, 8 ops, success — folder + doc + Volunteers row `V059` + both emails). §4 describes the current flow; the old approval-gated flow is retained below as a **superseded** reference.
**Why this exists:** Nobody but Paul currently holds this system's design in their head. This document is meant to change that, and to give us something concrete to revert to if the Stage 1 change doesn't work out.
**To revert:** the exact pre-change blueprint is saved alongside this doc as `volunteer-registration.blueprint.pre-stage1.json` (post-change: `.post-stage1.json`) — push it back via the Make API / `scenarios_update`. The old approval branch (modules 4, 16, 11, 12, 9, 17, 14) is also still physically present in the live scenario, just unreachable, so a partial revert is possible too.

---

## 1. The three systems involved

| System | Role in Volunteer Registration |
|---|---|
| **Google Form** (not directly inspected) | Public-facing form a person fills in to apply as a volunteer. Submits via webhook (not a native Sheets-linked form response — see §3). |
| **`CAPS_volunteer_tracking_sheet`** (Google Sheet, file ID `1EfDJ4ABkLifMA9SdYkL5HjppqmbRYkNpwSblD8G3bpo`) | Tab `volunteer_applications`. Raw, unedited record of every form submission. No status/approval column. |
| **Make.com scenario "Integration Webhooks"** (scenario ID `6322986`, team `2010758`) | The only automation in the account. One webhook handles Volunteer, Homecare, and Adoption applications — see §5 for why. Volunteer submissions no longer need an approval step (see §4); Homecare still does. |
| **`CAPS_walking_log_MASTER`** (Google Sheet, file ID `1fHX7ciYDXNnzyM3aPHTsGrOh6rYM6FZPaea4h45740M`), tab `Volunteers` | The table AppSheet actually reads. A person only exists as a "volunteer" the app can see once a row is added here. |
| **AppSheet "CAPS Dog Enrichment App"** (version 1.000620 at time of writing) | Reads `Volunteers` directly. Has no awareness of the approval process — it just displays whatever rows exist. |

---

## 2. The `Volunteers` table (in `CAPS_walking_log_MASTER`)

| Column | Purpose |
|---|---|
| `Volunteer_ID` | Key. Currently generated two different ways — see Issue 2. |
| `Volunteer Name`, `First Name`, `Surname` | Identity. |
| `Start Date`, `End Date`, `Status` (Active/Exited) | Membership lifecycle. |
| `Notes` | Free text, mostly used for exit reasons. |
| `Total Days with CAPS` | AppSheet-computed. |
| `Homecare Approved` | The one approval flag AppSheet itself is aware of — unrelated to general volunteer approval. |
| `experience`, `ec_name`, `ec_phone`, `ec_email`, `ec_relationship`, `medical_issues`, `under_18` | Copied straight from the form submission when the Volunteers row is created (§4). |
| `jailbreak_approved`, `foster_approved` | Set manually today, separately from this flow (homecare's own process). |
| `Email` | **Now populated** by the automation as of the 30 Aug 2026 change (column T; `{{1.email}}`). Rows created before then are blank. |
| `Folder_id` | Column exists, **still never populated** — see Issue 3. The applicant's Drive folder is created but not linked back. |

---

## 3. The webhook — confirmed mechanism

**Trigger:** a form-bound Apps Script on the `CAPS Volunteer Registration Form` itself, using an `onFormSubmit(e)` installable trigger (`e.response`, not the simple-trigger `e.namedValues`). Fires on **every** submission, unconditionally — no validation or filtering happens before the POST.

**What it sends:** builds a JSON object keyed by field name (`form_type: 'volunteer_application'`, `surname`, `firstname`, `vol_name`, `email`, ~35 more) by reading each form question's answer by its exact question text, and POSTs it synchronously to `https://hook.eu1.make.com/rn0mi7vuq1ijodhhyxgownn44t6yhqy4` — the same single webhook URL used by the Homecare form.

**Note on the "tick all that apply" activity question:** it's built as a checkbox *grid* (each activity — Committee, Fundraising, Walking, Feeding, Transport, Pet minding, Cooking, Social media, "Wherever useful", and "Foster Care / Jail Break (additional form)" — is a grid row), which the script explodes into one boolean-ish field per activity. `foster_or_jailbreak` is captured this way — **but I have not seen it referenced anywhere in the Make scenario's logic.** It looks like a signal that's collected but currently unused.

**Routing key:** the router's `Volunteer Application` branch matches `form_type` exists AND `action` does not exist, then `form_type == "volunteer_application"`. (Nothing generates an `action` payload for volunteers any more — see §4 and the superseded note. The `Assessment` / `action` branch is still wired for Homecare.)

## 4. Current end-to-end flow (live since 30 August 2026)

**One path. No approval step.** A form submission comes in → router → `Volunteer Application` branch → the following seven modules run in order:

1. `createAFolder` (id 7) — new Drive folder `{surname}, {firstname}  {timestamp}` in *01 Volunteer Applications*. *(unchanged)*
2. `createADocumentFromTemplate` (id 3) — readable copy of the full application into that folder from the fixed Docs template, all ~30 fields merged. *(unchanged)*
3. `sendAnEmail` (id 8) — **FYI email to staff** (`info@…`): "A new volunteer has just been registered automatically", applicant details, a link to the doc, and an **Interests** list built from the activity checkboxes. No approve/decline buttons. *(subject + body rewritten in this change)*
4. `filterRows` (id 201) — finds the physically last `Volunteers` row whose ID contains "V" (by row number, not ID value).
5. `SetVariable2` (id 202) — `New_Volunteer_ID` = that row's number + 1, formatted `V0XX` (zero-padded, 3 digits).
6. `addRow` (id 203) — inserts the new `Volunteers` row **immediately**: ID, `vol_name`, First Name, Surname, today's date (`Australia/Brisbane`), Status=`Active`, experience, EC name/phone/email/relationship, medical issues, under-18 — **and now `Email` (column T)**. `Folder_id` still not mapped.
7. `sendAnEmail` (id 204) — "Welcome to CAPS" email to the applicant (`{{1.email}}`), greeting `{{1.firstname}}`.

The applicant is a Volunteer AppSheet can see the moment step 6 runs. Verified end-to-end on 30 Aug 2026 (test submission → row `V059`, folder + doc created, both emails sent, execution success, 8 operations).

Modules 201–204 were built as exact copies of the old approval-branch modules 11, 12, 9, 17 (below), re-pointed to read the webhook payload (`{{1.*}}`) directly instead of re-reading `volunteer_applications`.

### Superseded — the approval-gated flow (before 30 August 2026)

Kept for reference and partial revert. These modules (router 4 → `16, 11, 12, 9, 17` and `14`) are **still physically in the scenario but unreachable**, because nothing generates the `action=approve` / `action=decline` payload for volunteers any more.

- **Step A** was steps 1–3 above, except the staff email was a **decision request** ("review and approve or decline") with embedded `?action=approve` / `?action=decline` links back to the webhook. No Volunteers row was created yet.
- **Step B1 — Approved:** `filterRows` looked up the original application in `volunteer_applications` by **exact match** on Email + Surname + Firstname (Issue 3), then `filterRows` → `SetVariable2` → `addRow` → welcome email — the same logic now in modules 201–204, but sourced from that lookup and with `Email`/`Folder_id` left blank.
- **Step B2 — Declined:** created an email **draft** only; nothing sent, no row touched.

---

## 5. Known issues in this current state (evidenced, not theoretical)

**Issue 5 — Failed webhook deliveries are silent.** The Apps Script's POST to Make is wrapped in try/catch, and the catch block only does `Logger.log(...)` — Apps Script's private execution log, which nothing surfaces to a person. No email, no retry, no fallback write. If the POST fails for any reason (network blip, Make down or rate-limiting), **the applicant's submission is silently lost** with no indication to them or anyone else that it happened. Distinct from the matching/duplication issues below — this one loses data before it ever reaches Make at all.

**Issue 6 — A captured signal (`foster_or_jailbreak`) doesn't appear to be used.** The volunteer form asks whether someone's interested in Foster Care/Jail Break as part of its activity checklist, and that answer is sent to Make — but nothing in the scenario's logic references it. It's collected and then, as far as I can tell, ignored.

**Issue 1 — Duplicate volunteers.**
Three `Volunteers` rows (`V019`, `V021`, `V022`) all belong to the same person (Jacob "Jay" Riley), created within 24 hours of each other. Same pattern with `V017`/`V018` (Michael "Micky" James). Per Paul, some of this is known test data from early trials. The old cause was repeated approval clicks; **as of 30 Aug 2026 the mechanism is different but not fixed** — every form submission now unconditionally creates a row with no dedupe, so a double-submit (or a resubmission) still makes duplicates. The test on 30 Aug added a second `Green, Paul` row (`V059`) on top of existing ones, as expected.

**Issue 2 — Two independent, uncoordinated ID-generation schemes.**
Every ID this Make scenario creates is `V0XX` — 3 digits, zero-padded (`V017`, `V048`...). But `V42`, `V43`, `V44`, and a malformed `V57 Emily` also exist — 2 digits, unpadded, matching AppSheet's own (different) initial-value formula for `Volunteer_ID`, used when a volunteer is added directly through the app. Both systems independently scan existing rows and compute "next number" with no awareness of each other. They haven't collided yet only by chance.

**Issue 3 — No durable link between the folder and the row.** (The exact-match lookup half of this issue is **gone** as of 30 Aug 2026 — the new flow reads the webhook payload directly and no longer does a text-equality lookup against `volunteer_applications`.) Still open: the Drive folder created in step 1 is never linked back to the Volunteers row (`Folder_id` stays blank), so there's no reliable way to find "this volunteer's folder" later except guessing by name.

**Issue 4 — 25 of the last ~80 scenario executions have failed**, all with the identical error `BundleValidationError: Validation failed for 1 parameter(s)`, including three identical failures from manual replay attempts on 25 Aug — meaning it's deterministic, not transient, for whatever data triggered it. Exact failing module not yet identified; Make's API isn't returning per-module bundle detail, which likely means detailed execution logging isn't enabled on this scenario. Not yet root-caused to a specific field.

**Contributing factors (Paul's context, not independently verified):** free Make plan limits the account to 2 scenarios, which is why Volunteer, Homecare, and Adoption all share one webhook and one scenario rather than being separated. No data format enforcement has been added anywhere in the pipeline, since the system was never intended to reach its current scale.

---

## 6. What Stage 1 changed (done — 30 August 2026)

When a `Volunteer Application` comes in, the "add row to `Volunteers`" logic that previously only fired after manual approval now runs **immediately**, with no gate. Implemented as a minimal blueprint diff:

- **Kept** the folder + doc creation (modules 7, 3) — unchanged. *(Note: an earlier draft of this doc said folder/doc would also be removed; the final, reviewed change kept them.)*
- **Rewrote** the staff email (module 8): decision request + approve/decline buttons → FYI notification + Interests list. Subject → `New Volunteer: {firstname} {surname}`.
- **Added** modules 201 (find last ID) → 202 (compute next ID) → 203 (insert row, now incl. `Email`) → 204 (welcome email to applicant), after module 8 in the Application branch.
- **Left untouched:** the old approval branch (modules 4, 16, 11, 12, 9, 17, 14) — present but unreachable — and everything Homecare.

Pushed via the Make API (`PATCH /api/v2/scenarios/6322986`), verified byte-exact against the reviewed blueprint, then tested with a live submission. Pre/post blueprints saved beside this doc.

This document, plus `volunteer-registration.blueprint.pre-stage1.json`, is the reference point if the change needs to be reverted.
