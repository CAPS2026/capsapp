-- Who may approve / decline homecare and minor-consent applications
-- (Paul, 2026-10-04): only Paul, Julie and Shayna. Until this is applied (or
-- while the list is empty) the app falls back to "any admin".
alter table org_settings
  add column if not exists approver_person_ids uuid[] not null default '{}';

update org_settings
set approver_person_ids = coalesce(
  (select array_agg(p.id)
     from people p
    where (lower(p.first_name), lower(p.surname)) in
          (('paul', 'green'), ('julie', 'green'), ('shayna', 'reeves'))),
  '{}');
