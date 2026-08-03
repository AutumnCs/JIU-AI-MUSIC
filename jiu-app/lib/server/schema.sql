create table if not exists users (
  id text primary key,
  type text not null check (type in ('guest', 'email')),
  display_name text,
  email text,
  created_at text not null,
  updated_at text not null
);

create table if not exists sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at text not null,
  revoked_at text,
  created_at text not null
);

create index if not exists idx_sessions_user_id on sessions(user_id);
create index if not exists idx_sessions_expires_at on sessions(expires_at);
