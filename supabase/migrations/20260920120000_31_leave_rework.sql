-- Leave requests, reworked after Julie's design answers:
--  * all staff are casual, so leave is all one kind (no leave_type);
--  * Shayna decides, Renee is only informed (two recipient lists);
--  * the sidebar shows a decision once, the first shift after it (shown_in_shift).

alter table leave_request drop column if exists leave_type;
alter table leave_request add column if not exists shown_in_shift uuid references shift_log(id) on delete set null;

alter table org_settings add column if not exists leave_decider_emails text[] not null default '{}';
alter table org_settings add column if not exists leave_inform_emails text[] not null default '{}';
alter table org_settings drop column if exists leave_request_email_recipients;
