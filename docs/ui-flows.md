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
- **Primary action on the card:** Available → a one-tap **"Walk"** button (the fast path, §4); anything out → **"Bring in"** (fast path, §5). A secondary **"···"** opens the full flow (other types, another walker, a past time).
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

One flow, but the common case is **one tap**. Friction is only added where there's something to get wrong.

### The fast path (most walks)
On an **Available** dog's card, tap **"Walk"**. That's it:
- person = you (if you're a volunteer), or the kiosk name-picker's current person
- `started_at` = now, no due-back
- row inserted → status flips → the card immediately shows *"Walking · with you · 0:00"*

No wizard, no confirm screen. Undo is available for a few seconds via the toast.

### The full path (everything else)
Used when: you're not the walker · a different type (yard / jail break / foster / bed rest) · a backdated time · from the nav rather than a dog card.

1. **Dog** — skipped if you came from a card. Else a searchable list of **Available** dogs (name, ref, "last walk N days", ⚠ experienced-only). Picking one that's **already out** → *"{Dog} is out — {status} with {person} since {time}. Did they come back?"* → routes to **Bring in** (§5).
2. **Type** — Walk · Yard · Jail Break · Foster · Bed Rest.
3. **Person** — *walk / jail break / foster only* (yard & bed rest record `placed_by` = you).
   - Walk: default **"Me"**, else search active volunteers. Everyone active is selectable — **missing DOB / emergency contact does not block** (§ activation note); such volunteers just show a small "details needed" tag.
   - Jail break / foster: only people with an **active** carer role for that type.
4. **Times & details**
   - Walk: `started_at` = now. A **"This already happened"** toggle (styled `--warm`, the non-default path) reveals start + end → completed retrospective walk (`entered_late`).
   - Yard: `started_at` = now.
   - Jail break / foster: `started_at` = now (editable). **Due back** (date + time) required. Optional notes.
   - Bed rest: `started_at` = now (editable). **Due back** (date + time) required. **Reason** required.
5. **Submit** — the button is *labelled with what it does*, no separate screen:
   > **Start — {Dog} out with {person}{, due back {time}}**
   This read-back is the whole point: it catches wrong-dog / wrong-person / wrong-time before the status flips for everyone.

**Result:** `dog_activity` row → trigger flips `dogs.status` → toast → back to Dogs.

**Guardrails surfaced here:** future start → blocked with a message; backdating start > 48 h → asks for a reason (or `staff`).

---

## 5. The canonical flow — Bring a dog in

### Fast path
On an **out** dog's card, tap **"Bring in"** → `ended_at` = now → status → Available → toast (with a few-second undo). Done.

### Full path
Used when the return wasn't now, or there's a note / medical to add.
1. **Which activity** — auto-selected if one open row (the normal case). Shows dog, type, person, out-since, due-back, live elapsed.
2. **Return time** — defaults to **now**. **"Came back earlier"** reveals a time field — must be ≥ start and ≤ now (message if not). A non-now value flags the row `edited`.
3. **Notes (optional)** — free text. For jail break / foster / bed rest also: *"Anything medical from this stay?"* → optional quick **medical event**.
4. **Submit** — labelled: **"Bring {Dog} in — out for {duration}"**.

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

**Section — On-site help**
Checkboxes: Walk dogs · Feeding & cleaning · Transport · Pet minding · Cooking · Social media · Fundraising · *Wherever most useful*.

**Section — Homecare**
> *Hosting a dog in your own home for the short or long term.*

- ☐ **Jail break** — a dog stays with you for a night, a weekend, a short break from the kennels.
- ☐ **Foster** — a dog lives with you longer term while it waits for adoption.

(Ticking either opens the property/household section and starts an approval process — a yard check and staff sign-off.)

**Section — About you** (everyone)
Name, email *(required; the shelter's own address is rejected)*, phone, DOB, address.

**Section — Emergency contact** (everyone, encouraged not enforced)
Name, phone, email, relationship. *If you skip it we'll ask again later.*

**If under 18:** parent/guardian name, phone, email + consent tick.

**If Jail break or Foster ticked — Homecare details:** ownership, fence type & height, people at home, children under 16, other animals + details, vaccinations current, experience, availability, agree to terms, signature.

Submit.

**On submit** (API route, service role):
- Match on email → existing `people` row, or create one.
- Add `person_roles`: `volunteer` → **`active`** immediately (welcome email). `jailbreak_carer` / `foster_carer` → **`pending`** (staff notified; applicant gets "received, we'll be in touch").
- Create `volunteer_profile` and/or `homecare_profile` from the relevant sections.
- No second form, no matching step — **one identity, keyed on email.**

### Activation & missing details (soft, not gates)
- A `volunteer` role is **active immediately** and can log walks **even without DOB / emergency contact**. We chase those, we don't block on them.
- Missing DOB **or** emergency contact → a **dismissible-but-persistent banner** on the person's profile and on the check-out screen ("Add your emergency contact — 30 seconds"), plus a staff report *"volunteers missing details"*.
- **Parental consent for a minor:** a strong prompt, not currently a hard gate — **flagged for CAPS to decide** (insurance implications). Easy to switch to a gate later.
- **Carer approval stays a gate:** a `jailbreak_carer` / `foster_carer` role can't be approved until `homecare_profile` is complete and a yard check is recorded.

A returning person who already exists just gets the new role added.

### An existing volunteer wants to foster / jail break
No re-registration. Either:
- **They do it** — their own **profile → "Apply for homecare"** opens *only* the Homecare section + property/household details (identity/contact already known). Submit → a `foster_carer` / `jailbreak_carer` role, `pending`, on their existing record.
- **Staff do it** — People → the person → **Add role → Foster / Jail break carer**; fill the property section (or send them the link). → `pending`.
Then staff approve (§8). Same form section as registration, reached from inside the app.

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
