-- Migra categorias do tipo 'cartao' para 'despesa' (agora chamado de "Gasto" na UI)
update public.categorias set tipo = 'despesa' where tipo = 'cartao';

-- Remove 'cartao' do constraint de tipo
alter table public.categorias
  drop constraint if exists categorias_tipo_check;

alter table public.categorias
  add constraint categorias_tipo_check
  check (tipo in ('despesa', 'receita'));
