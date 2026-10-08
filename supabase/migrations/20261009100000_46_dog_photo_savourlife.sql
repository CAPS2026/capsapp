-- Which of a dog's photos go to SavourLife (Paul, 2026-10-09). Staff tick them on the
-- photo screen; the SavourLife transfer sheet then shows just those, in order.
-- SavourLife takes up to 10 photos per dog and uses the first as the featured image.
alter table dog_media add column if not exists sl_include boolean not null default false;

-- Existing photos: put each dog's first 10 (in their current order) on the SavourLife list.
update dog_media m
set sl_include = true
from (
  select id, row_number() over (partition by dog_id order by sort_order, created_at) as rn
  from dog_media
) r
where r.id = m.id and r.rn <= 10;
