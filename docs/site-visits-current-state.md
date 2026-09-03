# Site Visits — Current State

**Snapshot date:** 28 August 2026
**Status:** Baseline reference. No changes proposed.
**Make.com involvement:** None. Pure AppSheet, self-contained.

---

## 1. The `Site_Visits` table

| Column | Purpose |
|---|---|
| `Visit_ID` | Key: `"SV" & RIGHT(UNIQUEID(),6)`. |
| `Visitor_Type` | `Registered` (an existing Volunteer) or `Guest`. |
| `Volunteer_ID` | Shown only if Registered. Dropdown restricted to `Active` volunteers only. |
| `Guest_Name`, `Guest_Phone` | Shown only if Guest. |
| `Reason` | Enum (Employment, Walking, Feeding and Cleaning, Committee Matters, etc.) plus free-text `Reason_Other`. |
| `Check_In` | Initial value `NOW()`. |
| `Check_Out` | Blank until end of visit. |

Virtual: `Site Status` (`"Currently In"` if Check_Out blank, else `"Signed Out"`), `Display Name` (Volunteer Name or Guest Name depending on type).

## 2. Flow

1. **Site Visit Sign In** form — pick Registered or Guest, fill in the relevant fields, submit. `Check_In` is stamped automatically.
2. Visitor appears in **Site Visitors Today**, grouped by Currently In / Signed Out.
3. On departure, someone taps **End Site Visit** on their row — a manual action, sets `Check_Out = NOW()`.

That's the whole flow. No bots, no automation, no dependency on Volunteer approval status changes elsewhere in the system (the Registered dropdown just reads whichever Volunteers are currently Active, whatever process put them there).

## 3. Known limitation, not a bug

Nothing automatically closes out a visit. If someone forgets to tap End Site Visit, they stay "Currently In" indefinitely — same class of gap as everywhere else in this system that depends on someone remembering a manual step, just lower-stakes here than the other sections.
