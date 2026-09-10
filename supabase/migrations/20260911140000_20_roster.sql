-- Staff zone — the daily roster (docs/ui-flows.md, Staff zone).
-- Two sessions a day (morning / afternoon), rostered per calendar date.
-- Each day's session times default from org_settings but admin can
-- override any specific day. Up to ~3 people per session (not hard-capped).

alter table org_settings
  add column if not exists roster_morning_start time not null default '06:00',
  add column if not exists roster_morning_end   time not null default '09:00',
  add column if not exists roster_afternoon_start time not null default '16:00',
  add column if not exists roster_afternoon_end   time not null default '19:00';

create table if not exists roster_session (
  id      uuid primary key default gen_random_uuid(),
  date    date not null,
  part    text not null check (part in ('morning', 'afternoon')),
  starts  time not null,
  ends    time not null,
  created_at timestamptz not null default now(),
  unique (date, part)
);

create table if not exists roster_assignment (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references roster_session(id) on delete cascade,
  person_id  uuid not null references people(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (session_id, person_id)
);
create index if not exists roster_assignment_session_idx on roster_assignment(session_id);
create index if not exists roster_session_date_idx on roster_session(date);

alter table roster_session   enable row level security;
alter table roster_assignment enable row level security;

-- Staff can read + write the roster; the server actions restrict the
-- editing (times, assignments) to admin, sign-off style reads to any staff.
drop policy if exists rs_staff on roster_session;
create policy rs_staff on roster_session for all to authenticated
  using (is_staff()) with check (is_staff());

drop policy if exists ra_staff on roster_assignment;
create policy ra_staff on roster_assignment for all to authenticated
  using (is_staff()) with check (is_staff());
