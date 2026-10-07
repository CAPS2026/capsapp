-- Dog intake (Paul, 2026-10-07): the paper "Animal Intake Record" as a staff-only
-- screen, plus the extra fields SavourLife asks for. Dogs only for now.
-- Apply in the CAPS Supabase SQL editor (Julie's last migration is 44).

-- 1. Where the dog came from: the paper form's four sources.
insert into arrival_type (code, label, sort_order) values
  ('transfer', 'Transfer', 6),
  ('other',    'Other',    7)
on conflict (code) do nothing;

-- 2. SavourLife fields that were missing on dogs. Marked SL on the intake screen.
--    (Already on dogs: breed, date_of_birth, sex, size_when_adult, microchip_no, desexed,
--    vaccinated, wormed, heartworm_treated, good_with_*, adoption_fee, interstate_adoption,
--    adoption_available_within, public_description, public_medical_summary.)
alter table dogs
  add column if not exists coat_length          text check (coat_length in ('Short','Medium','Long')),
  add column if not exists indoor_only          boolean,
  add column if not exists foster_care_required boolean,
  add column if not exists special_needs        text,
  add column if not exists bonded_pair          boolean,
  add column if not exists bonded_pair_name     text,
  add column if not exists sl_suburb            text,
  add column if not exists sl_state             text,
  add column if not exists sl_postcode          text,
  add column if not exists markings             text;

-- Foster / case manager email for SavourLife enquiries: never public, so it lives
-- in the staff-only confidential table, not on dogs (every signed-in user can read dogs).
alter table dog_confidential add column if not exists sl_contact_email text;

-- 3. The intake record itself: one row per dog, staff only (same boundary as
--    dog_confidential — volunteers can't read it at all).
create table if not exists dog_intake (
  dog_id              uuid primary key references dogs(id) on delete cascade,
  intake_date         date not null default current_date,
  surrendered_by      text,
  reason              text,
  condition           text check (condition in ('good','fair','poor')),
  visible_injuries    text,
  parasites_observed  boolean,
  vaccination_given   boolean,
  vaccination_type    text,
  flea_tick_worm_given boolean,
  behaviour_assessment text[] not null default '{}',   -- friendly / timid / aggressive / other
  behaviour_other     text,
  notes               text,
  intake_officer_id   uuid references people(id) on delete set null,
  intake_officer_name text,
  signed_name         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table dog_intake enable row level security;
create policy dog_intake_staff on dog_intake for all to authenticated
  using (is_staff()) with check (is_staff());
