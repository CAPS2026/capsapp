-- "Course finished?" on the checklist's Medications section: a caretaker tells
-- Shayna a course looks finished (the app records who and when, adds a handover
-- note and emails her). Only an admin stops it, from the Medications page or
-- from the "Stop this medication" link in that email; the token is the secret
-- in that link, the same way health_concern.token and leave_request.token are.
alter table medication
  add column if not exists finish_flagged_at timestamptz,
  add column if not exists finish_flagged_by text,
  add column if not exists finish_note text,
  add column if not exists token uuid not null default gen_random_uuid();

create unique index if not exists medication_token_key on medication (token);
