-- 37: medications, vet appointments, the volunteer count, tickable handover
-- notes, and a start date for checklist tasks. Additive only.

-- A task template can start on a given day (a new checklist switches over
-- cleanly from a date instead of appearing half way through one).
alter table task_template add column if not exists active_from date;

-- Checklist tasks made from a vet appointment ("Zeke: NO BREAKFAST",
-- "Take Zeke to the vet"). Removed with the appointment.
alter table task_instance add column if not exists vet_appointment_id uuid;
alter table task_instance add column if not exists vet_task_kind text;

-- Handover notes are ticked off like checklist tasks. Name stored as text,
-- so the existing lookups of who wrote the note stay unambiguous.
alter table handover_note add column if not exists done_at timestamptz;
alter table handover_note add column if not exists done_by_name text;
-- Written by the app itself (a medication not given), not typed by a person.
alter table handover_note add column if not exists is_auto boolean not null default false;
-- Notes from before ticking existed count as dealt with.
update handover_note set done_at = now(), done_by_name = 'Before ticking started' where done_at is null;

-- How many volunteers came, one number per shift (for funding records).
alter table roster_session add column if not exists volunteer_count int check (volunteer_count >= 0);

-- ---------------------------------------------------------------------------
-- Vet appointments (entered by admins, week by week)
-- ---------------------------------------------------------------------------
create table if not exists vet_appointment (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  dog_name text not null,
  -- "08:00" when a time is known; null when it is just morning or afternoon.
  time time,
  part text not null check (part in ('morning', 'afternoon')),
  kind text not null check (kind in ('admit', 'discharge', 'consult', 'other')),
  reason text,
  instructions text,
  created_by uuid references people(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists vet_appointment_date_idx on vet_appointment(date);

alter table task_instance drop constraint if exists task_instance_vet_appointment_fk;
alter table task_instance add constraint task_instance_vet_appointment_fk
  foreign key (vet_appointment_id) references vet_appointment(id) on delete cascade;
create unique index if not exists task_instance_vet_task
  on task_instance(vet_appointment_id, vet_task_kind) where vet_appointment_id is not null;

-- ---------------------------------------------------------------------------
-- Medications (entered by admins) and each dose given or not given
-- ---------------------------------------------------------------------------
create table if not exists medication (
  id uuid primary key default gen_random_uuid(),
  dog_name text not null,
  medicine text not null,          -- medication and dose, e.g. "Apoquel 16mg, 1 tablet"
  how_given text,                  -- e.g. "with food", "crushed in meat"
  parts text not null check (parts in ('morning', 'afternoon', 'both')),
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  weekdays int[] not null default '{}',   -- getDay numbering, Sunday = 0
  day_of_month int check (day_of_month between 1 and 31),
  start_date date not null,
  end_date date,                   -- null = ongoing
  notes text,
  stopped_at timestamptz,
  created_by uuid references people(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists medication_dose (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references medication(id) on delete cascade,
  date date not null,
  part text not null check (part in ('morning', 'afternoon')),
  status text not null check (status in ('given', 'not_given')),
  reason text check (reason in ('refused', 'vomited', 'away', 'other')),
  note text,
  actioned_by uuid references people(id) on delete set null,
  actioned_at timestamptz not null default now(),
  emailed_at timestamptz,
  unique (medication_id, date, part)
);

alter table vet_appointment enable row level security;
alter table medication enable row level security;
alter table medication_dose enable row level security;

drop policy if exists vet_appointment_select on vet_appointment;
drop policy if exists vet_appointment_write on vet_appointment;
create policy vet_appointment_select on vet_appointment for select to authenticated using (is_staff());
create policy vet_appointment_write on vet_appointment for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists medication_select on medication;
drop policy if exists medication_write on medication;
create policy medication_select on medication for select to authenticated using (is_staff());
create policy medication_write on medication for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists medication_dose_select on medication_dose;
drop policy if exists medication_dose_insert on medication_dose;
drop policy if exists medication_dose_update on medication_dose;
drop policy if exists medication_dose_delete on medication_dose;
create policy medication_dose_select on medication_dose for select to authenticated using (is_staff());
create policy medication_dose_insert on medication_dose for insert to authenticated with check (is_staff());
create policy medication_dose_update on medication_dose for update to authenticated using (is_staff()) with check (is_staff());
-- A dose ticked "given" by mistake can be unticked on the shift.
create policy medication_dose_delete on medication_dose for delete to authenticated using (is_staff());

-- ---------------------------------------------------------------------------
-- Guards: let staff record the volunteer count and tick handover notes.
-- ---------------------------------------------------------------------------
create or replace function roster_session_guard() returns trigger
  language plpgsql set search_path = public as $$
begin
  if staff_is_restricted()
     and changed_except(to_jsonb(old), to_jsonb(new), array['email_sent_at', 'no_show_alert_sent_at', 'volunteer_count']) then
    raise exception 'Only an admin can change a roster session.';
  end if;
  return new;
end $$;

create or replace function handover_note_guard() returns trigger
  language plpgsql set search_path = public as $$
begin
  if staff_is_restricted() and changed_except(to_jsonb(old), to_jsonb(new), array['done_at', 'done_by_name']) then
    raise exception 'Only an admin can change a handover note.';
  end if;
  return new;
end $$;
