# CAPS Dog Enrichment App — System Overview

**Snapshot date:** 28 August 2026 · **Updated:** 1 September 2026 (Volunteer approval gate removed 30 Aug; Homecare rebuilt as an independent stream 1 Sep — see below)
**Purpose:** Entry point into the full documentation set. Read this first, then go to the relevant section doc for detail.

---

## The pieces

| Piece | What it is |
|---|---|
| **AppSheet app** "CAPS Dog Enrichment App" | The staff/volunteer-facing app. Reads `CAPS_walking_log_MASTER` directly. |
| **`CAPS_walking_log_MASTER`** (Google Sheet) | Source of truth AppSheet reads. Tabs: `Dogs`, `Volunteers`, `Walks`, `Homecare`, `Site_Visits`. |
| **`CAPS_volunteer_tracking_sheet`** (Google Sheet) | Raw output of the Volunteer Registration form (`volunteer_applications` tab). Not read by AppSheet — only by Make. |
| **Two Google Forms** — `CAPS Volunteer Registration Form`, `CAPS Homecare Registration Form` | Public application forms. Each has its own bound Apps Script. |
| **Make.com scenario "Integration Webhooks"** (`scenarioId 6322986`, `teamId 2010758`) | The only automation. One shared webhook handles Volunteer, Homecare, and Adoption (Adoption not built out). Volunteer path no longer has an approval gate (changed 30 Aug 2026); Homecare still does. |
| **A standalone Apps Script on `CAPS_walking_log_MASTER`** (`sortDogsByLastWalk`) | Runs on a timer, reorders Dogs rows. Not connected to AppSheet or Make. Documented in the Dogs doc; flagged as possibly redundant. |

## Section documents

- `volunteer-registration-current-state.md`
- `homecare-current-state.md`
- `walks-current-state.md`
- `dogs-current-state.md` (includes Bed Rest, Archive, Adding a Dog as sub-sections)
- `site-visits-current-state.md`
- `caps-scripts-reference.md` — the actual source of all three Apps Scripts, verbatim

## The two live changes

1. **Volunteer Registration** — remove the manual approval step. A form submission creates the Volunteers row directly. **Done: pushed to the live scenario on 30 August 2026 via the Make API and verified with a test submission** (folder + doc + row `V059` + both emails, execution success). Folder/doc creation was kept; the staff email became an FYI; four modules (201–204) were added; the old approval branch is left in place but unreachable. See `volunteer-registration-current-state.md` §4/§6 and `volunteer-registration.blueprint.{pre,post}-stage1.json`.
2. **Homecare** — full separation from Volunteers: new `Homecarers` tab in master, own `HCR0XX` IDs, own folder tree (`03 Homecare`), no lookup back to `Volunteers` ever. Approval matches on `hcr_id`, not name. **Done: Make branch built + pushed 1 September 2026, verified with 4 test applications (HCR001–HCR004) covering intake + approve-both + approve-jb + decline.** Still pending (Paul): AppSheet wiring, backfill of existing homecarers, and seeding the `HCR` counter to the `HCR500`+ range before real traffic. See `homecare-redesign.md` and `volunteer-registration.blueprint.{pre,post}-homecare.json`.

## Known open items not resolved by the above two changes

- The 25 historical failed Make executions are not individually root-caused, and can't be — detailed logging wasn't on when they ran, and it doesn't apply retroactively. Reasonable to expect the two changes above resolve most of the underlying causes going forward, without needing to prove which old failure came from which cause. *(First data point: the 30 Aug post-change test submission ran clean — 8 operations, no `BundleValidationError`. Watch the next handful of real submissions.)*
- Whether the Walks manual-entry bot fix (see `walks-current-state.md`) was ever actually applied — unconfirmed.
- Whether the Dogs-sorting script (see `dogs-current-state.md`) is still needed now that AppSheet's own view sort does the same job.
