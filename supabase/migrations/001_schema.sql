-- =============================================================
-- APP DE FINANÇAS PESSOAIS — Schema completo com RLS
-- Execute no SQL Editor do Supabase
-- =============================================================

-- ── Extensões ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Profiles ───────────────────────────────────────────────
create table public.profiles (
  id        uuid references auth.users on delete cascade primary key,
  email     text not null,
  nome      text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Usuário vê apenas o próprio perfil"
  on public.profiles for all
  using (auth.uid() = id);

-- Cria perfil automaticamente ao cadastrar usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, nome)
  values (new.id, new.email, new.raw_user_meta_data->>'nome');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Contas bancárias ───────────────────────────────────────
create table public.contas_bancarias (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  nome    text not null,
  banco   text,
  tipo    text check (tipo in ('corrente','poupanca','digital')) default 'corrente',
  ativa   boolean default true,
  created_at timestamptz default now()
);

alter table public.contas_bancarias enable row level security;

create policy "Usuário gerencia próprias contas"
  on public.contas_bancarias for all
  using (auth.uid() = user_id);

-- ── Cartões de crédito ─────────────────────────────────────
create table public.cartoes_credito (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.profiles(id) on delete cascade not null,
  nome             text not null,
  banco            text,
  dia_fechamento   integer not null check (dia_fechamento between 1 and 31),
  dia_vencimento   integer not null check (dia_vencimento between 1 and 31),
  limite           numeric(12,2) default 0,
  ativa            boolean default true,
  created_at       timestamptz default now()
);

alter table public.cartoes_credito enable row level security;

create policy "Usuário gerencia próprios cartões"
  on public.cartoes_credito for all
  using (auth.uid() = user_id);

-- ── Categorias ─────────────────────────────────────────────
create table public.categorias (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  nome    text not null,
  tipo    text check (tipo in ('despesa','receita','cartao')) default 'despesa',
  cor     text default '#6366f1',
  created_at timestamptz default now()
);

alter table public.categorias enable row level security;

create policy "Usuário gerencia próprias categorias"
  on public.categorias for all
  using (auth.uid() = user_id);

-- ── Lançamentos de cartão ──────────────────────────────────
-- Cada parcela é uma linha; compras à vista = 1 parcela
create table public.lancamentos_cartao (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.profiles(id) on delete cascade not null,
  cartao_id        uuid references public.cartoes_credito(id) on delete cascade not null,
  categoria_id     uuid references public.categorias(id) on delete set null,
  descricao        text not null,
  data_compra      date not null,
  valor_total      numeric(12,2) not null,
  valor_parcela    numeric(12,2) not null,
  numero_parcelas  integer not null default 1,
  parcela_atual    integer not null default 1,
  mes_referencia   integer not null, -- YYYYMM: mês em que a parcela vai aparecer na fatura
  grupo_id         uuid,             -- agrupa todas as parcelas de uma mesma compra
  created_at       timestamptz default now()
);

alter table public.lancamentos_cartao enable row level security;

create policy "Usuário gerencia próprios lançamentos"
  on public.lancamentos_cartao for all
  using (auth.uid() = user_id);

create index on public.lancamentos_cartao (user_id, mes_referencia);
create index on public.lancamentos_cartao (grupo_id);

-- ── Despesas previstas ─────────────────────────────────────
create table public.despesas (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete cascade not null,
  descricao      text not null,
  tipo           text check (tipo in ('fixa','estimada','sazonal')) default 'fixa',
  categoria_id   uuid references public.categorias(id) on delete set null,
  dia_vencimento integer check (dia_vencimento between 1 and 31),
  conta_id       uuid references public.contas_bancarias(id) on delete set null,
  cartao_id      uuid references public.cartoes_credito(id) on delete set null,
  ativa          boolean default true,
  created_at     timestamptz default now()
);

alter table public.despesas enable row level security;

create policy "Usuário gerencia próprias despesas"
  on public.despesas for all
  using (auth.uid() = user_id);

-- Grade de valores mensais (24 meses) por despesa
create table public.despesas_valores (
  id             uuid primary key default gen_random_uuid(),
  despesa_id     uuid references public.despesas(id) on delete cascade not null,
  user_id        uuid references public.profiles(id) on delete cascade not null,
  mes_referencia integer not null, -- YYYYMM
  valor          numeric(12,2) not null default 0,
  unique (despesa_id, mes_referencia)
);

alter table public.despesas_valores enable row level security;

create policy "Usuário gerencia próprios valores de despesa"
  on public.despesas_valores for all
  using (auth.uid() = user_id);

-- ── Receitas ───────────────────────────────────────────────
create table public.receitas (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references public.profiles(id) on delete cascade not null,
  descricao text not null,
  tipo      text check (tipo in ('recorrente','pontual')) default 'recorrente',
  conta_id  uuid references public.contas_bancarias(id) on delete set null,
  ativa     boolean default true,
  created_at timestamptz default now()
);

alter table public.receitas enable row level security;

create policy "Usuário gerencia próprias receitas"
  on public.receitas for all
  using (auth.uid() = user_id);

-- Grade de valores mensais por receita
create table public.receitas_valores (
  id             uuid primary key default gen_random_uuid(),
  receita_id     uuid references public.receitas(id) on delete cascade not null,
  user_id        uuid references public.profiles(id) on delete cascade not null,
  mes_referencia integer not null, -- YYYYMM
  valor          numeric(12,2) not null default 0,
  unique (receita_id, mes_referencia)
);

alter table public.receitas_valores enable row level security;

create policy "Usuário gerencia próprios valores de receita"
  on public.receitas_valores for all
  using (auth.uid() = user_id);

-- ── Aplicações / Reservas ──────────────────────────────────
create table public.aplicacoes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade not null,
  nome        text not null,
  tipo        text check (tipo in ('poupanca','cdb_rdb','tesouro_direto','fundos','acoes')) default 'cdb_rdb',
  taxa_anual  numeric(8,4) default 0,   -- % ao ano
  tributacao  text check (tributacao in ('isento','regressivo')) default 'regressivo',
  saldo_atual numeric(14,2) default 0,
  data_inicio date,
  ativa       boolean default true,
  created_at  timestamptz default now()
);

alter table public.aplicacoes enable row level security;

create policy "Usuário gerencia próprias aplicações"
  on public.aplicacoes for all
  using (auth.uid() = user_id);

-- Grade de aportes mensais por aplicação
create table public.aportes_valores (
  id             uuid primary key default gen_random_uuid(),
  aplicacao_id   uuid references public.aplicacoes(id) on delete cascade not null,
  user_id        uuid references public.profiles(id) on delete cascade not null,
  mes_referencia integer not null, -- YYYYMM
  valor          numeric(12,2) not null default 0,
  unique (aplicacao_id, mes_referencia)
);

alter table public.aportes_valores enable row level security;

create policy "Usuário gerencia próprios aportes"
  on public.aportes_valores for all
  using (auth.uid() = user_id);

-- ── Saldo bancário mensal ──────────────────────────────────
create table public.saldos_bancarios (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete cascade not null,
  mes_referencia integer not null, -- YYYYMM
  saldo          numeric(14,2) not null default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique (user_id, mes_referencia)
);

alter table public.saldos_bancarios enable row level security;

create policy "Usuário gerencia próprios saldos"
  on public.saldos_bancarios for all
  using (auth.uid() = user_id);

-- ── Dados iniciais (categorias padrão via função) ──────────
-- Execute após criar um usuário ou use na tela de cadastro:
-- insert into public.categorias (user_id, nome, tipo, cor) values (auth.uid(), 'Alimentação', 'despesa', '#f97316'), ...

-- Exemplo de seed SQL para testar (substitua USER_ID pelo seu UUID):
-- insert into public.contas_bancarias (user_id, nome, banco, tipo) values
--   ('USER_ID', 'Conta Corrente', 'Nubank', 'digital'),
--   ('USER_ID', 'Poupança', 'Caixa', 'poupanca');
