-- Registra quanto foi pago quando o pagamento é parcial
-- concluido = true → pago integralmente (valor_pago fica NULL)
-- concluido = false + valor_pago > 0 → pago parcialmente
alter table public.checklist_mensal
  add column if not exists valor_pago numeric(12,2);
