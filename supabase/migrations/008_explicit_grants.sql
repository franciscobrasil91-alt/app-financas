-- Grants explícitos para compatibilidade com a nova política do Supabase
-- (obrigatório para novos projetos a partir de Mai/2026 e todos a partir de Out/2026)

-- Permissão de uso no schema public
grant usage on schema public to authenticated;
grant usage on schema public to anon;

-- Tabelas acessadas por usuários autenticados
grant select, insert, update, delete on public.profiles             to authenticated;
grant select, insert, update, delete on public.contas_bancarias     to authenticated;
grant select, insert, update, delete on public.categorias           to authenticated;
grant select, insert, update, delete on public.despesas             to authenticated;
grant select, insert, update, delete on public.despesas_valores     to authenticated;
grant select, insert, update, delete on public.receitas             to authenticated;
grant select, insert, update, delete on public.receitas_valores     to authenticated;
grant select, insert, update, delete on public.cartoes_credito      to authenticated;
grant select, insert, update, delete on public.lancamentos_cartao   to authenticated;
grant select, insert, update, delete on public.aplicacoes           to authenticated;
grant select, insert, update, delete on public.aportes_valores      to authenticated;
grant select, insert, update, delete on public.saldos_bancarios     to authenticated;
grant select, insert, update, delete on public.checklist_mensal     to authenticated;
grant select, insert, update, delete on public.saldo_inicial_mes    to authenticated;
grant select, insert, update, delete on public.gastos_avista        to authenticated;

-- Whitelist: leitura pública (necessário para o middleware verificar antes do login)
grant select on public.usuarios_permitidos to authenticated;
grant select on public.usuarios_permitidos to anon;
