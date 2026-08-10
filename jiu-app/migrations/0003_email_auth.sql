alter table users add column password_hash text;
alter table users add column password_salt text;
create unique index if not exists idx_users_email_unique on users(email) where email is not null;
