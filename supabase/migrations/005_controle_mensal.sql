-- Saldo inicial do mês (ponto de partida do caixa)
create table if not exists public.saldo_inicial_mes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  mes_referencia integer not null,
  valor          numeric(12,2) not null default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique(user_id, mes_referencia)
);

alter table public.saldo_inicial_mes enable row level security;
create policy "users own saldo_inicial_mes"
  on public.saldo_inicial_mes
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Gastos pagos à vista / débito no mês
create table if not exists public.gastos_avista (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  mes_referencia integer not null,
  descricao      text not null,
  valor          numeric(12,2) not null,
  data_gasto     date not null default current_date,
  categoria_id   uuid references public.categorias(id) on delete set null,
  created_at     timestamptz default now()
);

alter table public.gastos_avista enable row level security;
create policy "users own gastos_avista"
  on public.gastos_avista
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
