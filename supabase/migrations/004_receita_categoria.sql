-- Adiciona categoria_id na tabela de receitas
alter table public.receitas
  add column if not exists categoria_id uuid references public.categorias(id) on delete set null;
