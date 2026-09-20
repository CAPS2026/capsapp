-- Feed task wording: the morning and afternoon feeds read the same way.
-- Changes the templates (so future days are right) and any rows already
-- generated (task titles are copied onto each day's rows).

update task_template set title = 'Morning feed completed'
  where title = 'Morning feed completed, dry or bones';
update task_template set title = 'Afternoon feed completed'
  where title = 'Dinner served, meat & dry';

update task_instance set title = 'Morning feed completed'
  where title = 'Morning feed completed, dry or bones';
update task_instance set title = 'Afternoon feed completed'
  where title = 'Dinner served, meat & dry';
