# CAPS rebuild — Phase 0: features & workflows

**Purpose:** agree WHAT the new app does before designing the schema. Mark this up — add, cut, correct.
**Source:** everything the current AppSheet app does (`appsheet-current-state.md`) + the new features you named.

---

## 1. Entities (the nouns)

| Entity | Carried over? | Notes |
|---|---|---|
| **Dog** | yes | profile, status, arrival/exit, level, medical |
| **Volunteer** | yes | walkers; register via public form |
| **Homecarer** | yes | jail-break / foster carers; register via public form + approval |
| **Walk** | yes | one walk: dog + volunteer + out/in times |
| **Homecare stint** | yes | dog out to a homecarer: jail break or foster, with due-back |
| **Bed rest episode** | yes — **as a log now**, not fields on the dog | start / end / due-back / reason |
| **Site visit** | yes | someone on site: registered volunteer or guest, in/out |
| **Medical event** | **NEW** | dated entries per dog — vet visit, meds, procedure, note |
| **Note** | **NEW** | free note attached to a dog, volunteer, or homecarer; timestamped + who wrote it |
| **User** | **NEW (explicit)** | login + role (admin / staff / volunteer / read-only) |

### Structural note for schema (Phase 1)
Walk, jail break, foster, and bed rest are all the **same shape**: *a dog is out, for a reason, with an expected return, and an actual return.* Same flow, same screens. **The one difference:** walk / jail break / foster have a **responsible person**; bed rest does **not** (it's the shelter's own care, no human match). So the unified pattern has an *optional* person. One `dog_absence` table with a `type` and a nullable `person`, or identical-shape tables. **Decide in Phase 1.**

---

## 2. Workflows (the verbs)

### Dogs
| Workflow | Who | What happens |
|---|---|---|
| **Intake a dog** | staff | create dog record: name, level, arrival date/type, notes → status `Available` |
| **Walk — check out** | volunteer / staff | pick dog (from Available) → pick self as walker → out-time set → dog status `Walking` |
| **Walk — check in** | volunteer / staff | pick the open walk → in-time set → duration computed → dog status back to `Available` |
| **Homecare — check out** | staff | pick dog → pick homecarer (only approved for that type) → jail break or foster → due-back date → dog status `Jail Break` / `Fostered` |
| **Homecare — return** | staff | pick the open stint → return-time set → dog status back to `Available` |
| **Bed rest — start** | staff | pick dog → reason + due-back → dog status `Bed Rest` |
| **Bed rest — end** | staff | pick the open episode → dog status back to `Available` |
| **Exit a dog** | staff/admin | exit date + type (Adopted / Transferred / Reclaimed / Death) + notes → dog `Exited` / archived |
| **Add a medical event** | staff | dated entry on the dog: type, detail, vet, cost (optional) |
| **Add a note** | any logged-in | free note on the dog |
| **Edit dog profile** | staff | name, level, photo, notes |

### Volunteers
| Workflow | Who | What happens |
|---|---|---|
| **Register** | public | HTML form → volunteer record created, status `Active` (no approval gate — matches the current live behaviour) → welcome email |
| **Exit** | staff | end date + reason → status `Exited` / archived |
| **Add a note** | staff | note on the volunteer |

### Homecarers
| Workflow | Who | What happens |
|---|---|---|
| **Register** | public | HTML form → homecarer record, status `Pending` → staff notified |
| **Approve / decline** | staff | in the app: approve for jail break, approve for foster, approve both, or decline → status + approval flags set → email to applicant |
| **Exit** | staff | end date → status `Exited` |
| **Add a note** | staff | note on the homecarer |

### Site visits
| Workflow | Who | What happens |
|---|---|---|
| **Sign in** | anyone on site | registered volunteer (pick from list) or guest (name + phone) → reason → in-time |
| **Sign out** | same | pick the open visit → out-time |

### System / staff
| Workflow | Who | What happens |
|---|---|---|
| **Overdue alert** | automatic (scheduled) | any dog out past its due-back (homecare or bed rest) → email to staff, once |
| **Reports** | staff / read-only | see §4 |
| **Manage users** | admin | invite a user, set role, deactivate |

---

## 3. Screens (the surfaces)

- **Dogs** — grouped by status (Available / Walking / Fostered / Jail Break / Bed Rest), each card showing the key line (who has it, days out, due back, or last-walk stats). The current "dynamic card subtitle" — cleaner.
- **Dog profile** — full page: photo, details, current status, walk history, homecare history, bed rest history, medical log, notes.
- **Check out / check in** — the canonical *pick → confirm → done* flow, one shape for walk / homecare / bed rest.
- **Volunteers** — list (active), sortable by recent activity; profile page with history + notes.
- **Homecarers** — list (active + pending), approval queue; profile page.
- **Site — who's on site now** + sign in/out.
- **Logs** — walks, homecare stints, site visits, medical events (filterable, exportable).
- **Reports / dashboard** — see §4.
- **Admin** — users & roles, the reporting-mirror status.
- **Public** — `/apply/volunteer`, `/apply/homecare`.

---

## 4. New features — detail

### Dog profiles
A real page per dog. Photo (see decision P1), current status + who has it, and the four histories (walks / homecare / bed rest / medical) plus notes. Replaces today's thin card + inline data.

### Medical history
A log table: `date, dog, type (vet visit / medication / procedure / observation), detail, vet`. Shown on the dog profile, filterable in Logs. Replaces the single free-text `Medical Notes` field (that field migrates in as the first entry per dog). **No cost field in v1** (P6).

### User notes
`created_at, author, subject (dog | volunteer | homecarer), body`. A running thread on any profile. Nothing structured — just "so we don't lose context."

### Overdue alerts
A scheduled job (runs a few times a day). Finds dogs out past due-back with no return logged → one email to staff listing them. Marks each as alerted so it doesn't repeat. Covers homecare + bed rest.

### Data analysis / reports (v1 set)
- Dogs not walked in N days (the current core need)
- Walk frequency + total minutes per dog, per volunteer (rolling 28 days + all-time)
- Length of stay: current dogs, and average for exited dogs by exit type
- Homecare load: who has how many, for how long
- Intake vs exit over time
- Currently-out board: every dog not `Available`, why, since when, due when

All exportable to CSV. The nightly Google Sheet mirror covers anyone who wants to pivot it themselves.

---

## 5. Retrospective entry & data discipline  (NEW — from Paul, 03/09)

**The real-world problem:** dogs get walked without being checked out; brought back without being checked in. The app must let people fix the record after the fact — but with enough friction that they still prefer to check out properly, and enough validation that late entries stay honest.

### What it must allow
- **Log a completed walk** — pick dog + walker, enter *both* out and in times. (The current app's `Is_Manual_Entry` flag, formalised.)
- **Backfill a return** — a dog showing as "out" that's actually back: set the return time now.
- **Fix a wrong time** — edit an out/in time on an existing record.

### Guardrails (baked into the flow, not optional)
- Return time **cannot** be before the out time.
- No times in the **future**.
- Retrospective / edited records are **flagged** (`entered late` / `edited`) and visible as such in logs and reports — so patterns show and it can't be gamed silently.
- Backdating more than **48 h** (number TBD) needs a reason, or an admin.
- Editing another person's record needs staff/admin.

### Smart prompts (Phase 2 detail, noted here)
- Checking out a dog that's **already out** → "This dog is out with {X} since {Y}. Did they come back? Enter the return time." (routes to backfill-a-return)
- Checking in / logging a walk for a dog that's **not checked out** → "This dog isn't checked out. Log a completed walk instead?" (routes to log-a-completed-walk)
- The **overdue alert email** carries a one-click "the dog is back — enter the return time" link.

---

## 6. Adoption  (NEW workflow area — from Paul, 03/09; needs its own scoping pass)

Not in the current app at all. Paul: *"same model — application, approve, dog, visits, trials, fees, handover, exit — but it needs milestones, and the adopter should have some visibility."*

### Shape
An **Adoption** record moves through stages:
`applied → approved → matched to a dog → meet & greets / visits → trial → fees paid → handover → completed` (dog exits as `Adopted`) — or `withdrawn` / `declined` at any point.

- Reuses the **application → approve** pattern (like volunteer / homecare).
- Adds **milestone tracking** — each stage dated, with notes, by whom.
- **Adopter visibility** — an adopter-facing view (magic-link, no full account) showing where their application is up to. This is the genuinely new bit.
- An **adopter** is a new kind of person (not a volunteer/homecarer). Ties into a general "people" model — Phase 1 decides whether volunteers / homecarers / adopters / guests share one `people` table with roles, or stay separate.

### Decision
| A1 | Adoption in **v1**, or **v1.1** (fast-follow)? | Recommend **v1.1** — the core operational app (dogs / walks / homecare / bed rest / site / alerts / reports) is the urgent replacement; adoption is additive and deserves its own short Phase-0 pass. But the application+approve+people plumbing built for v1 is designed so adoption slots in without rework. |

---

## 7. v1 scope

### IN
Everything in §2 and §3. Entities in §1. The §4 features. §5 retrospective entry + guardrails. Email alerts. Nightly reporting mirror. PWA. Dog photos (P1). Volunteer self sign-in on their own phone (P7).

### OUT of v1 (later, not never)
- **Adoption** (§6) — v1.1
- SMS alerts; push notifications
- Public-facing adoptable-dogs page / website integration
- Donations / payments; medical costs
- Volunteer scheduling / rosters
- Multi-shelter / multi-site
- Fine-grained per-field permissions (v1 has 4 broad roles)

---

## 8. P1–P7 — resolved 03/09

| # | Question | Answer |
|---|---|---|
| P1 | Dog photos in v1? | **Yes** — one per dog, Supabase Storage. |
| P2 | Bed rest as a log? | **Yes, confirmed.** (No human match — see §1 note.) |
| P3 | Homecare approval = jailbreak / foster / both / decline? | **Yes.** |
| P4 | Anything to drop? | **No.** |
| P5 | Anything missing? | **Adoption** — now §6. |
| P6 | Medical cost field? | **Out** — no clean way, money out of v1. |
| P7 | Volunteers log walks on their own phone? | **Yes, regularly.** → every volunteer needs a login (magic link). Shelter tablet also runs as a shared kiosk. Auth is **not** tablet-only. |
