-- Tabela de e-mails autorizados a criar conta
create table if not exists public.usuarios_permitidos (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  nome       text,
  created_at timestamptz default now()
);

alter table public.usuarios_permitidos enable row level security;

-- Qualquer um pode verificar se seu e-mail está na lista (necessário para o cadastro)
create policy "leitura_publica" on public.usuarios_permitidos
  for select using (true);

-- Apenas o service_role (você via Supabase dashboard) pode inserir/alterar/excluir
create policy "apenas_admin_escreve" on public.usuarios_permitidos
  for all using (false);
