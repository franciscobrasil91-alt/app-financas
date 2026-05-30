alter table public.saldo_inicial_mes
  add column if not exists saldo_hoje numeric(12,2);
