-- Exiting a dog or a person (Paul, 2026-10-10 list item 1).
-- Dogs already have status 'exited', exit_date, exit_type and exit_notes; add who took the dog.
alter table dogs
  add column if not exists exit_person_id uuid references people(id) on delete set null;

-- People: when and why they were archived (archiving still ends every live role).
alter table people
  add column if not exists archived_on     date,
  add column if not exists archive_reason  text;
