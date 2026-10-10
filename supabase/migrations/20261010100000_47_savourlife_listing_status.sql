-- SavourLife listing status (Paul, 2026-10-10). SavourLife has no link to our app yet, so this
-- is a record staff update after they list, hold, adopt or remove a dog on SavourLife itself.
-- States follow SavourLife's own: listed, on hold (with their reasons), adopted, removed.
alter table dogs
  add column if not exists sl_status            text not null default 'not_listed'
    check (sl_status in ('not_listed','listed','on_hold','adopted','removed')),
  add column if not exists sl_hold_reason       text,
  add column if not exists sl_enquiry_number    text,
  add column if not exists sl_status_changed_at timestamptz;

-- Dogs already flagged as listed keep that.
update dogs set sl_status = 'listed' where listed_on_savourlife = true and sl_status = 'not_listed';
