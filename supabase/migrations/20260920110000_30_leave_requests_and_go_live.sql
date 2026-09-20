-- Staff app round 6: leave requests, and a go-live date.

-- A caretaker's request for leave. Emailed to the leave recipients below;
-- Shayna or Renee approve or decline it in the app or from the email link
-- (the token is the secret in that link).
create table if not exists leave_request (
  id             uuid primary key default gen_random_uuid(),
  person_id      uuid not null references people(id) on delete cascade,
  leave_type     text not null check (leave_type in ('annual', 'personal', 'unpaid')),
  start_date     date not null,
  end_date       date not null,
  scope          text not null default 'all' check (scope in ('all', 'morning', 'afternoon')),
  note           text,
  status         text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'cancelled')),
  token          uuid not null default gen_random_uuid() unique,
  decided_by     uuid references people(id) on delete set null,
  decided_at     timestamptz,
  decided_via    text check (decided_via in ('app', 'email')),
  decision_note  text,
  emailed_at     timestamptz,
  created_at     timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists leave_request_status_idx on leave_request(status, start_date);
create index if not exists leave_request_person_idx on leave_request(person_id, created_at desc);

alter table leave_request enable row level security;

drop policy if exists lr_staff on leave_request;
create policy lr_staff on leave_request for all to authenticated
  using (is_staff()) with check (is_staff());

-- Who is emailed when a leave request comes in. Empty until switched on.
alter table org_settings add column if not exists leave_request_email_recipients text[] not null default '{}';

-- The first day the staff app is really in use. Tasks from before this date
-- are never carried over, so the first morning shift starts with a clean list.
alter table org_settings add column if not exists staff_go_live_date date;
