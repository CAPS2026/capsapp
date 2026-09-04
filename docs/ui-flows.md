# CAPS App — UI flows (Phase 2)

Screens and interactions, wireframe-level. Not visual design (that's Phase 3).
Everything here maps to the tables in `docs/schema.md`.

Guiding rules:
- **One canonical "dog goes out / comes back" flow**, reused for walk / yard / jail break / foster / bed rest.
- **Home base shows only what's relevant to a dog's current status.** History lives on the detail card.
- **Retrospective entry is always possible but always visible** — late/edited records are badged.
- Thumb-first, big targets, readable in sunlight, works on the shelter tablet and a volunteer's phone.

---

## 1. App shell & navigation

Bottom nav (tablet & phone), items shown by role:

| Item | volunteer | staff / committee |
|---|---|---|
| **Dogs** (home) | ✓ | ✓ |
| **Take out / Bring in** (the action) | ✓ | ✓ |
| **People** | — | ✓ |
| **Site** (who's here) | ✓ | ✓ |
| **Logs** | own walks | all |
| **Reports** | — | ✓ |
| **Admin** (users, settings) | — | admin only |

Top bar: current user (or **kiosk** name), a global search (dogs + people), sync/offline indicator.

---

## 2. Dogs — home base

The most-used screen. A single scrolling list, **grouped by status in fixed order**:
`Walking · Yard · Available · Bed Rest · Jail Break · Fostered` (Exited is not shown here — see Archive).

- Group header: status label + count.
- **Sort within a group:** longest-since-last-walk first (never-walked pinned to top). Same as today.
- Each **card** shows only the line relevant to the current status:

| Status | Card line |
|---|---|
| Walking | `With {walker} · out {H:MM}` — live timer; turns amber past `walk_alert_after_minutes` |
| Yard | `In the yard · {H:MM}` — live timer; amber past `yard_alert_after_minutes` |
| Available | `Last walk {N} days ago · {mins} min / 4 wks` |
| Bed Rest | `Since {date} · due {date} · {reason}` |
| Jail Break | `With {carer} · out {N}d · due {date}` |
| Fostered | `With {carer} · out {N}d · due {date}` |

- Card also shows: name, `ref`, primary photo thumb, and an **⚠ badge** if `experienced_handler_only`.
- **Tap card → dog detail (§3).**
- **Primary action on the card** depends on status: Available → **Take out**; anything out → **Bring in**. (Long-press / secondary → the full type menu.)
- Filter chips at top: *Needs a walk* (Available + `last walk > needs_walk_after_days`), *Out now*, *My dogs* (volunteer: dogs I currently have).

---

## 3. Dog detail card

Header: photo carousel, name, `ref`, current status pill, quick actions (**Take out / Bring in**, **Add note**, staff: **Edit**, **Medical**).

### Public panel (everyone)
Breed · age (from DOB or `age_override`) · sex · size · colour · desexed/vaccinated/wormed/heartworm · `good_with_*` chips · energy · house-trained · `handling_notes` · `public_description` · `public_medical_summary`.

### Listing panel (staff; volunteers read-only)
The SavourLife fields: adoption fee, interstate y/n, available-within, BIN/source no., adoption policy, SavourLife ID, "Listed" toggle. A **"Copy for SavourLife"** button (staff) → formats the payload for upload; later, a direct push.

### Staff-only panel (`dog_confidential` + `medical_events`)
Behaviour notes / bite history · adoption history · internal medical summary · restrictions. **Volunteers never see this section — it isn't sent to their client.**

### Activity (everyone)
"Most recent of each type": last **walk**, last **yard**, last **bed rest**, last **homecare** — each a one-liner (when, who, how long). Below: **last 5 activities** combined, newest first; **"See all"** → the dog's activity log. Late/edited rows badged.

### Notes
Running thread (`notes`). Volunteers see `visibility='all'`; staff see everything. Add-note box inline.

### Time with CAPS
Elapsed since arrival (or "Time unknown" if no arrival date).

---

## 4. The canonical flow — Take a dog out

One flow. Entry points: card **Take out** button, dog detail, or the nav **Take out / Bring in**.

**Step 1 — Dog.** Skipped if you came from a dog. Otherwise a searchable list of **Available** dogs: name, ref, "last walk N days", ⚠ experienced-only. Picking a dog that's **already out** → *"{Dog} is already out — {status} with {person} since {time}. Did they come back?"* → routes to **Bring in** (§5).

**Step 2 — Type.** Walk · Yard · Jail Break · Foster · Bed Rest. (A card's **Take out** on an Available dog defaults to Walk and skips to step 3; long-press picks the type first.)

**Step 3 — Person.** *Walk / Jail Break / Foster only. Skipped for Yard & Bed Rest* (those record `placed_by` = you, the logged-in staffer).
- **Walk:** default **"Me"** if you're a volunteer. Else search active volunteers. Volunteers missing DOB / emergency contact, or minors without consent, are **not selectable** (shown greyed with the reason — staff can fix on the spot).
- **Jail Break / Foster:** only homecarers with an **active** role for that type appear.

**Step 4 — Times & details.**
- **Walk:** `started_at` = now. No due-back. A **"This already happened"** toggle reveals start + end fields → this becomes a completed retrospective walk (`entered_late`).
- **Yard:** `started_at` = now.
- **Jail Break / Foster:** `started_at` = now (editable). **Due back** required (date + time). Optional notes.
- **Bed Rest:** `started_at` = now (editable). **Due back** required (date + time). **Reason** required.

**Step 5 — Confirm.** One sentence + one button:
> *"Take **{Dog}** out for a **{type}** with **{person}**, from **{time}**{, due back **{time}**}. Confirm."*

**Result:** `dog_activity` row inserted → trigger flips `dogs.status` → toast *"{Dog} is now {Status}"* → back to Dogs, that dog now in its new group.

**Guardrails surfaced here:** future start time → blocked with a message; backdating start > 48 h → asks for a reason (or requires staff).

---

## 5. The canonical flow — Bring a dog in

Entry: card **Bring in**, dog detail, the "End Walk / End Homecare" lists, or a link in the overdue-alert email.

**Step 1 — Which activity.** Auto-selected if one open row (the normal case). Shows dog, type, person, out-since, due-back, live elapsed.

**Step 2 — Return time.** Defaults to **now**. **"Came back earlier"** reveals a time field — must be ≥ start and ≤ now (enforced; message if not). A non-now value flags the row `edited` / `entered_late`.

**Step 3 — Notes (optional).** Free text. For Jail Break / Foster / Bed Rest also: *"Anything medical from this stay?"* → optional quick **medical event** (date, type, detail).

**Step 4 — Confirm.**
> *"Bring **{Dog}** back in? Out for **{duration}**. Confirm."*

**Result:** `ended_at` set → trigger → `dogs.status = available` → toast → back to Dogs.

---

## 6. Retrospective entry & smart prompts

The "things get forgotten" cases. All produce badged rows.

| Situation | How the app helps |
|---|---|
| Dog was walked, never checked out | Dog card / "+ Log past walk" → pick volunteer + **start & end** (both required). `entered_late = true`. |
| Dog shows **Out** but is actually back | Tapping the dog → *"Still marked out with {X} since {time} — enter the return time."* → time → confirm. Flags `edited`. |
| Wrong time on an existing record | In any log, a row → **Edit times** (own recent rows; staff any). Records `edited_by` / `edited_at`; badge shows in logs & reports. |
| Trying to check out a dog that's already out | Prompt from §4 step 1 → routes to Bring in. |
| Trying to check in / log a walk for a dog **not** out | *"{Dog} isn't checked out. Log a completed walk instead?"* → the completed-walk form. |
| Overdue-alert email | Each listed dog links to **Bring in**, pre-opened at the return-time step. |

Hard rules (DB-enforced, echoed in UI): return ≥ departure; no future times; one open activity per dog.
Soft rule (app): backdating start > 48 h needs a reason or `staff`.

---

## 7. Register (public, no login)

One page: **"Get involved with CAPS"**.

1. **What would you like to do?** — checkboxes: Walk dogs · Feeding & cleaning · Transport · Pet minding · Cooking · Social media · Fundraising · Foster · Jail break · *Wherever most useful*.
2. **About you** (everyone): name, email *(required; the shelter's own address is rejected)*, phone, DOB, address.
3. **Emergency contact** (everyone): name, phone, email, relationship.
4. **If under 18:** parent/guardian name, phone, email + consent tick.
5. **If Foster or Jail break ticked:** the property/household section (ownership, fence type & height, people at home, children under 16, other animals + details, vaccinations current, experience, availability, agree to terms, signature).
6. Submit.

**On submit** (API route, service role):
- Match on email → existing `people` row, or create one.
- Add `person_roles`: `volunteer` → **`active`** immediately (welcome email). `jailbreak_carer` / `foster_carer` → **`pending`** (staff notified; applicant gets "received, we'll be in touch").
- Create `volunteer_profile` and/or `homecare_profile` from the relevant sections.
- No second form, no matching step — **one identity, keyed on email.**

A returning person who already exists just gets the new role added.

---

## 8. People (staff)

**List:** active people, searchable. Columns: name, **role badges**, phone/email, "last active" (most recent activity). Filters: role, status (pending / active / exited), *pending approvals*.

**Person detail:**
- Identity + emergency contact + (if minor) guardian & consent.
- **Roles** — each with status, granted date, approver. Buttons: add role, **approve / decline** (carer roles), end role.
- `volunteer_profile` and/or `homecare_profile` panels (editable by staff; the person can edit their own via their profile).
- **Activity** — this person's walks / homecare stints, newest first.
- Notes thread.
- **Merge person** (admin) — pick a duplicate, choose which fields win, re-point their activity. For the rare case a duplicate slips past the email check.

**Approve a carer:** on a `pending` `jailbreak_carer` / `foster_carer` role → **Approve jail break**, **Approve foster**, **Approve both**, **Decline**. Sets role status + `approved_by`; emails the applicant. (Blocked until `homecare_profile` complete + yard check recorded.)

---

## 9. Site — who's here

**Board:** everyone currently on site (open `site_visits`), name + reason + since.
- **Sign in:** registered person (pick from list) **or** guest (name + phone) → reason → in. Anyone logged in (incl. kiosk) can do this.
- **Sign out:** tap a row → out time (default now) → confirm.

---

## 10. Logs (staff; volunteers see their own walks)

Tabs: **Walks · Homecare · Yard · Bed Rest · Medical · Site visits**.
- Each: filterable (date range, dog, person), sortable, **CSV export**.
- **Late / edited rows badged** with who & when.
- Row → detail; staff can **Edit times** or **Delete** (delete = staff, logged).

---

## 11. Reports / dashboard (staff)

- **Needs a walk** — Available dogs, last walk > `needs_walk_after_days`, worst first.
- **Currently out** — every non-Available dog: why, with whom, since, due.
- **Walk activity** — per dog and per volunteer: count + minutes, rolling 28 days and all-time.
- **Length of stay** — current dogs; average for exited dogs by exit type.
- **Homecare load** — carers with active stints: how many, how long.
- **Intake vs exit** — monthly.
- All exportable. The nightly Supabase→Google Sheet mirror covers anyone who'd rather pivot it themselves.

---

## 12. Alerts (email, via Resend)

A scheduled job (a few times a day) emails the `alert_recipients` list when:
- a Jail Break / Foster / Bed Rest is past `due_back`, or
- a Walk has been open > `walk_alert_after_minutes`, or
- a Yard stay > `yard_alert_after_minutes`.

Email lists each dog: name, type, who, how long overdue, and a **"the dog is back — enter the return time"** link straight into **Bring in**. Each alert sent once per activity.

---

## 13. Auth & sign-in

- **Magic link** (email) or **Google**. First sign-in links `auth.users` → `people` by matching email.
- **Kiosk mode** for the shelter tablet: a shared `staff` login, then a **"who are you?"** name picker so walks are still attributed to the individual volunteer. Volunteers on their own phones sign in as themselves.
- No password anywhere.

---

## 14. Role → visibility summary

| | volunteer | staff | committee | admin |
|---|---|---|---|---|
| Dogs list + public/listing panels | ✓ | ✓ | ✓ | ✓ |
| `dog_confidential` + medical log | — | ✓ | ✓ | ✓ |
| Take out / bring in | ✓ (walks: self) | ✓ all | ✓ all | ✓ |
| Retrospective own recent | ✓ | ✓ all | ✓ all | ✓ |
| People list & details | own record | ✓ | ✓ | ✓ |
| Approve carers | — | ✓ | ✓ | ✓ |
| Reports | — | ✓ | ✓ | ✓ |
| Users & settings, merge person | — | — | — | ✓ |

(Committee = staff for v1; diverges later, e.g. committee-only views of staff activity.)

---

## 15. Build order (feeds Phase 4)

1. Auth + shell + role gating.
2. Dogs list (read) + dog detail (read).
3. **Take out / Bring in** — the canonical flow, walk first, then the other types.
4. Retrospective + smart prompts.
5. Register (public) + intake API.
6. People + carer approval.
7. Site visits.
8. Logs + CSV.
9. Reports.
10. Alerts job + Sheet mirror.
