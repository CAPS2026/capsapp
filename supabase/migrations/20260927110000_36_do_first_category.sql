-- 36: a "Do this first!" checklist section, shown full width at the top.
-- (A new enum value has to be committed before anything can use it, so this
-- is its own migration.)
alter type task_category add value if not exists 'do_first' before 'opening';
