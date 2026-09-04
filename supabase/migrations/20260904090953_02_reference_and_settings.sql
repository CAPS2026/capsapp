-- dog status reference (ordered, staff-editable labels)
create table dog_statuses (
  code       text primary key,
  label      text not null,
  sort_order int  not null,
  is_out     boolean not null
);
insert into dog_statuses (code, label, sort_order, is_out) values
  ('walking',    'Walking',    1, true),
  ('yard',       'Yard',       2, true),
  ('available',  'Available',  3, false),
  ('bed_rest',   'Bed Rest',   4, false),
  ('jail_break', 'Jail Break', 5, true),
  ('fostered',   'Fostered',   6, true),
  ('exited',     'Exited',     7, false);

create table volunteer_interest (
  code  text primary key,
  label text not null,
  sort_order int not null default 0
);
insert into volunteer_interest (code, label, sort_order) values
  ('dog_walking',      'Dog walking',            1),
  ('feeding_cleaning', 'Feeding & cleaning',     2),
  ('transport',        'Pet transport',          3),
  ('pet_minding',      'Pet minding',            4),
  ('cooking',          'Cooking / food prep',    5),
  ('social_media',     'Social media',           6),
  ('fundraising',      'Fundraising / events',   7),
  ('committee',        'Committee',              8),
  ('wherever_useful',  'Wherever most useful',   9);

create table arrival_type  (code text primary key, label text not null, sort_order int not null default 0);
insert into arrival_type (code,label,sort_order) values
  ('rescue','Rescue',1),('surrender','Surrender',2),('return','Return',3),('stray','Stray',4),('pound','Pound',5);

create table exit_type (code text primary key, label text not null, sort_order int not null default 0);
insert into exit_type (code,label,sort_order) values
  ('adopted','Adopted',1),('transferred','Transferred',2),('reclaimed','Reclaimed',3),('death','Death',4);

create table site_visit_reason (code text primary key, label text not null, sort_order int not null default 0);
insert into site_visit_reason (code,label,sort_order) values
  ('employment','Employment',1),('walking','Walking',2),('outside_contractor','Outside contractor',3),
  ('committee','Committee matters',4),('food_dropoff','Food dropoff',5),('feeding_cleaning','Feeding and cleaning',6),
  ('jailbreak_pickup','Jailbreak pickup / dropoff',7),('site_maintenance','Site maintenance',8),
  ('foster_pickup','Foster pickup / dropoff',9),('adoption_visit','Adoption related visit',10),
  ('transport_pickup','Transport pickup / dropoff',11),('other','Other',12);

create table medical_event_type (code text primary key, label text not null, sort_order int not null default 0);
insert into medical_event_type (code,label,sort_order) values
  ('vet_visit','Vet visit',1),('medication','Medication',2),('procedure','Procedure',3),
  ('vaccination','Vaccination',4),('observation','Observation',5);

-- single-row org settings
create table org_settings (
  id boolean primary key default true,
  rescue_group_name text not null default 'Cape Animal Protection Shelter Inc - CAPS',
  adoption_policy_text text,
  donate_url text,
  bin_source_prefix text,
  alert_recipients text[] not null default '{}',
  walk_alert_after_minutes int not null default 60,
  yard_alert_after_minutes int not null default 120,
  needs_walk_after_days int not null default 3,
  constraint org_settings_singleton check (id)
);
insert into org_settings (id) values (true);
