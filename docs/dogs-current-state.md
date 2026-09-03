# Dogs — Current State

**Snapshot date:** 28 August 2026
**Status:** Baseline reference. No changes proposed yet.
**Make.com involvement:** None found. Dogs is driven entirely by AppSheet — direct user actions, plus the Walks and Homecare Bots documented in their respective sections.

**Correction — a third automated system does touch this sheet.** A standalone Apps Script (`sortDogsByLastWalk`), bound directly to `CAPS_walking_log_MASTER` and run on a time-driven trigger every 10–15 minutes, physically reorders the Dogs sheet's rows — least-recently-walked (or never-walked) dogs to the top. It reads `Check In` times from Walks to compute this; it does not modify any cell values, only row order.

**This looks likely to be redundant.** AppSheet's own "Dogs" view already sorts by `Sort_Days_Since_Last_Walk` — a virtual column computing essentially the same "most overdue first" ordering — as a normal view-level sort, with no data mutation involved. The script's own code comment even says it was written to deliberately mirror that formula. It reads as a leftover from before the AppSheet view-level sort existed, now potentially doing the same job a second, riskier way: a real periodic write to the whole sheet, independent of and invisible to both AppSheet and Make. Given the concurrent-write class of risk documented elsewhere in this system (Issue 1), a timed script rewriting the entire Dogs range every 10-15 minutes is worth your attention specifically — not proposing anything here, just flagging it clearly since it was previously unknown to this documentation entirely.

---

## 1. The `Dogs` table (in `CAPS_walking_log_MASTER`)

| Column | Purpose |
|---|---|
| `Dog_ID` | Key. Formula: `"D" & RIGHT("000" & (22 + COUNT(...)+1), 3)`. The `+22` offset is baked into the formula itself — almost certainly compensating for dogs that existed before this formula was introduced. See Issue 1 for what actually happens in practice. |
| `Dog Name` | Not unique-enforced. Used as a matching key elsewhere in the system — see Issue 3. |
| `Level` | Beginner / Intermediate / Advanced. |
| `Status` | Walking / Available / Bed Rest / Jail Break / Fostered / Exited. Initial value `"Available"`. |
| `Arrival Date/Type/Notes`, `Exit Date/Type/Notes` | Intake and outcome record. |
| `Total Days with CAPS` | **App formula is `=999` — a hardcoded stub, not a real calculation.** See Issue 2. |
| `Medical Notes`, `Bed Rest Start/End`, `Bed Rest Due Back` | Bed rest tracking, manually driven. |
| `Last Homecare Start Date`, `Last_Walk_DateTime` | Convenience fields, partly duplicating what the virtual columns below already compute. |

Virtual (computed, read-only) columns of note: `Days_Since_last_Walk`, `Walk_Time_Past_Month`, `Dynamic Card Subtitles` (the text shown on each dog's card, which switches its whole content based on `Status`), `Latest Walk Event`, `Latest Homecare Event`.

---

## 2. How Status actually gets set

| Status value | Set by |
|---|---|
| **Available** (initial) | Default on Add. |
| **Walking** / back to **Available** | The two Walks Bots — see the Walks document. |
| **Jail Break** / **Fostered** | Two Homecare Bots ("Start/End Homecare Status Update"), calling `Set Dog Homecare Status and Start Date`. Its formula: `=ANY(SELECT(Homecare[Homecare Type], AND([Dog_ID]=[_THISROW].[Dog_ID], ISBLANK([Homecare End]))))` — picks the Homecare Type of *any* currently-open Homecare record for that dog. Works fine with one open record. If a dog ever had two simultaneously open Homecare entries of different types, this would pick one arbitrarily rather than erroring — worth being aware of, not yet seen evidence it's happened. |
| **Bed Rest** | Manual only — `Start Bedrest` / `End Bedrest` actions, directly user-triggered, no automation involved. |
| **Exited** | Manual only — `Dog Exit` action. |

---

## 3. Dog lifecycle sub-flows

**Adding a new dog.** The "Add a new Dog" form collects `Dog Name`, `Arrival Date`, `Arrival Type` (Rescue/Surrender/Return/Stray/Pound), `Arrival Notes`. On save, the row is just added — no bot, no follow-up action (`Form Saved` event is `**auto**`). `Status` defaults to `Available` and `Dog_ID` is assigned by the formula in Section 1. This is the entire intake process today — nothing else happens automatically (no photo, no onboarding checklist — this is the gap the "dog onboarding" feature you want built would fill).

**Bed Rest.** Fully manual, no automation involved:
- **Start Bedrest** action → sets `Status = "Bed Rest"` and `Bed Rest Start = TODAY()`, via the **Start Bedrest Form** (also captures `Medical Notes`, `Bed Rest Due Back`).
- **End Bedrest** action → sets `Status = "Available"` and `Bed Rest End = TODAY()`.
- Nothing checks `Bed Rest Due Back` against today's date or reminds anyone — it's a note field, not a trigger. A dog can sit past its due-back date indefinitely with no flag.

**Archive.** A dog is archived by running **Dog Exit** (via the **Exit CAPS Form**, capturing `Exit Date`, `Exit Type` — Adopted/Transferred/Reclaimed/Death — and `Exit Notes`). This sets `Status = "Exited"`. There's no separate "archive" action — a dog becomes archived purely as a side effect of `Exit Type` being non-blank, which is what the **Archived Dogs** slice filters on (`ISNOTBLANK([Exit Type])`). The row itself is never moved or deleted — it stays in the same `Dogs` sheet permanently, just filtered differently by the slice. Same pattern for Volunteers (`Archived Volunteers` slice filters on `End Date` being set).

---

## 4. Known issues

**Issue 1 — Dog_ID has the same dual-scheme problem as Volunteer_ID.** The live data shows both the expected `D0XX` sequential IDs and a second set of unrelated 8-character hex IDs (matching AppSheet's `UNIQUEID()` output style) mixed into the same column. Same root cause as the Volunteer_ID issue: more than one mechanism has created rows in this table over time, and they don't coordinate. Lower practical risk here than Volunteer_ID, since nothing else in the system counts existing Dog_IDs to generate new ones — but it's inconsistent data all the same, and worth understanding the history of before it's cleaned up.

**Issue 2 — "Total Days with CAPS" is not a real value.** The formula is a hardcoded `=999` for every dog. It feeds directly into `Time with CAPS`, the human-readable "X years, Y months" display — meaning that display is currently meaningless wherever it's shown, not just internally unused. Worth confirming whether anyone's actually relying on this being accurate.

**Issue 3 — Dog selection elsewhere in the system is name-based.** Both `Walks.Dog_ID` (via `Dog_Picker`) and Homecare's `Homecare_Dog_Picker` resolve to a specific dog by matching on `Dog Name` text, not a stable ID. Since `Dog Name` isn't enforced unique — the live data already has both "Cookie" and "Cookie (Female)" as two separate dogs — any name collision or near-collision creates a real chance of a walk or homecare record getting attached to the wrong dog. This is a Dogs-table root cause even though it surfaces in Walks and Homecare.

---

## 5. Not yet investigated

- The history behind the `+22` offset in the Dog_ID formula, and the origin of the hex-style IDs (Issue 1) — likely both trace back to the same pre-formula migration event, not independently confirmed.
- Whether any Bed Rest or Exit data has ever been affected by the name-matching risk in Issue 3.
