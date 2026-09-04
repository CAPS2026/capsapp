# CAPS App — database schema (Phase 1 draft)

Target: Supabase project **CAPS App** (`amozcnlvfcxzeaukgbjb`), Postgres 17.
Status: **draft for review** — nothing applied to the database yet.
Source: `caps-phase0-features.md`, `appsheet-current-state.json`, and the design discussion Sep 2026.

---

## 0. Principles

- **UUID primary keys** everywhere (`id uuid default gen_random_uuid()`). Internal, never shown.
- **Human-facing codes** are separate columns: `dogs.ref` = `D001`; people have **legacy** `V0xx` / `HCR0xx` as migration-bridge fields only, not minted for new people.
- **One identity per person.** `people` + roles. No separate volunteer/homecarer tables.
- **RLS on every table.** Default deny. Policies by role (§8).
- **Timestamps** `timestamptz`, stored UTC, displayed Australia/Brisbane.
- **Logs are append-mostly.** Edits allowed but flagged and attributed (retrospective-entry requirement, §3).
- **Enums** as Postgres `enum` types where the set is closed; reference tables where it needs ordering/labels editable by staff (`dog_statuses`).

---

## 1. People

### `people` — one row per human
```sql
create table people (
  id              uuid primary key default gen_random_uuid(),
  first_name      text not null,
  surname         text not null,
  nickname        text,
  email           citext unique,          -- nullable: staff-created records may have none
  phone           text,
  date_of_birth   date,
  is_minor        boolean generated always as (
                    date_of_birth is not null and date_of_birth > (current_date - interval '18 years')
                  ) stored,
  address         text,
  -- emergency contact (required to ACTIVATE any on-site role)
  ec_name         text,
  ec_phone        text,
  ec_email        text,
  ec_relationship text,
  -- parent / guardian (required when is_minor)
  parent_name           text,
  parent_phone          text,
  parent_email          text,
  parental_consent      boolean not null default false,
  parental_consent_date date,
  -- housekeeping
  legacy_volunteer_id  text,              -- 'V012'  — migration bridge, not shown
  legacy_homecarer_id  text,              -- 'HCR045'
  auth_user_id    uuid unique references auth.users(id) on delete set null,
  notes_internal  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
```
- `email` rejected at the API if it equals the shelter's own address.
- `auth_user_id` links to Supabase Auth once the person logs in (magic link). Absent = staff-managed, no self-serve.
- Duplicate resolution: unique email on the way in; a staff **merge-person** action for anything that slips through.

### `person_roles` — the hats
```sql
create type person_role as enum
  ('volunteer','jailbreak_carer','foster_carer','adopter','staff','committee');
--  'volunteer' covers all on-site helpers (walk / feed / clean / transport / …).
--  What they actually do is captured by volunteer_profile.interests, not by role.

create type role_status as enum ('pending','active','exited','declined');

create table person_roles (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null references people(id) on delete cascade,
  role         person_role not null,
  status       role_status not null default 'pending',
  granted_on   date,
  ended_on     date,
  approved_by  uuid references people(id),
  note         text,
  created_at   timestamptz not null default now(),
  unique (person_id, role)
);
```
- **volunteer** → created `active` on form submit (matches the current no-approval-gate behaviour).
- **jailbreak_carer / foster_carer** → created `pending`; staff approve (either / both) or decline.
- **staff / committee** → assigned by an admin only.
- **Activation rules** (enforced at the API / app layer, some as triggers):
  - any role can't go `active` without `date_of_birth` + emergency contact on `people`.
  - if `people.is_minor` → also needs `parental_consent = true`.
  - `jailbreak_carer` / `foster_carer` → also needs a completed `homecare_profile` (and yard check).

### `homecare_profile` — carer property/household bundle (one per carer)
```sql
create table homecare_profile (
  person_id          uuid primary key references people(id) on delete cascade,
  over_18            boolean,
  property_ownership text,        -- Homeowner / Renting (+ pet approval letter)
  fence_type         text,
  fence_height       text,
  people_at_home     int,
  children_u16       int,
  other_animals      text,
  animal_details     text,
  vaccines_current   boolean,
  experience         text,
  -- availability
  jb_day  boolean, jb_weekend boolean, jb_shift boolean, jb_school boolean,
  foster_short boolean, foster_long boolean,
  agree_terms       boolean,
  signature_name    text,
  signature_date    date,
  applied_on        date,
  yard_check_done   boolean,
  yard_check_by     uuid references people(id),
  yard_check_on     date,
  updated_at        timestamptz not null default now()
);
```
Same info whether jailbreak or foster — the `person_roles` rows say which they're approved for.

### `volunteer_profile` — on-site volunteer detail (one per volunteer)
```sql
create table volunteer_profile (
  person_id      uuid primary key references people(id) on delete cascade,
  interests      text[] not null default '{}',   -- 'dog_walking','feeding_cleaning','transport',
                                                  -- 'pet_minding','cooking','social_media','fundraising',
                                                  -- 'committee','wherever_useful'
  experience     text,
  medical_issues text,           -- conditions that affect what they can safely do on site
  how_heard      text,
  agree_terms    boolean,
  signature_name text,
  signature_date date,
  updated_at     timestamptz not null default now()
);
```
`interests` is a free set (seeded from a small `volunteer_interest` lookup so staff can extend without a migration). Emergency contact and parent/guardian live on `people` because they matter for *any* on-site role.

---

## 2. Dogs

### `dog_statuses` — reference table (ordered, staff-editable labels)
```sql
create table dog_statuses (
  code       text primary key,   -- 'walking','yard','available','bed_rest','jail_break','fostered','exited'
  label      text not null,
  sort_order int  not null,
  is_out     boolean not null    -- true = dog is not in its kennel
);
-- seed order: walking(1), yard(2), available(3), bed_rest(4), jail_break(5), fostered(6), exited(7)
```

### `dogs`
```sql
create table dogs (
  id              uuid primary key default gen_random_uuid(),
  ref             text unique not null,        -- 'D001' — live short code, kennel cards
  name            text not null,
  status          text not null references dog_statuses(code) default 'available',

  -- handler guidance (volunteer-visible; NOT the confidential behaviour record)
  handling_notes  text,                         -- free phrase: "nervous with men, pulls hard, loves other dogs"
  experienced_handler_only boolean not null default false,

  -- intake / exit
  arrival_date    date,
  arrival_type    text,     -- Rescue / Surrender / Return / Stray / Pound
  arrival_notes   text,
  exit_date       date,
  exit_type       text,     -- Adopted / Transferred / Reclaimed / Death
  exit_notes      text,

  -- PUBLIC panel  (volunteers, adopters, marketing) + SavourLife export
  breed           text,
  date_of_birth   date,             -- estimated; app computes age
  age_override    text,             -- 'approx 10 months' when DOB unknown
  sex             char(1),          -- 'M' / 'F'
  size_when_adult text,             -- Small / Medium / Large / Giant
  colour          text,
  weight_kg       numeric,
  microchip_no    text,
  desexed         boolean, vaccinated boolean, wormed boolean, heartworm_treated boolean,
  good_with_kids_u5   text,   -- 'yes' / 'no' / 'untested'
  good_with_kids_5_12 text,
  good_with_cats      text,
  good_with_dogs      text,
  good_with_other     text,
  energy_level        text,
  house_trained       text,
  public_description  text,          -- the personality blurb
  public_medical_summary text,       -- short, shown publicly ("FHO surgery completed")
  adoption_fee        numeric,
  interstate_adoption boolean,
  adoption_available_within text,    -- 'Unrestricted' / radius
  adoption_policy     text,          -- 'Standard' / 'Strict'
  bin_source_number   text,
  savourlife_id       int,           -- set once listed on SavourLife
  listed_on_savourlife boolean not null default false,

  -- denormalised pointers for fast card rendering (kept fresh by trigger, §3)
  current_activity_id uuid,
  latest_walk_id      uuid,
  latest_yard_id      uuid,
  latest_bedrest_id   uuid,
  latest_homecare_id  uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `dog_confidential` — staff-only, hard boundary (1:1)
```sql
create table dog_confidential (
  dog_id            uuid primary key references dogs(id) on delete cascade,
  behaviour_notes   text,      -- bite history, reactivity, resource guarding
  adoption_history  text,      -- prior adoptions / returns / failed matches
  medical_summary_internal text,
  restrictions      text,      -- 'no homes with cats', 'experienced adopters only'
  updated_at        timestamptz not null default now()
);
```
Split into its own table (not columns on `dogs`) so RLS gives a clean "volunteers can't see this at all" boundary. Detailed dated medical entries live in `medical_events` (§4), also staff-only.

Photos: Supabase Storage bucket `dog-photos`, referenced by `dog_media` (`dog_id`, `path`, `is_primary`, `sort_order`, `caption`).

---

## 3. Activity — the unified "dog is out" log

One table for every kind of absence. Walk / yard / bed rest / jailbreak / foster share one shape; **person is nullable** (yard and bed rest have none).

```sql
create type activity_type as enum ('walk','yard','bed_rest','jail_break','foster');

create table dog_activity (
  id           uuid primary key default gen_random_uuid(),
  dog_id       uuid not null references dogs(id),
  type         activity_type not null,
  person_id    uuid references people(id),        -- walker / carer; null for yard & bed_rest
  placed_by    uuid references people(id),        -- staff who logged it (esp. yard / bed rest)
  started_at   timestamptz not null,
  due_back     timestamptz,                        -- expected return (homecare, bed rest)
  ended_at     timestamptz,                        -- actual return; null = still out
  reason       text,                               -- bed rest reason, etc.
  notes        text,

  -- retrospective-entry discipline
  entered_late boolean not null default false,     -- logged after the fact
  edited_at    timestamptz,
  edited_by    uuid references people(id),

  created_at   timestamptz not null default now(),
  created_by   uuid references people(id),

  constraint chk_return_after_start check (ended_at is null or ended_at >= started_at),
  constraint chk_not_future         check (started_at <= now() + interval '5 min'
                                          and (ended_at is null or ended_at <= now() + interval '5 min')),
  constraint chk_person_required    check (
     (type in ('walk','jail_break','foster') and person_id is not null)
   or (type in ('yard','bed_rest'))
  )
);

-- at most one OPEN activity per dog
create unique index one_open_activity_per_dog
  on dog_activity (dog_id) where ended_at is null;
```

### Guardrails (from the retrospective-entry requirement)
- `chk_return_after_start` — can't come back before it left.
- `chk_not_future` — no future timestamps (5-min grace for clock skew).
- `one_open_activity_per_dog` — a dog can't be "out" twice.
- Backdating `started_at` more than **48 h** → API requires a `reason` and/or `staff` role (app-layer).
- Any row where `entered_late` or `edited_at` is set shows a **"logged late" / "edited"** badge in logs and reports.

### `due_back`
Set only for `jail_break`, `foster`, `bed_rest`. **Walks have no `due_back`** — the card shows a live "out for HH:MM" timer, and an alert fires if that exceeds `org_settings.walk_alert_after_minutes` (default 60). Yard has an alert too (`yard_alert_after_minutes`, default 120 — Weipa heat).

### Keeping `dogs` in sync (trigger)
`AFTER INSERT/UPDATE/DELETE ON dog_activity`:
- set `dogs.status` from the open row's `type` (or `available` if none; never touches `exited`);
- refresh `dogs.current_activity_id` and the four `latest_*_id` pointers (most recent row of each type by `started_at`).

This gives the **home-base Dogs list** its current-status line and the **detail card** its "most recent walk / yard / bed rest / homecare" without a query per card.

### Derived, for the Available card + reports (views, not stored)
- `days_since_last_walk` = `now() - max(ended_at where type='walk')`; `NULL`/999 → "No walks yet".
- `walk_minutes_28d` = `sum(ended_at - started_at where type='walk' and started_at > now() - 28d)`.

---

## 4. Medical events — staff-only detailed log
```sql
create table medical_events (
  id         uuid primary key default gen_random_uuid(),
  dog_id     uuid not null references dogs(id),
  event_date date not null,
  type       text not null,   -- Vet visit / Medication / Procedure / Observation / Vaccination
  detail     text not null,
  vet        text,
  created_by uuid references people(id),
  created_at timestamptz not null default now()
);
```
The current single `Medical Notes` field migrates in as the first `Observation` per dog. `public_medical_summary` on `dogs` is the sanitised public version.

---

## 5. Notes — running thread on a dog or a person
```sql
create table notes (
  id           uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('dog','person')),
  subject_id   uuid not null,
  body         text not null,
  visibility   text not null default 'staff' check (visibility in ('staff','all')),
  author_id    uuid references people(id),
  created_at   timestamptz not null default now()
);
create index on notes (subject_type, subject_id, created_at desc);
```

---

## 6. Site visits — who's on site now
```sql
create table site_visits (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid references people(id),   -- registered person; null for a guest
  guest_name   text,                          -- guest only
  guest_phone  text,
  reason       text not null,
  reason_other text,
  checked_in   timestamptz not null default now(),
  checked_out  timestamptz,
  constraint chk_visitor check (person_id is not null or guest_name is not null),
  constraint chk_visit_return check (checked_out is null or checked_out >= checked_in)
);
```
Guests stay light — inline name/phone, no `people` row unless they become regular.

---

## 7. Adoption — v1.1 (stub now so the plumbing fits)
```sql
-- create type adoption_stage as enum
--   ('applied','approved','matched','visits','trial','fees_paid','handover','completed','withdrawn','declined');
-- create table adoptions (
--   id uuid primary key default gen_random_uuid(),
--   adopter_id uuid references people(id),      -- role 'adopter'
--   dog_id     uuid references dogs(id),
--   stage adoption_stage not null default 'applied',
--   stage_history jsonb not null default '[]',  -- [{stage, at, by, note}]
--   fee_paid numeric, handover_on date,
--   created_at timestamptz not null default now()
-- );
```
Reuses `people` + role `adopter`. Adopter-facing "where's my application" view via magic link. Not built in v1.

---

## 8. Auth & RLS

- Supabase Auth (magic link + Google). On first sign-in, link `auth.users.id` → `people.auth_user_id` by matching email.
- Helper: `auth_person_roles()` returns the caller's active roles.
- **RLS enabled on all tables. Default deny.** Policy sketch:

| Table | anon | volunteer (walker/feeder/carer) | staff / committee |
|---|---|---|---|
| `dogs` (non-confidential cols) | select where `status <> 'exited'` (public listing later) | select all | all |
| `dog_confidential`, `medical_events` | — | — | all |
| `dog_activity` | — | select all; insert/update **own** rows + own retrospective; no delete | all |
| `people` | — | select self + basic directory (name, role badges); update self | all |
| `person_roles` | — | select self | all (approve/decline) |
| `homecare_profile` | — | select/update self | all |
| `site_visits` | insert (sign in) + update own open row (sign out) | same | all |
| `notes` | — | select where `visibility='all'` on visible subjects | all |

- **Registration intake:** the public form posts to an API route (service role) that creates `people` + `person_roles` (+ `homecare_profile`). `anon` never writes `people` directly.

---

## 9. Config / reference
- `dog_statuses` (§2).
- `org_settings` (single row): rescue group name, adoption-policy body text, donate URL, SavourLife defaults, alert recipient list, and thresholds:
  - `walk_alert_after_minutes` (default 60) — a walk still open past this fires an alert.
  - `yard_alert_after_minutes` (default 120) — a dog left in the yard past this fires an alert.
  - `needs_walk_after_days` (default 3) — drives the "dogs not walked recently" report.
- `enum` lookups: `volunteer_interest`, arrival/exit types, site-visit reasons, medical types — small reference tables so staff can extend without a migration.
- **Overdue-alert job** (scheduled): open `dog_activity` rows where — `type in (jail_break,foster,bed_rest)` and `due_back < now()`, OR `type='walk'` and `now()-started_at > walk_alert_after_minutes`, OR `type='yard'` and `now()-started_at > yard_alert_after_minutes` — with no alert already sent → one email to the recipient list; mark sent.

---

## 10. Migration map (current Sheets → here)

| Current | → | New |
|---|---|---|
| `Dogs` tab | → | `dogs` (+ `dog_confidential` from behaviour; `Medical Notes` → first `medical_events` row; `Level` **dropped** — `handling_notes` starts blank; `dog_media` empty) |
| `Volunteers` tab | → | `people` (+ `ec_*`, parent fields, DOB) + `person_roles(volunteer)` + `volunteer_profile` (`experience`, `medical_issues`, interests from the walking/feeding/etc. flags); `V0xx` → `legacy_volunteer_id` |
| `Homecarers` tab | → | `people` (**merge on email then name with volunteers**) + `person_roles(jailbreak_carer/foster_carer)` + `homecare_profile`; `HCR0xx` → `legacy_homecarer_id` |
| `Walks` tab | → | `dog_activity` type `walk` (map `Volunteer_ID` → person via `legacy_volunteer_id`) |
| `Homecare` tab | → | `dog_activity` type `jail_break` / `foster` (map `homecarer_id`/`Volunteer_ID` → person) |
| Bed Rest columns on `Dogs` | → | `dog_activity` type `bed_rest` (latest episode only; no history exists) |
| `Site_Visits` tab | → | `site_visits` |
| the `info@…` placeholder emails | → | dropped to `NULL` |
| "AA Yard" HCR000 hack | → | gone — `yard` is a real status |

**The volunteer/homecarer merge is the one careful step** — done on email first, then name, with a review list for anything ambiguous (we already did this reconciliation once for Homecarers, so the mapping is mostly known).

---

## 11. Resolved (§11 answers, Sep 2026)
1. **No `feeder` role.** One `volunteer` role; walk / feed / clean / transport etc. are `volunteer_profile.interests`.
2. **Walks have no `due_back`** — live timer + alert after 60 min (`org_settings`). Yard alert after 120 min.
3. **Full photo gallery** — Supabase Storage (actual files, ~1 GB free), compressed on upload.
4. **Committee = staff access for v1.** Both role values kept so they can diverge later (e.g. committee-only staff-punctuality review) without a migration.
5. **`Level` dropped** — replaced by `handling_notes` (free descriptive phrase, volunteer-visible) + `experienced_handler_only` flag.

### Still open
- `volunteer_profile` — is `medical_issues` still collected, or dropped like `Level`? (kept for now.)
- Does `bed_rest` need a `due_back`, or is it open-ended until a vet clears the dog? (assumed `due_back` optional.)
