-- Staff app round 3: health concerns, finishing early, extending a shift.

-- Why someone ended a shift before the rostered end, and any overtime
-- they logged (minutes past the rostered end, with a reason).
alter table shift_log add column if not exists ended_early_reason text;
alter table shift_log add column if not exists extended_minutes integer;
alter table shift_log add column if not exists extended_reason text;

-- A dog health concern raised by a caretaker. Emailed to the recipients
-- below the moment it is saved, and summarised in the end-of-shift email.
create table if not exists health_concern (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid not null references people(id) on delete cascade,
  shift_log_id  uuid references shift_log(id) on delete set null,
  date          date not null,
  part          text not null check (part in ('morning', 'afternoon')),
  dog_name      text,
  urgent        boolean not null default false,
  body          text not null,
  emailed_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists health_concern_session_idx on health_concern(date, part);

alter table health_concern enable row level security;

drop policy if exists hc_staff on health_concern;
create policy hc_staff on health_concern for all to authenticated
  using (is_staff()) with check (is_staff());

-- Who gets the immediate health concern email. Empty until switched on.
alter table org_settings add column if not exists health_concern_email_recipients text[] not null default '{}';
