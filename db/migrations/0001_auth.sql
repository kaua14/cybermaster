-- Senha do mestre: no máximo uma linha (id = 1). Só o papel administrativo escreve aqui.
create table master_credential (
  id            smallint primary key check (id = 1),
  password_hash text not null,
  updated_at    timestamptz not null default now()
);

create table player (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 40),
  password_hash text,
  created_at    timestamptz not null default now()
);
create unique index player_name_unico on player (lower(name));

-- Guarda só o hash do código de convite.
create table invite (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references player(id) on delete cascade,
  code_hash  text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz
);
create index invite_player on invite (player_id);

-- Guarda só o hash do token de sessão.
create table session (
  token_hash text primary key,
  kind       text not null check (kind in ('master', 'player')),
  player_id  uuid references player(id) on delete cascade,
  csrf_token text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check ((kind = 'master') = (player_id is null))
);
create index session_player on session (player_id);
create index session_expira on session (expires_at);

create table login_throttle (
  key             text primary key,
  failures        integer not null default 0,
  next_allowed_at timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
