-- Home check (formerly "yard check" — column names kept) now records an
-- outcome, so "improvements needed" is distinct from "passed". Null = the
-- visit hasn't happened yet.
--   'passed'              -> yard_check_done = true, foster can be approved
--   'improvements_needed' -> yard_check_done = false, applicant emailed
alter table homecare_profile add column if not exists yard_check_outcome text;
