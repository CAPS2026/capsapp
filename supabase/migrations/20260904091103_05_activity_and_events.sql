create table dog_activity (
  id           uuid primary key default gen_random_uuid(),
  dog_id       uuid not null references dogs(id),
  type         activity_type not null,
  person_id    uuid references people(id),
  placed_by    uuid references people(id),
  started_at   timestamptz not null,
  due_back     timestamptz,
  ended_at     timestamptz,
  reason       text,
  notes        text,
  entered_late boolean not null default false,
  edited_at    timestamptz,
  edited_by    uuid references people(id),
  created_at   timestamptz not null default now(),
  created_by   uuid references people(id),
  constraint chk_return_after_start check (ended_at is null or ended_at >= started_at),
  constraint chk_person_required check (
     (type in ('walk','jail_break','foster') and person_id is not null)
     or (type in ('yard','bed_rest'))
  )
);
create unique index one_open_activity_per_dog on dog_activity (dog_id) where ended_at is null;
create index dog_activity_dog_type_idx on dog_activity (dog_id, type, started_at desc);
create index dog_activity_open_idx on dog_activity (type) where ended_at is null;
create index dog_activity_person_idx on dog_activity (person_id, started_at desc);

alter table dogs
  add constraint dogs_current_activity_fk foreign key (current_activity_id) references dog_activity(id) on delete set null,
  add constraint dogs_latest_walk_fk     foreign key (latest_walk_id)     references dog_activity(id) on delete set null,
  add constraint dogs_latest_yard_fk     foreign key (latest_yard_id)     references dog_activity(id) on delete set null,
  add constraint dogs_latest_bedrest_fk  foreign key (latest_bedrest_id)  references dog_activity(id) on delete set null,
  add constraint dogs_latest_homecare_fk foreign key (latest_homecare_id) references dog_activity(id) on delete set null;

create table medical_events (
  id         uuid primary key default gen_random_uuid(),
  dog_id     uuid not null references dogs(id) on delete cascade,
  event_date date not null,
  type       text not null references medical_event_type(code),
  detail     text not null,
  vet        text,
  created_by uuid references people(id),
  created_at timestamptz not null default now()
);
create index medical_events_dog_idx on medical_events (dog_id, event_date desc);

create table notes (
  id           uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('dog','person')),
  subject_id   uuid not null,
  body         text not null,
  visibility   text not null default 'staff' check (visibility in ('staff','all')),
  author_id    uuid references people(id),
  created_at   timestamptz not null default now()
);
create index notes_subject_idx on notes (subject_type, subject_id, created_at desc);

create table site_visits (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid references people(id),
  guest_name   text,
  guest_phone  text,
  reason       text not null references site_visit_reason(code),
  reason_other text,
  checked_in   timestamptz not null default now(),
  checked_out  timestamptz,
  constraint chk_visitor check (person_id is not null or guest_name is not null),
  constraint chk_visit_return check (checked_out is null or checked_out >= checked_in)
);
create index site_visits_open_idx on site_visits (checked_in desc) where checked_out is null;
