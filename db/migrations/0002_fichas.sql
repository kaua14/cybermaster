-- Senha temporária definida pelo mestre: vale por pouco tempo e obriga a troca no primeiro login.
alter table player
  add column must_change_password boolean not null default false,
  add column password_expires_at  timestamptz;

create table character (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references player(id) on delete cascade,
  version            integer not null default 1,
  nome               text not null check (char_length(nome) between 1 and 60),
  classe             text not null,
  dados              jsonb not null,               -- validado por zod na aplicação
  dano               smallint not null default 0 check (dano between 0 and 40),
  criacao_concluida  boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index character_owner on character (owner_id);

create table character_log (
  id            bigserial primary key,
  character_id  uuid not null references character(id) on delete cascade,
  autor         text not null,
  tipo          text not null,
  descricao     text not null,
  custo_pe      integer,
  created_at    timestamptz not null default now()
);
create index character_log_ficha on character_log (character_id, created_at desc);
