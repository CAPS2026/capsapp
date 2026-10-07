-- A health concern makes a "Keep an eye on <dog>" task at the top of the NEXT
-- shift's checklist (the same way a vet appointment makes tasks). One task per
-- concern, removed with it.
alter table task_instance add column if not exists health_concern_id uuid;

alter table task_instance drop constraint if exists task_instance_health_concern_fk;
alter table task_instance add constraint task_instance_health_concern_fk
  foreign key (health_concern_id) references health_concern(id) on delete cascade;

create unique index if not exists task_instance_health_concern_task
  on task_instance(health_concern_id) where health_concern_id is not null;
