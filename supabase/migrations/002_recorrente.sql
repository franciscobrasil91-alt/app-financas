-- Migration 002: adiciona suporte a lançamentos recorrentes no cartão
-- Execute no SQL Editor do Supabase

alter table public.lancamentos_cartao
  add column if not exists recorrente boolean default false;

-- Índice para buscar facilmente lançamentos recorrentes
create index if not exists idx_lancamentos_recorrente
  on public.lancamentos_cartao (user_id, recorrente)
  where recorrente = true;
