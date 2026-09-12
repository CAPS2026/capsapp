-- Staff app — shift sign-in/out log (docs/ui-flows.md, Staff zone).
-- `roster_session`/`roster_assignment` (migration 20) are the PLAN — who is
-- supposed to be on. `shift_log` is the RECORD — who actually signed in,
-- when, from where, and when they signed out. A row here is not required
-- to have a matching roster assignment (someone can cover an unrostered
-- shift); it's just flagged as such.
--
-- Recipient emails (Renee, Shayna) are deliberately NOT in this migration
-- or anywhere in the repo — this is a public GitHub repo. They belong in
-- `org_settings.staff_shift_email_recipients` (a data row in Supabase, set
-- from an admin settings screen), same pattern as the existing
-- `alert_recipients` column. Actual sending is paused for now — this
-- migration only adds the columns/tables that will support it later.

alter table org_settings
  add column if not exists staff_shift_email_recipients text[] not null default '{}',
  -- Shelter coordinates for the on-site check at sign-in. Left null on
  -- purpose: nobody should guess these into a migration. An admin fills
  -- them in from the settings screen (or they're set once by hand via the
  -- dashboard). While null, the distance check is skipped entirely rather
  -- than false-flagging everyone as off-site.
  add column if not exists shelter_lat numeric,
  add column if not exists shelter_lng numeric,
  add column if not exists shift_geofence_radius_m int not null default 150,
  add column if not exists staff_late_after_minutes int not null default 10,
  -- How long a shift can sit with no ticks past its scheduled end before
  -- the app closes it automatically (see shift_log.auto_closed below).
  -- Someone genuinely still working — overtime, a late start running
  -- late — keeps ticking things off, which keeps resetting this clock, so
  -- it only ever catches a shift that was actually abandoned.
  add column if not exists staff_autoclose_grace_minutes int not null default 60;

create table if not exists shift_log (
  id                 uuid primary key default gen_random_uuid(),
  person_id          uuid not null references people(id) on delete cascade,
  roster_session_id  uuid references roster_session(id) on delete set null,
  date               date not null,          -- shelter-local day (see src/lib/staff.ts shelterToday)
  part               text not null check (part in ('morning', 'afternoon')),

  signed_in_at       timestamptz not null default now(),
  signed_in_lat      numeric,
  signed_in_lng      numeric,
  signed_in_distance_m numeric,              -- distance from org_settings.shelter_lat/lng at sign-in; null if location wasn't available or the shelter coordinates aren't set yet
  late_minutes       int,                    -- null = not late (or roster_session_id is null, nothing to be late against)
  late_reason        text,

  signed_out_at      timestamptz,
  signed_out_lat     numeric,
  signed_out_lng     numeric,
  auto_closed        boolean not null default false,  -- true = the app closed this, not the person

  created_at         timestamptz not null default now()
);
create index if not exists shift_log_date_idx on shift_log(date);
create index if not exists shift_log_person_idx on shift_log(person_id);
-- One open (not yet signed out) shift per person at a time.
create unique index if not exists shift_log_one_open_per_person
  on shift_log(person_id) where signed_out_at is null;

alter table shift_log enable row level security;

drop policy if exists sl_staff on shift_log;
create policy sl_staff on shift_log for all to authenticated
  using (is_staff()) with check (is_staff());
