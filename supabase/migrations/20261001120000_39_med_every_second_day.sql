-- Medications can be given every second day, counted from the start date
-- (e.g. the last weeks of a heartworm course). Staff app only.
alter table medication drop constraint if exists medication_frequency_check;
alter table medication add constraint medication_frequency_check
  check (frequency in ('daily', 'every_second_day', 'weekly', 'monthly'));
