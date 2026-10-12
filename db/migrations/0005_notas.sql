-- Notas da campanha. Só o mestre vê (checado nas rotas).
create table note (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null check (char_length(titulo) between 1 and 120),
  texto      text not null default '' check (char_length(texto) <= 50000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index note_atualizada on note (updated_at desc);
