-- Replace the 9 placeholder task_template rows (rough approximations from
-- early development) with the real Daily Checklist content, taken directly
-- from Julie's "Caps Daily Checklist.docx", properly tagged with category,
-- part (morning/afternoon) and, for the two bin tasks, the specific
-- weekdays they're needed rather than every day.

-- Step 1: retire the placeholders. Deactivating rather than deleting keeps
-- any existing task_instance history intact; they just stop generating new
-- instances from tomorrow.
update task_template
set active = false
where (title, part) in (
  ('Evening feed', 'afternoon'),
  ('Lock up and check gates', 'afternoon'),
  ('Take bins out', 'afternoon'),
  ('Wash dog bedding', 'afternoon'),
  ('Feed all dogs', 'morning'),
  ('Clean and hose kennels', 'morning'),
  ('Fresh water in every pen', 'morning'),
  ('Check medication board', 'morning'),
  ('Worm & flea treatment review', 'morning')
);

-- Step 2: insert the real checklist, matching the printed document exactly.
-- weekdays use JS-style numbering (0 = Sunday .. 6 = Saturday) to match
-- templateMatchesDate() in src/lib/shift-data.ts.

insert into task_template (title, part, category, repeat, weekdays, day_of_month, sort_order, active)
values
  -- Opening (morning)
  ('Gates unlocked', 'morning', 'opening', 'daily', '{}', null, 1, true),
  ('Lights/fans on', 'morning', 'opening', 'daily', '{}', null, 2, true),
  ('Fire exits clear, extinguishers accessible', 'morning', 'opening', 'daily', '{}', null, 3, true),
  ('Bring bins in', 'morning', 'opening', 'weekly', '{1,4}', null, 4, true),
  ('Check cookers, turn off, prep food, clean & restart', 'morning', 'opening', 'daily', '{}', null, 5, true),
  ('Check diary', 'morning', 'opening', 'daily', '{}', null, 6, true),

  -- Animal Health & Welfare (morning)
  ('Morning feed completed, dry or bones', 'morning', 'animal_health_welfare', 'daily', '{}', null, 1, true),
  ('Medications given & signed off, when required', 'morning', 'animal_health_welfare', 'daily', '{}', null, 2, true),
  ('Fresh water in all buckets, scrub buckets where required', 'morning', 'animal_health_welfare', 'daily', '{}', null, 3, true),
  ('Prepare/defrost meat for dinner', 'morning', 'animal_health_welfare', 'daily', '{}', null, 4, true),
  ('Bedding checked/replaced, throw out soiled/chewed items', 'morning', 'animal_health_welfare', 'daily', '{}', null, 5, true),
  ('Any health concerns reported to committee chat or call Shayna', 'morning', 'animal_health_welfare', 'daily', '{}', null, 6, true),

  -- Kennel & Housing Hygiene (morning)
  ('Kennels cleaned & disinfected (faeces/urine removed), poo scooped and/or hosed', 'morning', 'kennel_housing_hygiene', 'daily', '{}', null, 1, true),
  ('Lift bedding to check pallets & frames are clean underneath', 'morning', 'kennel_housing_hygiene', 'daily', '{}', null, 2, true),
  ('Lift astro turf, disinfect, rotate & hang out to air/dry', 'morning', 'kennel_housing_hygiene', 'daily', '{}', null, 3, true),
  ('Walkways blown or hosed off, pick up any loose rubbish', 'morning', 'kennel_housing_hygiene', 'daily', '{}', null, 4, true),
  ('Bedding washed/replaced for non-chewers', 'morning', 'kennel_housing_hygiene', 'daily', '{}', null, 5, true),
  ('Waste disposed of correctly', 'morning', 'kennel_housing_hygiene', 'daily', '{}', null, 6, true),

  -- Exercise & Enrichment (morning)
  ('Dogs rotated as per yard rosters', 'morning', 'exercise_enrichment', 'daily', '{}', null, 1, true),
  ('Dogs walked when volunteers, jumpers first priority', 'morning', 'exercise_enrichment', 'daily', '{}', null, 2, true),
  ('Toys/enrichment rotated, Kongs cleaned & refilled', 'morning', 'exercise_enrichment', 'daily', '{}', null, 3, true),
  ('Play yards secured & cleaned, toys picked up & replaced, faeces removed', 'morning', 'exercise_enrichment', 'daily', '{}', null, 4, true),

  -- Public & Committee Areas (morning)
  ('Sign in table clean & tidy', 'morning', 'public_committee_areas', 'daily', '{}', null, 1, true),
  ('Check if any additional forms are required', 'morning', 'public_committee_areas', 'daily', '{}', null, 2, true),
  ('PPE available (gloves, mask, ear plugs, sanitiser), let Shayna know if more items required', 'morning', 'public_committee_areas', 'daily', '{}', null, 3, true),
  ('Information boards updated, when required', 'morning', 'public_committee_areas', 'daily', '{}', null, 4, true),
  ('Ensure tools, working materials, mowers put away at end of shift', 'morning', 'public_committee_areas', 'daily', '{}', null, 5, true),

  -- Afternoon
  ('Dinner served, meat & dry', 'afternoon', 'animal_health_welfare', 'daily', '{}', null, 1, true),
  ('Water refreshed', 'afternoon', 'animal_health_welfare', 'daily', '{}', null, 2, true),
  ('Medications given & signed off, when required', 'afternoon', 'animal_health_welfare', 'daily', '{}', null, 3, true),
  ('Kennels re-cleaned & disinfected (faeces/urine removed)', 'afternoon', 'kennel_housing_hygiene', 'daily', '{}', null, 1, true),
  ('Dogs rotated as per yard rosters', 'afternoon', 'exercise_enrichment', 'daily', '{}', null, 1, true),

  -- End of Day (afternoon)
  ('All animals accounted for (log checked)', 'afternoon', 'end_of_day', 'daily', '{}', null, 1, true),
  ('Fresh water & clean bedding provided', 'afternoon', 'end_of_day', 'daily', '{}', null, 2, true),
  ('Kennels locked securely', 'afternoon', 'end_of_day', 'daily', '{}', null, 3, true),
  ('Take bins out', 'afternoon', 'end_of_day', 'weekly', '{0,3}', null, 4, true),
  ('Site gates locked', 'afternoon', 'end_of_day', 'daily', '{}', null, 5, true),
  ('Checklist signed off, communications left for next employee or site manager', 'afternoon', 'end_of_day', 'daily', '{}', null, 6, true),
  ('Any site communications left via diary, whiteboard, employee chat', 'afternoon', 'end_of_day', 'daily', '{}', null, 7, true);
