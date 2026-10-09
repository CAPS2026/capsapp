-- Photos on health concerns and handover notes (staff app).
--
-- A PRIVATE bucket: nothing in it can be opened from a plain link. The app
-- hands out short-lived signed links (the Handover log for an hour, the
-- health concern email for three days). The tablet uploads straight to the
-- bucket with a one-off upload link the server makes, so no storage
-- policies are needed (and none are added: only the server can read).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shift-photos', 'shift-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- The bucket paths of the photos on each concern / note (up to 3, checked by the app).
alter table health_concern add column if not exists photo_paths text[] not null default '{}';
alter table handover_note add column if not exists photo_paths text[] not null default '{}';
