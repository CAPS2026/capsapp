create table dogs (
  id              uuid primary key default gen_random_uuid(),
  ref             text unique not null,
  name            text not null,
  status          text not null references dog_statuses(code) default 'available',

  handling_notes  text,
  experienced_handler_only boolean not null default false,

  arrival_date    date,
  arrival_type    text references arrival_type(code),
  arrival_notes   text,
  exit_date       date,
  exit_type       text references exit_type(code),
  exit_notes      text,

  breed           text,
  date_of_birth   date,
  age_override    text,
  sex             char(1) check (sex in ('M','F')),
  size_when_adult text,
  colour          text,
  weight_kg       numeric,
  microchip_no    text,
  desexed boolean, vaccinated boolean, wormed boolean, heartworm_treated boolean,
  good_with_kids_u5   text check (good_with_kids_u5   in ('yes','no','untested')),
  good_with_kids_5_12 text check (good_with_kids_5_12 in ('yes','no','untested')),
  good_with_cats      text check (good_with_cats      in ('yes','no','untested')),
  good_with_dogs      text check (good_with_dogs      in ('yes','no','untested')),
  good_with_other     text check (good_with_other     in ('yes','no','untested')),
  energy_level        text,
  house_trained       text,
  public_description  text,
  public_medical_summary text,
  adoption_fee        numeric,
  interstate_adoption boolean,
  adoption_available_within text,
  adoption_policy     text check (adoption_policy in ('Standard','Strict')),
  bin_source_number   text,
  savourlife_id       int,
  listed_on_savourlife boolean not null default false,

  current_activity_id uuid,
  latest_walk_id      uuid,
  latest_yard_id      uuid,
  latest_bedrest_id   uuid,
  latest_homecare_id  uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dogs_status_idx on dogs (status);

create table dog_confidential (
  dog_id            uuid primary key references dogs(id) on delete cascade,
  behaviour_notes   text,
  adoption_history  text,
  medical_summary_internal text,
  restrictions      text,
  updated_at        timestamptz not null default now()
);

create table dog_media (
  id         uuid primary key default gen_random_uuid(),
  dog_id     uuid not null references dogs(id) on delete cascade,
  path       text not null,
  is_primary boolean not null default false,
  sort_order int not null default 0,
  caption    text,
  created_at timestamptz not null default now()
);
create unique index dog_media_one_primary on dog_media (dog_id) where is_primary;
create index dog_media_dog_idx on dog_media (dog_id, sort_order);
