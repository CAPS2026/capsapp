create extension if not exists citext;

create type person_role as enum
  ('volunteer','jailbreak_carer','foster_carer','adopter','staff','committee');

create type role_status as enum ('pending','active','exited','declined');

create type activity_type as enum ('walk','yard','bed_rest','jail_break','foster');
