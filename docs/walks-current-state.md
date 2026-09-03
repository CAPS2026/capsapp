# Walks (Check-Out / Check-In) — Current State

**Snapshot date:** 28 August 2026
**Status:** Baseline reference. Includes one diagnosed bug with a proposed fix that has **not been confirmed as applied** — see Section 4.
**Make.com involvement:** None found. Nothing in the "Integration Webhooks" scenario touches the Walks sheet. This section is pure AppSheet.

---

## 1. The `Walks` table (in `CAPS_walking_log_MASTER`)

| Column | Purpose |
|---|---|
| `Walk_ID` | Key, `UNIQUEID()`. |
| `Dog_ID` | Ref to Dogs. Resolved via `LOOKUP` against the `Dog_Picker` field's text (see Section 5, Dogs doc, for the name-matching risk this creates). |
| `Volunteer_ID` | Ref to Volunteers. |
| `Check Out` | DateTime. Initial value always `NOW()` — effectively always populated the moment a walk row is created. |
| `Check In` | DateTime. No initial value — blank unless explicitly set. |
| `Is_Manual_Entry` | Yes/No, default `FALSE`. Lets a volunteer log a walk that's already finished (both Check Out and Check In entered at once) rather than checking out live. |
| `Dog_Picker` | The dropdown text used to pick a dog, from which `Dog_ID` is derived. |
| `Walk_Length_Minutes` | Virtual, computed from Check In − Check Out. |

---

## 2. How dog status is meant to track a walk

Two AppSheet Automations (Bots) are responsible for keeping `Dogs.Status` in sync with what's happening in Walks — this is separate from the Walks table itself:

- **"Start Walk Status Update"** — triggers on Walks table **Adds**, condition `ISNOTBLANK([Dog_ID])`, runs `Set Dog Status To Walking` on the matching Dog.
- **"End Walk Status Update"** — triggers on Walks table **Updates only**, condition `ISNOTBLANK([Check In])`, runs `Set Dog Status To Available` on the matching Dog.

Separately, on the End Walk screen, tapping a dog runs the action **"Record Check In Time"**, which sets `Check In = NOW()` on that Walks row (an Update) — this is what triggers the End Walk bot above in the normal flow.

## 3. Normal flow (confirmed working)

1. Volunteer checks a dog out via the Start Walk form → new Walks row, `Check In` blank → Start Walk bot fires → Dog status → **Walking**.
2. Later, volunteer taps the dog on End Walk → `Check In` gets set (an Update) → End Walk bot fires → Dog status → **Available**.

This path was verified directly against the live bot configuration (screenshots reviewed) and confirmed working as-is. No change was needed here.

## 4. Manual entry (diagnosed bug — fix proposed, not confirmed applied)

When a volunteer uses **Is_Manual_Entry** to log a walk that's already finished, both `Check Out` and `Check In` are set in the same Add — there's no separate Update afterward.

- The Start Walk bot triggers on Adds unconditionally (its condition only checks `Dog_ID`, not `Check In`) → sets the dog to **Walking**, even though the walk is already over.
- The End Walk bot only listens for **Updates**, never Adds → never fires for this case.

Net effect: a dog logged via manual entry gets stuck showing "Walking" and never flips to "Available."

**Proposed fix** (walked through step-by-step earlier, matching what the live bot screenshots showed at the time):
1. Change the Start Walk bot's condition from `ISNOTBLANK([Dog_ID])` to `AND(ISNOTBLANK([Dog_ID]), ISBLANK([Check In]))`.
2. Add **Adds** to the End Walk bot's "Data change type" (currently Updates only), alongside the existing Updates.

**This has not been confirmed as implemented.** The bot screenshots reviewed showed the *original*, unfixed configuration. Worth checking directly before assuming this is resolved — it's the one open item in this section.

---

## 5. Known issue carried over from this section

**Dog selection is name-based, not ID-based.** `Walks.Dog_ID` is resolved via `LOOKUP(LEFT([Dog_Picker], FIND(" | ", [Dog_Picker])-1), "Dogs", "Dog Name", "Dog_ID")` — i.e., it matches on the dog's *name* text from the picker, not a stable identifier. Two dogs with the same or similar display name (the live data already has both "Cookie" and "Cookie (Female)" as separate dogs) create a real risk of a walk being logged against the wrong dog. This is really a Dogs-table issue surfacing here — see the Dogs document.
