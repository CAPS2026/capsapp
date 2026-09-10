-- ============================================================================
-- CAPS App — realistic test dataset
-- ============================================================================
-- Idempotent (fixed UUIDs + ON CONFLICT DO NOTHING) — safe to re-run.
-- Applied via the Supabase MCP / dashboard SQL editor, not the migration
-- system (this is data, not schema).
--
-- Gives roughly a real shelter's worth of data to exercise the UI at volume:
--   ~16 test dogs (celebrity/fictional names, per Paul's standing rule) across
--   every status incl. overdue timers and 2 exited; ~24 people — 12 walkers
--   (2 minors, 1 gated; 2 Volunteer Plus; 1 feed-only; some no email / no
--   emergency contact) and 12 homecare carers (mix of active/pending, some
--   also walkers, home checks passed / improvements-needed / not done);
--   ~120 historical walks so Logs / Reports / "last walk" / 4-week minutes
--   all have texture; a few medical events, confidential notes, site visits.
--
-- Everything here is obviously fake: @example.com emails, fictional dog names.
-- Delete before real data migration (Phase 5):
--   delete from dog_activity where created_at < '2027-01-01'  -- etc, or just
--   the seeded ids below. See the DELETE block at the foot of this file.
-- ============================================================================

-- Existing real row we must not touch: Paul Green (staff)
--   df7265f5-d731-4880-b0e8-e843c54af1b6

-- ---------------------------------------------------------------------------
-- PEOPLE
-- ---------------------------------------------------------------------------
insert into people (id, first_name, surname, nickname, email, phone, date_of_birth, address,
                    ec_name, ec_phone, ec_relationship, parent_name, parent_phone, parent_email,
                    parental_consent, parental_consent_date, image_consent, notes_internal) values
-- walkers -------------------------------------------------------------------
('11111111-1111-4111-8111-000000000001','Ruby','Fielding',null,'ruby.fielding@example.com','0400 111 001','1991-03-14','12 Kerr St, Weipa QLD 4874','Mark Fielding','0400 111 901','Partner',null,null,null,true,null,true,null),
('11111111-1111-4111-8111-000000000002','Tom','Beckett',null,null,'0400 111 002','1978-11-02','5 Boundary Rd, Weipa QLD 4874','Sue Beckett','0400 111 902','Wife',null,null,null,true,null,false,'Prefers weekend mornings.'),
('11111111-1111-4111-8111-000000000003','Priya','Nair',null,'priya.nair@example.com','0400 111 003','1985-07-21','88 Central Ave, Weipa QLD 4874','Anand Nair','0400 111 903','Brother',null,null,null,true,null,true,null),
('11111111-1111-4111-8111-000000000004','Marcus','Webb',null,null,'0400 111 004','1996-01-30','2/9 Rocky Point Rd, Weipa QLD 4874',null,null,null,null,null,null,true,null,false,'No emergency contact on file — chase.'),
('11111111-1111-4111-8111-000000000005','Elena','Sokolova','Lena','elena.sokolova@example.com','0400 111 005','1990-09-09','44 Evans Landing, Weipa QLD 4874','Dmitri Sokolov','0400 111 905','Father',null,null,null,true,null,true,null),
('11111111-1111-4111-8111-000000000006','Jack','Turner',null,'jack.turner@example.com','0400 111 006','2010-04-18','7 Warwick St, Weipa QLD 4874','Paula Turner','0400 111 906','Mother','Paula Turner','0400 111 906','paula.turner@example.com',true,'2026-08-20',true,'Under 18 — parent consent recorded 20 Aug.'),
('11111111-1111-4111-8111-000000000007','Chloe','Adams',null,'chloe.adams@example.com','0400 111 007','2011-02-05','19 Trunding Cres, Weipa QLD 4874','Rachel Adams','0400 111 907','Mother','Rachel Adams','0400 111 907',null,false,null,null,'Under 18 — consent NOT yet recorded, role pending.'),
('11111111-1111-4111-8111-000000000008','Derek','Holmes',null,null,'0400 111 008','1969-06-12','3 Peninsula Dr, Weipa QLD 4874','Jen Holmes','0400 111 908','Daughter',null,null,null,true,null,false,'Feeding & cleaning only — not a walker.'),
('11111111-1111-4111-8111-000000000009','Sandra','Bell',null,'sandra.bell@example.com','0400 111 009','1982-12-01','21 Kalkadoon St, Weipa QLD 4874','Greg Bell','0400 111 909','Husband',null,null,null,true,null,true,'Volunteer Plus — long-time walker, runs the Saturday roster.'),
('11111111-1111-4111-8111-000000000010','Nathan','Cole',null,'nathan.cole@example.com','0400 111 010','1987-05-25','66 Iraci Cres, Weipa QLD 4874','Amy Cole','0400 111 910','Wife',null,null,null,true,null,true,'Volunteer Plus — also does transport runs.'),
('11111111-1111-4111-8111-000000000011','Olivia','Grant',null,'olivia.grant@example.com','0400 111 011','1999-08-17','10 Nomad St, Weipa QLD 4874','Beth Grant','0400 111 911','Mother',null,null,null,true,null,true,null),
('11111111-1111-4111-8111-000000000012','Bill','Sharpe',null,null,'0400 111 012','1955-02-28','1 Golf Links Rd, Weipa QLD 4874','Margaret Sharpe','0400 111 912','Wife',null,null,null,true,null,false,'Bad knee — short walks only.'),
-- homecare carers ---------------------------------------------------------
('11111111-1111-4111-8111-000000000013','Karen','Mills',null,'karen.mills@example.com','0400 111 013','1975-04-04','30 Duyfken Cres, Weipa QLD 4874','Ian Mills','0400 111 913','Husband',null,null,null,true,null,true,null),
('11111111-1111-4111-8111-000000000014','Greg','Paulson',null,'greg.paulson@example.com','0400 111 014','1980-10-19','14 Tantani St, Weipa QLD 4874','Kate Paulson','0400 111 914','Wife',null,null,null,true,null,true,null),
('11111111-1111-4111-8111-000000000015','Fiona','Doyle',null,'fiona.doyle@example.com','0400 111 015','1993-06-30','48 Cook St, Weipa QLD 4874','Liam Doyle','0400 111 915','Brother',null,null,null,true,null,true,'Foster application — home check not yet done.'),
('11111111-1111-4111-8111-000000000016','Raj','Kapoor',null,'raj.kapoor@example.com','0400 111 016','1988-02-11','25 Barramundi Way, Weipa QLD 4874','Sunita Kapoor','0400 111 916','Wife',null,null,null,true,null,true,'Home check done — improvements needed (pool fence gate).'),
('11111111-1111-4111-8111-000000000017','Sally','Munro',null,'sally.munro@example.com','0400 111 017','1972-09-15','9 Pelican Ct, Weipa QLD 4874','Doug Munro','0400 111 917','Husband',null,null,null,true,null,true,null),
('11111111-1111-4111-8111-000000000018','Dan','Cruz',null,'dan.cruz@example.com','0400 111 018','1984-03-22','17 Mango Ave, Weipa QLD 4874','Rosa Cruz','0400 111 918','Sister',null,null,null,true,null,true,'Jail break carer only — weekends.'),
('11111111-1111-4111-8111-000000000019','Michelle','Ford',null,'michelle.ford@example.com','0400 111 019','1986-07-07','52 Raptis St, Weipa QLD 4874','Pete Ford','0400 111 919','Husband',null,null,null,true,null,true,'Walker and foster carer.'),
('11111111-1111-4111-8111-000000000020','Peter','Vance',null,'peter.vance@example.com','0400 111 020','1979-12-25','6 Jardine St, Weipa QLD 4874','Nina Vance','0400 111 920','Wife',null,null,null,true,null,true,'Foster + jail break — both pending.'),
('11111111-1111-4111-8111-000000000021','Anna','Lindqvist',null,'anna.lindqvist@example.com','0400 111 021','1991-11-11','38 Napranum Rd, Weipa QLD 4874','Erik Lindqvist','0400 111 921','Husband',null,null,null,true,null,true,null),
('11111111-1111-4111-8111-000000000022','Rob','Kennedy',null,'rob.kennedy@example.com','0400 111 022','1983-08-08','4 Hibberd Dr, Weipa QLD 4874','Tara Kennedy','0400 111 922','Wife',null,null,null,true,null,true,'Jail break active; foster pending.'),
('11111111-1111-4111-8111-000000000023','Helen','Barnes',null,'helen.barnes@example.com','0400 111 023','1963-05-16','11 Awonga St, Weipa QLD 4874','Ray Barnes','0400 111 923','Husband',null,null,null,true,null,true,null),
('11111111-1111-4111-8111-000000000024','Wayne','Foster',null,'wayne.foster@example.com','0400 111 024','1977-01-09','29 Kwaymullina Cres, Weipa QLD 4874','Deb Foster','0400 111 924','Wife',null,null,null,true,null,true,null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- PERSON ROLES
-- ---------------------------------------------------------------------------
insert into person_roles (id, person_id, role, status, granted_on, approved_by, note) values
-- walkers: volunteer -------------------------------------------------------
('22222222-2222-4222-8222-000000000001','11111111-1111-4111-8111-000000000001','volunteer','active','2026-06-02',null,null),
('22222222-2222-4222-8222-000000000002','11111111-1111-4111-8111-000000000002','volunteer','active','2025-11-18',null,null),
('22222222-2222-4222-8222-000000000003','11111111-1111-4111-8111-000000000003','volunteer','active','2026-01-20',null,null),
('22222222-2222-4222-8222-000000000004','11111111-1111-4111-8111-000000000004','volunteer','active','2026-08-15',null,null),
('22222222-2222-4222-8222-000000000005','11111111-1111-4111-8111-000000000005','volunteer','active','2026-03-11',null,null),
('22222222-2222-4222-8222-000000000006','11111111-1111-4111-8111-000000000006','volunteer','active','2026-08-21','df7265f5-d731-4880-b0e8-e843c54af1b6','Under-18, parent consent confirmed.'),
('22222222-2222-4222-8222-000000000007','11111111-1111-4111-8111-000000000007','volunteer','pending',null,null,'Under-18, awaiting parent/guardian consent.'),
('22222222-2222-4222-8222-000000000008','11111111-1111-4111-8111-000000000008','volunteer','active','2025-09-30',null,null),
('22222222-2222-4222-8222-000000000009','11111111-1111-4111-8111-000000000009','volunteer','active','2024-05-04',null,null),
('22222222-2222-4222-8222-000000000010','11111111-1111-4111-8111-000000000010','volunteer','active','2025-02-14',null,null),
('22222222-2222-4222-8222-000000000011','11111111-1111-4111-8111-000000000011','volunteer','active','2026-07-19',null,null),
('22222222-2222-4222-8222-000000000012','11111111-1111-4111-8111-000000000012','volunteer','active','2026-04-28',null,null),
-- Volunteer Plus (extra role) -------------------------------------------
('22222222-2222-4222-8222-000100000009','11111111-1111-4111-8111-000000000009','volunteer_plus','active','2024-08-01','df7265f5-d731-4880-b0e8-e843c54af1b6','Trusted to run kiosk for walks + yard.'),
('22222222-2222-4222-8222-000100000010','11111111-1111-4111-8111-000000000010','volunteer_plus','active','2025-06-01','df7265f5-d731-4880-b0e8-e843c54af1b6','Trusted to run kiosk for walks + yard.'),
-- carers -----------------------------------------------------------------
('22222222-2222-4222-8222-000000000013','11111111-1111-4111-8111-000000000013','foster_carer','active','2025-07-12','df7265f5-d731-4880-b0e8-e843c54af1b6',null),
('22222222-2222-4222-8222-000100000013','11111111-1111-4111-8111-000000000013','jailbreak_carer','active','2025-07-12','df7265f5-d731-4880-b0e8-e843c54af1b6',null),
('22222222-2222-4222-8222-000000000014','11111111-1111-4111-8111-000000000014','foster_carer','active','2025-03-08','df7265f5-d731-4880-b0e8-e843c54af1b6',null),
('22222222-2222-4222-8222-000100000014','11111111-1111-4111-8111-000000000014','jailbreak_carer','active','2025-03-08','df7265f5-d731-4880-b0e8-e843c54af1b6',null),
('22222222-2222-4222-8222-000000000015','11111111-1111-4111-8111-000000000015','foster_carer','pending',null,null,'Home check not yet scheduled.'),
('22222222-2222-4222-8222-000000000016','11111111-1111-4111-8111-000000000016','foster_carer','pending',null,null,'Home check done — improvements needed.'),
('22222222-2222-4222-8222-000000000017','11111111-1111-4111-8111-000000000017','foster_carer','active','2024-11-22','df7265f5-d731-4880-b0e8-e843c54af1b6',null),
('22222222-2222-4222-8222-000000000018','11111111-1111-4111-8111-000000000018','jailbreak_carer','active','2026-02-01','df7265f5-d731-4880-b0e8-e843c54af1b6',null),
('22222222-2222-4222-8222-000000000019','11111111-1111-4111-8111-000000000019','foster_carer','active','2025-10-05','df7265f5-d731-4880-b0e8-e843c54af1b6',null),
('22222222-2222-4222-8222-000100000019','11111111-1111-4111-8111-000000000019','volunteer','active','2025-10-05',null,null),
('22222222-2222-4222-8222-000000000020','11111111-1111-4111-8111-000000000020','foster_carer','pending',null,null,null),
('22222222-2222-4222-8222-000100000020','11111111-1111-4111-8111-000000000020','jailbreak_carer','pending',null,null,null),
('22222222-2222-4222-8222-000000000021','11111111-1111-4111-8111-000000000021','foster_carer','active','2026-05-30','df7265f5-d731-4880-b0e8-e843c54af1b6',null),
('22222222-2222-4222-8222-000000000022','11111111-1111-4111-8111-000000000022','jailbreak_carer','active','2026-03-15','df7265f5-d731-4880-b0e8-e843c54af1b6',null),
('22222222-2222-4222-8222-000100000022','11111111-1111-4111-8111-000000000022','foster_carer','pending',null,null,'Wants to foster too — home check pending.'),
('22222222-2222-4222-8222-000000000023','11111111-1111-4111-8111-000000000023','foster_carer','active','2025-01-11','df7265f5-d731-4880-b0e8-e843c54af1b6',null),
('22222222-2222-4222-8222-000000000024','11111111-1111-4111-8111-000000000024','jailbreak_carer','active','2025-08-19','df7265f5-d731-4880-b0e8-e843c54af1b6',null),
('22222222-2222-4222-8222-000100000024','11111111-1111-4111-8111-000000000024','foster_carer','active','2025-08-19','df7265f5-d731-4880-b0e8-e843c54af1b6',null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- VOLUNTEER PROFILES
-- ---------------------------------------------------------------------------
insert into volunteer_profile (person_id, interests, experience, medical_issues, how_heard, agree_terms, signature_name, signature_date) values
('11111111-1111-4111-8111-000000000001','{dog_walking}','Basic — I have owned a dog',null,'Facebook',true,'Ruby Fielding','2026-06-02'),
('11111111-1111-4111-8111-000000000002','{dog_walking,feeding_cleaning}','Medium — I have owned and trained several dogs or done some volunteering',null,'Friend, colleague or family member',true,'Tom Beckett','2025-11-18'),
('11111111-1111-4111-8111-000000000003','{dog_walking}','High — I have professional level experience training or caring for dogs over many years',null,'Community event',true,'Priya Nair','2026-01-20'),
('11111111-1111-4111-8111-000000000004','{dog_walking}','No experience','Asthma — carries an inhaler','Signs or flyers',true,'Marcus Webb','2026-08-15'),
('11111111-1111-4111-8111-000000000005','{dog_walking,social_media}','Medium — I have owned and trained several dogs or done some volunteering',null,'Facebook',true,'Elena Sokolova','2026-03-11'),
('11111111-1111-4111-8111-000000000006','{dog_walking}','Basic — I have owned a dog',null,'Friend, colleague or family member',true,'Jack Turner','2026-08-21'),
('11111111-1111-4111-8111-000000000007','{dog_walking}','No experience',null,'Signs or flyers',true,'Chloe Adams','2026-09-01'),
('11111111-1111-4111-8111-000000000008','{feeding_cleaning}','No experience',null,'Community event',true,'Derek Holmes','2025-09-30'),
('11111111-1111-4111-8111-000000000009','{dog_walking}','High — I have professional level experience training or caring for dogs over many years',null,'Friend, colleague or family member',true,'Sandra Bell','2024-05-04'),
('11111111-1111-4111-8111-000000000010','{dog_walking,transport}','Medium — I have owned and trained several dogs or done some volunteering',null,'Facebook',true,'Nathan Cole','2025-02-14'),
('11111111-1111-4111-8111-000000000011','{dog_walking}','Basic — I have owned a dog',null,'Facebook',true,'Olivia Grant','2026-07-19'),
('11111111-1111-4111-8111-000000000012','{dog_walking,wherever_useful}','Medium — I have owned and trained several dogs or done some volunteering','Bad knee — short walks only','Signs or flyers',true,'Bill Sharpe','2026-04-28'),
('11111111-1111-4111-8111-000000000019','{dog_walking}','High — I have professional level experience training or caring for dogs over many years',null,'Community event',true,'Michelle Ford','2025-10-05')
on conflict (person_id) do nothing;

-- ---------------------------------------------------------------------------
-- HOMECARE PROFILES  (every foster / jail-break carer gets one)
-- ---------------------------------------------------------------------------
insert into homecare_profile (person_id, over_18, property_ownership, fence_type, fence_height,
   people_at_home, children_u16, other_animals, animal_details, vaccines_current, experience,
   jb_day, jb_weekend, jb_shift, jb_school, foster_short, foster_long, agree_terms,
   signature_name, signature_date, applied_on,
   yard_check_done, yard_check_by, yard_check_on, yard_check_notes, yard_check_outcome) values
('11111111-1111-4111-8111-000000000013',true,'own','colorbond','1.8m',2,0,'yes','One desexed cat, indoor',true,'Fostered 6+ dogs over 3 years',true,true,false,false,true,true,true,'Karen Mills','2025-07-10','2025-07-01',true,'df7265f5-d731-4880-b0e8-e843c54af1b6','2025-07-11','Fully fenced, secure gate, shade and water. Cat kept separate. All good.','passed'),
('11111111-1111-4111-8111-000000000014',true,'own','timber','1.8m',3,1,'yes','Older Lab, very tolerant',true,'Grew up on a property with working dogs',true,true,true,false,true,true,true,'Greg Paulson','2025-03-05','2025-02-25',true,'df7265f5-d731-4880-b0e8-e843c54af1b6','2025-03-08','Yard secure. Child is 12 and sensible around dogs. Resident dog friendly.','passed'),
('11111111-1111-4111-8111-000000000015',true,'rent','chain_wire','1.5m',1,0,'no',null,null,'Had a family dog as a teenager',false,true,false,false,true,false,true,'Fiona Doyle','2026-09-02','2026-09-02',false,null,null,null,null),
('11111111-1111-4111-8111-000000000016',true,'own','pool_fence_partial','1.2m',4,2,'yes','Two small dogs',true,'Owned dogs all my adult life',true,true,false,true,false,true,true,'Raj Kapoor','2026-08-28','2026-08-28',false,'df7265f5-d731-4880-b0e8-e843c54af1b6','2026-09-03','Pool fence gate does not self-latch; front yard not dog-proof. Asked to fix the gate and add a side fence, then re-inspect.','improvements_needed'),
('11111111-1111-4111-8111-000000000017',true,'own','colorbond','1.8m',2,0,'no',null,true,'Long-term foster carer, mostly seniors',false,false,false,false,false,true,true,'Sally Munro','2024-11-20','2024-11-10',true,'df7265f5-d731-4880-b0e8-e843c54af1b6','2024-11-22','Quiet home, big secure yard. Ideal for long-term / palliative fosters.','passed'),
('11111111-1111-4111-8111-000000000018',true,'own','timber','1.5m',2,0,'no',null,true,'Weekend jail-break runs for 2 years',false,true,false,false,false,false,true,'Dan Cruz','2026-01-28','2026-01-20',false,null,null,null,null),
('11111111-1111-4111-8111-000000000019',true,'own','colorbond','1.8m',3,1,'yes','One cattle dog',true,'Trainer background, several fosters',true,true,false,false,true,true,true,'Michelle Ford','2025-10-01','2025-09-20',true,'df7265f5-d731-4880-b0e8-e843c54af1b6','2025-10-05','Secure, experienced household. No concerns.','passed'),
('11111111-1111-4111-8111-000000000020',true,'rent','chain_wire','1.8m',2,0,'no',null,null,'First-time carer, keen to learn',true,false,true,false,true,false,true,'Peter Vance','2026-09-05','2026-09-05',false,null,null,null,null),
('11111111-1111-4111-8111-000000000021',true,'own','colorbond','1.8m',2,0,'yes','One desexed female dog, social',true,'Fostered mums-and-pups litters',false,false,false,false,true,true,true,'Anna Lindqvist','2026-05-28','2026-05-18',true,'df7265f5-d731-4880-b0e8-e843c54af1b6','2026-05-30','Great setup for litters — separate laundry space, secure yard.','passed'),
('11111111-1111-4111-8111-000000000022',true,'own','timber','1.8m',4,2,'yes','Two dogs, one cat',true,'Jail break weekends for a year',true,true,false,false,true,false,true,'Rob Kennedy','2026-03-12','2026-03-01',false,null,null,null,null),
('11111111-1111-4111-8111-000000000023',true,'own','brick_and_colorbond','1.8m',2,0,'no',null,false,'Retired, home all day, many fosters',false,false,false,false,true,true,true,'Helen Barnes','2025-01-08','2024-12-20',true,'df7265f5-d731-4880-b0e8-e843c54af1b6','2025-01-11','Retired couple, home all day. Excellent for anxious dogs.','passed'),
('11111111-1111-4111-8111-000000000024',true,'own','colorbond','2.0m',3,1,'yes','One large dog, dog-savvy',true,'Property with kennels, long-time carer',true,true,true,true,true,true,true,'Wayne Foster','2025-08-15','2025-08-01',true,'df7265f5-d731-4880-b0e8-e843c54af1b6','2025-08-19','2m fencing, dedicated run, shade. Ready for anything.','passed')
on conflict (person_id) do nothing;

-- ---------------------------------------------------------------------------
-- DOGS
-- ---------------------------------------------------------------------------
insert into dogs (id, ref, name, status, handling_notes, experienced_handler_only, arrival_date,
   arrival_type, arrival_notes, breed, date_of_birth, age_override, sex, size_when_adult, colour,
   weight_kg, desexed, vaccinated, wormed, heartworm_treated, good_with_kids_u5, good_with_kids_5_12,
   good_with_cats, good_with_dogs, good_with_other, energy_level, house_trained, public_description,
   public_medical_summary, adoption_fee, adoption_policy, listed_on_savourlife) values
('33333333-3333-4333-8333-000000000008','D008','Balto','available','Strong on the lead — use the harness.',false,'2026-07-15','stray','Found near Evans Landing boat ramp.','Alaskan Malamute x','2023-05-01',null,'M','Large','Grey & white',34.2,true,true,true,true,'untested','yes','no','yes','untested','High','Yes','Big handsome boy with a thick coat and a huge grin. Needs a securely fenced yard and a family who will walk him daily.',null,600,'Standard',true),
('33333333-3333-4333-8333-000000000009','D009','Scooby','available','Pulls hard at the start then settles.',false,'2026-06-20','surrender','Owner moved into a unit.','Great Dane x','2022-11-10',null,'M','Large','Brown',41.0,true,true,true,true,'yes','yes','untested','yes','untested','Medium','Yes','A gangly, goofy giant who thinks he is a lap dog. Great with older kids and other dogs.',null,550,'Standard',true),
('33333333-3333-4333-8333-000000000010','D010','Snoopy','available',null,false,'2026-08-01','pound','Council pound transfer, no history.','Beagle','2024-02-14',null,'M','Small','Tricolour',12.5,true,true,true,false,'yes','yes','untested','yes','untested','High','Working on it','Nose on legs. Will follow a scent to the ends of the earth, so a fenced yard is a must. Cheerful and food-motivated.','Heartworm negative; treatment not required.',450,'Standard',true),
('33333333-3333-4333-8333-000000000011','D011','Clifford','available','Barky in the kennel, quiet once out.',false,'2026-05-05','rescue','Surrendered from a property with too many dogs.','Red Cattle Dog','2021-08-22',null,'M','Medium','Red speckle',22.0,true,true,true,true,'no','untested','no','yes','untested','High','Yes','A classic red heeler — smart, loyal, needs a job. Would suit an active adult home or a rural property.',null,400,'Standard',true),
('33333333-3333-4333-8333-000000000012','D012','Copper','bed_rest','Recovering from desexing — lead only, no running.',false,'2026-08-25','stray','Handed in by a member of the public.','Foxhound x','2024-06-30',null,'M','Medium','Tan & white',18.0,true,true,true,false,'untested','yes','untested','yes','untested','Medium','Working on it','Sweet young hound still learning the ropes. Currently on cage rest after desexing.','Desexed 8 Sep — on restricted exercise for 10 days.',400,'Standard',false),
('33333333-3333-4333-8333-000000000013','D013','Lady','bed_rest','Anxious near traffic — quiet routes only.',true,'2026-04-02','surrender','Owner could not afford heartworm treatment.','Cocker Spaniel','2020-01-19',null,'F','Small','Golden',13.2,true,true,true,false,'untested','no','untested','yes','untested','Low','Yes','A gentle older girl going through heartworm treatment. She will need a calm home with no stairs for a while.','Undergoing heartworm treatment — strict rest for 4 weeks, then re-test.',300,'Strict',false),
('33333333-3333-4333-8333-000000000014','D014','Astro','jail_break','Settles well in a home, loud in kennels.',false,'2026-03-18','return','Adoption return — landlord would not allow pets.','Labrador x','2023-09-05',null,'M','Large','Black',30.0,true,true,true,true,'yes','yes','yes','yes','untested','Medium','Yes','A big soft Labrador type who is much happier out of the shelter. On a jail-break stay while he waits for his family.',null,500,'Standard',true),
('33333333-3333-4333-8333-000000000015','D015','Gromit','fostered',null,false,'2026-02-01','rescue','Long-term resident — thrives in foster.','Whippet x','2019-07-12',null,'M','Medium','Fawn',14.0,true,true,true,true,'untested','yes','yes','yes','untested','Low','Yes','A quiet, dignified older gentleman who loves a sunny couch. In foster care while he waits for a retirement home.','Age-related dental done Aug 2026. Otherwise healthy.',200,'Standard',true),
('33333333-3333-4333-8333-000000000016','D016','Benji','fostered',null,false,'2026-07-28','stray','Tiny, found wandering near the shops.','Terrier x','2025-01-20',null,'M','Small','Wire brown',6.4,true,true,true,false,'yes','yes','untested','yes','untested','Medium','Working on it','Scruffy little character with loads of personality. In foster to build his confidence with a family.',null,400,'Standard',true),
('33333333-3333-4333-8333-000000000017','D017','Hachi','available',null,false,'2026-06-10','surrender','Owner relocating overseas.','Akita x','2022-04-30',null,'M','Large','Cream',38.0,true,true,true,true,'no','untested','no','no','no','Medium','Yes','A striking, aloof boy who bonds hard with his person. Best as an only pet with an experienced owner.','Mild skin dermatitis — managed with a medicated wash.',450,'Strict',true),
('33333333-3333-4333-8333-000000000018','D018','Laika','available','Slips collars — martingale only.',false,'2026-01-15','stray','Very shy on intake, come a long way.','Kelpie x','2023-12-01',null,'F','Medium','Black & tan',17.5,true,true,true,true,'untested','yes','untested','yes','untested','High','Yes','A shy girl who has blossomed with patient handling. Would love an active, calm home to keep building her trust.',null,400,'Standard',true),
('33333333-3333-4333-8333-000000000019','D019','Bingo','available',null,false,'2026-09-06','pound','Just arrived — pound transfer.','Bull Arab x','2024-08-08',null,'M','Large','White & brindle',32.0,false,true,true,false,'untested','untested','untested','untested','untested','High','Unknown','Brand new to the shelter and still settling in. Come and say hello once he has found his feet.','Desexing booked for next week.',400,'Standard',false),
('33333333-3333-4333-8333-000000000020','D020','Winn-Dixie','available',null,false,'2025-11-20','rescue','Owner passed away.','Border Collie x','2021-03-14',null,'F','Medium','Black & white',19.0,true,true,true,true,'yes','yes','yes','yes','yes','High','Yes','A bright, biddable girl who already knows her basic manners. Would thrive with a family that does training or dog sports.',null,450,'Standard',true),
('33333333-3333-4333-8333-000000000021','D021','Petey','available','Resource-guards food and toys — do not approach while eating.',true,'2025-09-10','surrender','Behavioural surrender.','Staffy x','2022-07-01',null,'M','Medium','Brindle',24.0,true,true,true,true,'no','no','no','untested','no','Medium','Yes','A loving dog with his people who needs an adults-only, dog-experienced home and a management plan around food.',null,0,'Strict',false),
('33333333-3333-4333-8333-000000000022','D022','Shiloh','available',null,false,'2026-05-01','stray',null,'Beagle x','2023-10-10',null,'F','Small','Lemon & white',11.0,true,true,true,true,'yes','yes','yes','yes','yes','Medium','Yes','Happy little beagle girl, adopted out May 2026 test record.',null,400,'Standard',false),
('33333333-3333-4333-8333-000000000023','D023','Nana','available',null,false,'2025-08-01','surrender',null,'Newfoundland x','2019-02-02',null,'F','Large','Black',52.0,true,true,true,true,'yes','yes','yes','yes','untested','Low','Yes','Gentle giant, transferred to a large-breed rescue down south.',null,300,'Standard',false)
on conflict (ref) do nothing;

-- ---------------------------------------------------------------------------
-- DOG PHOTOS — reuse existing uploaded storage objects so a few new dogs
-- render a picture without needing fresh uploads. The rest use the
-- initials placeholder (a realistic mix for an intake-day roster).
-- ---------------------------------------------------------------------------
insert into dog_media (id, dog_id, path, is_primary, sort_order)
select ('99999999-9999-4999-8999-0000000000' || lpad(seq::text, 2, '0'))::uuid, d.id, p.path, true, 0
from (values
  ('D008','8f635145-75ff-45a3-80d6-affdb2812b73/photo.jpg', 8),
  ('D009','6cb8a049-0a04-4fd9-9168-1381bd2bc677/photo.jpg', 9),
  ('D013','5f8b356f-12d5-41f6-91e4-93f433037fe6/photo.jpg', 13),
  ('D015','e00e4b98-cdd3-4186-b47f-d6ba902cf2be/photo.jpg', 15),
  ('D017','b08d9505-ca99-445b-819e-ba51e0f0655c/photo.jpg', 17),
  ('D020','fb0bcd3c-3c72-489c-bcb3-d2a4e7f1a1fa/photo.jpg', 20)
) as p(ref, path, seq)
join dogs d on d.ref = p.ref
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- OPEN ACTIVITY — the dogs that are "out" right now
-- (the sync trigger sets each dog's status from these)
-- ---------------------------------------------------------------------------
insert into dog_activity (id, dog_id, type, person_id, placed_by, started_at, due_back, ended_at, reason, notes) values
-- walking now
('44444444-4444-4444-8444-000000000008','33333333-3333-4333-8333-000000000008','walk','11111111-1111-4111-8111-000000000001',null, now() - interval '40 minutes', null, null, null, null),
('44444444-4444-4444-8444-000000000009','33333333-3333-4333-8333-000000000009','walk','11111111-1111-4111-8111-000000000003',null, now() - interval '82 minutes', null, null, null, null),
-- in the yards now
('44444444-4444-4444-8444-000000000010','33333333-3333-4333-8333-000000000010','yard',null,'df7265f5-d731-4880-b0e8-e843c54af1b6', now() - interval '25 minutes', now() + interval '35 minutes', null, 'Yard 1', null),
('44444444-4444-4444-8444-000000000011','33333333-3333-4333-8333-000000000011','yard',null,'df7265f5-d731-4880-b0e8-e843c54af1b6', now() - interval '155 minutes', now() - interval '35 minutes', null, 'Yard 2', null),
-- bed rest
('44444444-4444-4444-8444-000000000012','33333333-3333-4333-8333-000000000012','bed_rest',null,'df7265f5-d731-4880-b0e8-e843c54af1b6', now() - interval '2 days', now() + interval '3 days', null, 'Desexing recovery — restricted exercise', null),
('44444444-4444-4444-8444-000000000013','33333333-3333-4333-8333-000000000013','bed_rest',null,'df7265f5-d731-4880-b0e8-e843c54af1b6', now() - interval '6 days', now() - interval '1 day', null, 'Heartworm treatment — strict rest', 'Vet review overdue — book re-check.'),
-- jail break
('44444444-4444-4444-8444-000000000014','33333333-3333-4333-8333-000000000014','jail_break','11111111-1111-4111-8111-000000000014','df7265f5-d731-4880-b0e8-e843c54af1b6', now() - interval '3 days', now() + interval '2 days', null, null, 'Weekday jail-break stay with Greg.'),
-- foster
('44444444-4444-4444-8444-000000000015','33333333-3333-4333-8333-000000000015','foster','11111111-1111-4111-8111-000000000013','df7265f5-d731-4880-b0e8-e843c54af1b6', now() - interval '24 days', now() + interval '30 days', null, null, 'Long-term foster while seeking a retirement home.'),
('44444444-4444-4444-8444-000000000016','33333333-3333-4333-8333-000000000016','foster','11111111-1111-4111-8111-000000000021','df7265f5-d731-4880-b0e8-e843c54af1b6', now() - interval '9 days', now() + interval '51 days', null, null, 'Confidence-building foster.')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RECENT CLOSED WALKS — freshen a few dogs' "last walk"
-- ---------------------------------------------------------------------------
insert into dog_activity (id, dog_id, type, person_id, started_at, ended_at, entered_late)
select spec.id::uuid, d.id, 'walk', spec.walker::uuid, now() - spec.start_ago, now() - spec.end_ago, false
from (values
  ('44444444-4444-4444-8444-000000000117','D017','11111111-1111-4111-8111-000000000005', interval '3 hours',                      interval '2 hours 25 minutes'),
  ('44444444-4444-4444-8444-000000000120','D020','11111111-1111-4111-8111-000000000011', interval '27 hours',                     interval '26 hours 20 minutes'),
  ('44444444-4444-4444-8444-000000000121','D021','11111111-1111-4111-8111-000000000003', interval '4 days 2 hours',                interval '4 days 1 hour 20 minutes'),
  ('44444444-4444-4444-8444-000000000101','D001','11111111-1111-4111-8111-000000000009', interval '20 hours',                     interval '19 hours 15 minutes'),
  ('44444444-4444-4444-8444-000000000103','D003','11111111-1111-4111-8111-000000000002', interval '5 hours',                      interval '4 hours 20 minutes')
) as spec(id, ref, walker, start_ago, end_ago)
join dogs d on d.ref = spec.ref
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- HISTORICAL WALKS — deterministic bulk fill (ids from md5 → uuid)
--   spec: (dog_ref, count, days-ago-of-most-recent, gap-days-between)
-- ---------------------------------------------------------------------------
with walkers(ids) as (
  select array[
    '11111111-1111-4111-8111-000000000001',
    '11111111-1111-4111-8111-000000000002',
    '11111111-1111-4111-8111-000000000003',
    '11111111-1111-4111-8111-000000000005',
    '11111111-1111-4111-8111-000000000009',
    '11111111-1111-4111-8111-000000000010',
    '11111111-1111-4111-8111-000000000011',
    '11111111-1111-4111-8111-000000000012',
    '6a8c8b91-f30b-4a63-ad14-ce2fd4a14d4e'
  ]::uuid[]
)
insert into dog_activity (id, dog_id, type, person_id, started_at, ended_at, entered_late, created_at)
select
  md5(spec.ref || '-hist-' || g)::uuid,
  d.id, 'walk',
  (select ids[1 + (g % array_length(ids, 1))] from walkers),
  now() - ((spec.recent + g * spec.gap) * interval '1 day') - interval '6 hours' + (g % 4) * interval '17 minutes',
  now() - ((spec.recent + g * spec.gap) * interval '1 day') - interval '6 hours' + (g % 4) * interval '17 minutes'
      + interval '32 minutes' + (g % 3) * interval '14 minutes',
  (g % 7 = 0),          -- sprinkle a few "logged late" rows
  now()
from (values
  ('D008', 5, 3,  4),
  ('D009', 4, 2,  5),
  ('D010', 7, 2,  3),
  ('D011', 6, 3,  4),
  ('D014', 3, 6,  6),   -- pre jail-break history
  ('D017', 5, 4,  4),
  ('D018', 4, 9,  5),   -- last walk 9 days ago → "needs a walk"
  ('D020', 6, 3,  3),
  ('D021', 4, 8,  6),
  ('D022', 8, 20, 5),   -- exited dog — plenty of history before adoption
  ('D023', 6, 45, 6),   -- exited (transferred) — history before exit
  ('D001', 3, 4,  5),
  ('D002', 4, 3,  4),
  ('D004', 5, 6,  4),
  ('D006', 3, 5,  6)
) as spec(ref, cnt, recent, gap)
join dogs d on d.ref = spec.ref
cross join lateral generate_series(0, spec.cnt - 1) as g
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- EXITED DOGS — set after their activity so the trigger's "exited" guard holds
-- ---------------------------------------------------------------------------
update dogs set status = 'exited', exit_date = (now() - interval '15 days')::date,
  exit_type = 'adopted', exit_notes = 'Adopted by a local family (test record).'
where ref = 'D022' and status <> 'exited';

update dogs set status = 'exited', exit_date = (now() - interval '40 days')::date,
  exit_type = 'transferred', exit_notes = 'Transferred to a large-breed rescue (test record).'
where ref = 'D023' and status <> 'exited';

-- ---------------------------------------------------------------------------
-- DOG CONFIDENTIAL  (staff-only panel)
-- ---------------------------------------------------------------------------
insert into dog_confidential (dog_id, behaviour_notes, adoption_history, medical_summary_internal, restrictions) values
('33333333-3333-4333-8333-000000000013','Freezes and shakes near moving traffic. Fine on quiet residential streets. Muzzle-trained for vet handling.',null,'Heartworm positive on intake — started slow-kill protocol 4 Sep. Next antigen test due in 4 weeks. Keep exercise to lead-only toilet breaks.','Experienced handlers only until heartworm treatment complete. No stairs.'),
('33333333-3333-4333-8333-000000000021','Resource-guards food bowl, high-value chews and stolen items. Has air-snapped when approached mid-chew. No contact incidents at the shelter under the management plan.','Surrendered by original owner after a guarding incident with a child.','Healthy. On a measured-feeding plan.','Adults-only home. Dog-experienced adopters. No under-16 handlers. Feed in a separate closed room.'),
('33333333-3333-4333-8333-000000000014','Kennel-stressed — spins and barks, presents worse than he is. Completely different dog in a home: settles, house-clean, sleeps through.','Adopted Jan 2026, returned March 2026 — rental "no pets" clause enforced, not a behaviour return.',null,'Needs a confirmed pet-friendly living situation before adoption.')
on conflict (dog_id) do nothing;

-- ---------------------------------------------------------------------------
-- MEDICAL EVENTS  (staff-only)
-- ---------------------------------------------------------------------------
insert into medical_events (id, dog_id, event_date, type, detail, vet, created_by) values
('55555555-5555-4555-8555-000000000001','33333333-3333-4333-8333-000000000012',(now() - interval '2 days')::date,'procedure','Routine desex surgery. Recovered well from anaesthetic. Sutures out in 10 days. Restricted exercise until then.','Weipa Veterinary Clinic','df7265f5-d731-4880-b0e8-e843c54af1b6'),
('55555555-5555-4555-8555-000000000002','33333333-3333-4333-8333-000000000013',(now() - interval '6 days')::date,'medication','Commenced heartworm slow-kill protocol (doxycycline + monthly preventative). Strict rest for 4 weeks, then antigen re-test.','Weipa Veterinary Clinic','df7265f5-d731-4880-b0e8-e843c54af1b6'),
('55555555-5555-4555-8555-000000000003','33333333-3333-4333-8333-000000000015',(now() - interval '20 days')::date,'procedure','Dental scale, polish and two extractions. Age-related. Eating normally the next day.','Weipa Veterinary Clinic','df7265f5-d731-4880-b0e8-e843c54af1b6'),
('55555555-5555-4555-8555-000000000004','33333333-3333-4333-8333-000000000017',(now() - interval '11 days')::date,'vet_visit','Skin check — mild bilateral flank dermatitis. Started medicated wash twice weekly. Review in 3 weeks.','Weipa Veterinary Clinic','df7265f5-d731-4880-b0e8-e843c54af1b6'),
('55555555-5555-4555-8555-000000000005','33333333-3333-4333-8333-000000000019',(now() - interval '1 days')::date,'observation','Intake exam. Underweight (BCS 3/9), otherwise healthy. Desex booked. Worming given.',null,'df7265f5-d731-4880-b0e8-e843c54af1b6')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- NOTES
-- ---------------------------------------------------------------------------
insert into notes (id, subject_type, subject_id, body, visibility, author_id) values
('66666666-6666-4666-8666-000000000001','dog','33333333-3333-4333-8333-000000000017','Loves a tennis ball — bring one and he will walk anywhere with you.','all','df7265f5-d731-4880-b0e8-e843c54af1b6'),
('66666666-6666-4666-8666-000000000002','dog','33333333-3333-4333-8333-000000000021','Do NOT walk past the cat enclosure. Feed in the back room with the door shut.','staff','df7265f5-d731-4880-b0e8-e843c54af1b6'),
('66666666-6666-4666-8666-000000000003','dog','33333333-3333-4333-8333-000000000009','Pulls like a train for the first five minutes, then he is a gentleman.','all','df7265f5-d731-4880-b0e8-e843c54af1b6'),
('66666666-6666-4666-8666-000000000004','dog','33333333-3333-4333-8333-000000000018','Martingale collar only — she has backed out of a flat collar before.','all','df7265f5-d731-4880-b0e8-e843c54af1b6'),
('66666666-6666-4666-8666-000000000005','person','11111111-1111-4111-8111-000000000004','Still no emergency contact after two reminders. Follow up before next shift.','staff','df7265f5-d731-4880-b0e8-e843c54af1b6')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- SITE VISITS  (a couple open, a few closed)
-- ---------------------------------------------------------------------------
insert into site_visits (id, person_id, guest_name, guest_phone, reason, reason_other, checked_in, checked_out) values
('77777777-7777-4777-8777-000000000001',null,'Col — Weipa Plumbing','0400 222 001','outside_contractor',null, now() - interval '90 minutes', null),
('77777777-7777-4777-8777-000000000002','11111111-1111-4111-8111-000000000003',null,null,'walking',null, now() - interval '40 minutes', null),
('77777777-7777-4777-8777-000000000003','11111111-1111-4111-8111-000000000013',null,null,'foster_pickup',null, now() - interval '3 days', now() - interval '3 days' + interval '2 hours'),
('77777777-7777-4777-8777-000000000004',null,'The Nguyen family','0400 222 004','adoption_visit',null, now() - interval '1 day', now() - interval '1 day' + interval '45 minutes'),
('77777777-7777-4777-8777-000000000005','11111111-1111-4111-8111-000000000002',null,null,'feeding_cleaning',null, now() - interval '2 days', now() - interval '2 days' + interval '1 hour 30 minutes'),
('77777777-7777-4777-8777-000000000006',null,'Katie — RSPCA inspector','0400 222 006','other','Welfare check-in visit', now() - interval '8 days', now() - interval '8 days' + interval '55 minutes')
on conflict (id) do nothing;

-- ============================================================================
-- To remove everything this file seeded:
-- ============================================================================
-- delete from site_visits    where id::text like '77777777-7777-4777-8777-%';
-- delete from notes           where id::text like '66666666-6666-4666-8666-%';
-- delete from medical_events  where id::text like '55555555-5555-4555-8555-%';
-- delete from dog_confidential where dog_id in (select id from dogs where ref like 'D0%' and ref > 'D007');
-- delete from dog_activity    where id::text like '44444444-4444-4444-8444-%'
--                                or dog_id in (select id from dogs where ref like 'D0%' and ref > 'D007');
-- delete from dog_media       where id::text like '99999999-9999-4999-8999-%';
-- delete from dogs            where ref like 'D0%' and ref > 'D007';
-- delete from homecare_profile where person_id::text like '11111111-1111-4111-8111-%';
-- delete from volunteer_profile where person_id::text like '11111111-1111-4111-8111-%';
-- delete from person_roles    where id::text like '22222222-2222-4222-8222-%';
-- delete from people          where id::text like '11111111-1111-4111-8111-%';
