-- Required tasks and carry-over (Julie, 16 Oct 2026).
--
-- Every checklist task must be done each shift EXCEPT three optional ones
-- (Walkways and kennels blown, Reline bin, Toys/enrichment). A required task
-- left undone needs a reason at END SHIFT, goes in the shift email, and, unless
-- it only matters at its own time of day (lights, gates, sprinklers, dogs in
-- and out, animals accounted for, bins, handover notes), carries over to the
-- next shift so the next person knows. Both flags live on the template and are
-- copied to each day's task, the same way `skippable` is.
alter table task_template
  add column if not exists required boolean not null default true,
  add column if not exists carry_over boolean not null default true;

alter table task_instance
  add column if not exists required boolean not null default true,
  add column if not exists carry_over boolean not null default true,
  -- The shift that gave the reason for a task left undone, so a reason written
  -- by the last shift is not taken as an answer from the next one.
  add column if not exists reason_shift_id uuid references shift_log(id) on delete set null;

-- Optional tasks: not required, never carried.
update task_template set required = false, carry_over = false
 where title in ('Walkways and kennels blown', 'Reline bin') or title like 'Toys/enrichment rotated%';

-- Time-of-day tasks: still required, but not carried to the next shift.
update task_template set carry_over = false
 where title in (
   'Lights on, fans on',
   'Unlock kennel gates',
   'Bring in the dogs from the exercise yards',
   'Dogs out in exercise yards as per rotation',
   'Put the next dogs out in the exercise yards as per rotation',
   'Lock kennel gates',
   'Lights off',
   'Outside light on',
   'Site gates locked',
   'Start sprinklers',
   'Bring in dogs from exercise yard',
   'All animals accounted for',
   'Handover notes left',
   'Bring bins in',
   'Take bins out'
 );

-- Copy to the tasks already made.
update task_instance i
   set required = t.required, carry_over = t.carry_over
  from task_template t
 where i.template_id = t.id;

-- "Keep an eye on <dog>" tasks have their own rules (one per concern, for the
-- next shift only); extras are things already done.
update task_instance set required = false, carry_over = false where health_concern_id is not null;
update task_instance set required = false where is_extra;

-- Before this, "Do this first!" and End of Shift tasks were never carried over.
-- Keep it that way for everything before 16 Oct, so old leftovers do not flood
-- the first checklist after this goes live. 16 Oct onwards follows the template.
update task_instance set carry_over = false
 where category in ('do_first', 'end_of_day') and date < '2026-10-16';
update task_instance i set carry_over = t.carry_over
  from task_template t
 where i.template_id = t.id and i.date >= '2026-10-16' and i.health_concern_id is null;

-- Slow cooker routine, in Shayna's words (daily). The existing tasks are
-- reworded so history stays attached; the new ones start tomorrow.
update task_template set title = 'Turn cookers off and allow to cool (put cookers in fridge if required)'
 where part = 'morning' and title = 'Turn off slow cookers';

update task_template
   set title = 'Shred meat once cool and prepare for following night''s dinner. This needs to be done a day ahead: you shouldn''t be cooking food to serve tonight, you are cooking food for the next shift so it is ready to serve at shift start.',
       sort_order = 8
 where part = 'morning' and title = 'Assess meat/dinners';

update task_template set title = 'Ensure rice is taken out or cooked to mix', sort_order = 9
 where part = 'morning' and title = 'Prep dinner';

update task_template set title = 'Put cookers on overnight'
 where part = 'afternoon' and title = 'Turn on slow cookers';

update task_template set sort_order = 13 where part = 'morning' and title like 'Check Nova dinner%';
update task_template set sort_order = 14 where part = 'morning' and title like 'Check the medication folders%';

insert into task_template (title, part, category, repeat, weekdays, sort_order, skippable, active_from) values
 ('Waste from cookers to be correctly disposed: place bin liner in a bucket, empty cooled liquids and fat, put bag in waste', 'morning', 'animal_health_welfare', 'daily', '{}', 10, false, '2026-10-17'),
 ('Clean cookers', 'morning', 'animal_health_welfare', 'daily', '{}', 11, false, '2026-10-17'),
 ('Take meat out in the morning to thaw, so it can be put on for the afternoon shift (thawed meat allows more to fit in the cooker)', 'morning', 'animal_health_welfare', 'daily', '{}', 12, false, '2026-10-17');
