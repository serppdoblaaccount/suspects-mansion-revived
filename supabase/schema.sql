-- Ejecuta este archivo en Supabase > SQL Editor.
create table if not exists public.players (
  id text primary key,
  nickname text not null unique,
  salt text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  banned boolean not null default false,
  is_admin boolean not null default false
);
create unique index if not exists players_nickname_lower_unique on public.players (lower(nickname));
alter table public.players enable row level security;
-- No se crean políticas públicas. Solo las funciones serverless usan la service role key.
