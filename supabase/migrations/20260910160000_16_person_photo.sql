-- One photo per person (an avatar, not a gallery — unlike dogs' dog_media).
-- Stored in the public "people-photos" bucket at "<person_id>/photo.jpg";
-- photo_path holds that object path. Uploaded via a staff-only server
-- action using the service role, so no storage RLS policies are needed.
alter table people add column if not exists photo_path text;

insert into storage.buckets (id, name, public)
values ('people-photos', 'people-photos', true)
on conflict (id) do nothing;
