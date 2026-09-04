create table people (
  id              uuid primary key default gen_random_uuid(),
  first_name      text not null,
  surname         text not null,
  nickname        text,
  email           citext unique,
  phone           text,
  date_of_birth   date,
  address         text,
  ec_name         text,
  ec_phone        text,
  ec_email        text,
  ec_relationship text,
  parent_name           text,
  parent_phone          text,
  parent_email          text,
  parental_consent      boolean not null default false,
  parental_consent_date date,
  legacy_volunteer_id  text,
  legacy_homecarer_id  text,
  auth_user_id    uuid unique references auth.users(id) on delete set null,
  notes_internal  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index people_surname_idx on people (lower(surname), lower(first_name));

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
create index person_roles_role_status_idx on person_roles (role, status);

create table homecare_profile (
  person_id          uuid primary key references people(id) on delete cascade,
  over_18            boolean,
  property_ownership text,
  fence_type         text,
  fence_height       text,
  people_at_home     int,
  children_u16       int,
  other_animals      text,
  animal_details     text,
  vaccines_current   boolean,
  experience         text,
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

create table volunteer_profile (
  person_id      uuid primary key references people(id) on delete cascade,
  interests      text[] not null default '{}',
  experience     text,
  medical_issues text,
  how_heard      text,
  agree_terms    boolean,
  signature_name text,
  signature_date date,
  updated_at     timestamptz not null default now()
);
