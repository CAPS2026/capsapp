-- Distinguish core tasks (feeding, cleaning, water, medications, lock-up)
-- that must happen every shift from genuinely conditional ones ("when
-- required", "if any", weekday-restricted). Only the conditional ones get
-- a "Not needed" option in the app from now on.

alter table task_template add column if not exists skippable boolean not null default true;
alter table task_instance add column if not exists skippable boolean not null default true;

update task_template
set skippable = false
where (title, part) in (
  ('Gates unlocked', 'morning'),
  ('Lights/fans on', 'morning'),
  ('Fire exits clear, extinguishers accessible', 'morning'),
  ('Morning feed completed, dry or bones', 'morning'),
  ('Medications given & signed off, when required', 'morning'),
  ('Fresh water in all buckets, scrub buckets where required', 'morning'),
  ('Prepare/defrost meat for dinner', 'morning'),
  ('Lift bedding to check pallets & frames are clean underneath', 'morning'),
  ('Kennels cleaned & disinfected (faeces/urine removed), poo scooped and/or hosed', 'morning'),
  ('Waste disposed of correctly', 'morning'),
  ('Dogs rotated as per yard rosters', 'morning'),
  ('Play yards secured & cleaned, toys picked up & replaced, faeces removed', 'morning'),
  ('Sign in table clean & tidy', 'morning'),
  ('Dinner served, meat & dry', 'afternoon'),
  ('Water refreshed', 'afternoon'),
  ('Medications given & signed off, when required', 'afternoon'),
  ('Kennels re-cleaned & disinfected (faeces/urine removed)', 'afternoon'),
  ('Dogs rotated as per yard rosters', 'afternoon'),
  ('All animals accounted for (log checked)', 'afternoon'),
  ('Fresh water & clean bedding provided', 'afternoon'),
  ('Kennels locked securely', 'afternoon'),
  ('Site gates locked', 'afternoon'),
  ('Checklist signed off, communications left for next employee or site manager', 'afternoon')
);
