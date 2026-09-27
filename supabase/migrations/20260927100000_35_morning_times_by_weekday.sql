-- 35: morning shift times depend on the day of the week (afternoons stay
-- 3pm to 6pm). Keys are the day of the week, Sunday = 0 (the same numbering
-- as JavaScript's getDay() and Postgres's extract(dow)).
--   Mon, Tue, Wed: 6am to 9am
--   Thu, Fri:      7am to 10am
--   Sat, Sun:      8am to 11am
-- New roster sessions take their morning times from this. Existing morning
-- sessions from 28 Sep 2026 on are updated to match.

alter table org_settings add column if not exists roster_morning_by_weekday jsonb;

update org_settings set roster_morning_by_weekday = '{
  "0": ["08:00", "11:00"],
  "1": ["06:00", "09:00"],
  "2": ["06:00", "09:00"],
  "3": ["06:00", "09:00"],
  "4": ["07:00", "10:00"],
  "5": ["07:00", "10:00"],
  "6": ["08:00", "11:00"]
}'::jsonb
where id;

update roster_session r
set starts = (s.roster_morning_by_weekday -> extract(dow from r.date)::int::text ->> 0)::time,
    ends   = (s.roster_morning_by_weekday -> extract(dow from r.date)::int::text ->> 1)::time
from org_settings s
where s.id and r.part = 'morning' and r.date >= '2026-09-28';

-- Bins go out on Tuesday and Sunday afternoons only (was Sunday and
-- Wednesday). getDay numbering: Sunday = 0, Tuesday = 2.
update task_template set weekdays = '{0,2}' where title = 'Take bins out' and part = 'afternoon';
