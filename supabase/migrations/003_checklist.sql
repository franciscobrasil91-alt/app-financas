-- Migration 003: tabela de checklist mensal
-- Execute no SQL Editor do Supabase

create table if not exists public.checklist_mensal (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  mes_referencia  int not null,
  tipo            text not null check (tipo in ('cartao', 'despesa', 'receita')),
  referencia_id   uuid not null,
  concluido       boolean default false not null,
  created_at      timestamptz default now(),
  unique(user_id, mes_referencia, tipo, referencia_id)
);

alter table public.checklist_mensal enable row level security;

create policy "Usuário acessa seu próprio checklist"
  on public.checklist_mensal for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_checklist_mes
  on public.checklist_mensal (user_id, mes_referencia);
