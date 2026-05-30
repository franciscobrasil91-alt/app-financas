'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { addMonthsToRef, mesReferenciaLabelCurto } from '@/lib/utils'
import type { DashboardSummary, ProjecaoMes } from '@/lib/types'

export async function getDashboardData(mesRef: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Tudo em paralelo — busca IDs junto para calcular pendentes via checklist
  const [
    { data: receitasValores },
    { data: despesasValores },
    { data: lancamentosCartao },
    { data: aportesValores },
    { data: saldoBancario },
    { data: saldoHojeRow },
    { data: checklistRaw },
  ] = await Promise.all([
    supabase
      .from('receitas_valores')
      .select('receita_id, valor, receita:receitas!inner(ativa)')
      .eq('user_id', user.id)
      .eq('mes_referencia', mesRef)
      .eq('receitas.ativa', true)
      .gt('valor', 0),
    supabase
      .from('despesas_valores')
      .select('despesa_id, valor, despesa:despesas!inner(ativa)')
      .eq('user_id', user.id)
      .eq('mes_referencia', mesRef)
      .eq('despesas.ativa', true)
      .gt('valor', 0),
    supabase
      .from('lancamentos_cartao')
      .select('cartao_id, valor_parcela')
      .eq('user_id', user.id)
      .eq('mes_referencia', mesRef),
    supabase
      .from('aportes_valores')
      .select('valor, aplicacao:aplicacoes!inner(ativa)')
      .eq('user_id', user.id)
      .eq('mes_referencia', mesRef)
      .eq('aplicacoes.ativa', true),
    supabase
      .from('saldos_bancarios')
      .select('saldo')
      .eq('user_id', user.id)
      .eq('mes_referencia', mesRef)
      .maybeSingle(),
    supabase
      .from('saldo_inicial_mes')
      .select('saldo_hoje')
      .eq('user_id', user.id)
      .eq('mes_referencia', mesRef)
      .maybeSingle(),
    supabase
      .from('checklist_mensal')
      .select('tipo, referencia_id, concluido')
      .eq('user_id', user.id)
      .eq('mes_referencia', mesRef),
  ])

  // Conjunto de itens já concluídos no checklist
  const concluidos = new Set<string>()
  for (const c of checklistRaw ?? []) {
    if (c.concluido) concluidos.add(`${c.tipo}:${c.referencia_id}`)
  }

  // Totais completos — usados nos cards secundários
  const totalReceitas = (receitasValores ?? []).reduce((s, r) => s + Number(r.valor), 0)
  const totalDespesas = (despesasValores ?? []).reduce((s, d) => s + Number(d.valor), 0)
  const totalReservas = (aportesValores ?? []).reduce((s, a) => s + Number(a.valor), 0)

  // Agrupa lancamentos por cartao_id (igual ao ChecklistSection)
  const cartaoMap = new Map<string, number>()
  for (const l of lancamentosCartao ?? []) {
    cartaoMap.set(l.cartao_id, (cartaoMap.get(l.cartao_id) ?? 0) + Number(l.valor_parcela))
  }
  const totalCartao = Array.from(cartaoMap.values()).reduce((s, v) => s + v, 0)

  // Pendentes = ainda não marcados no checklist (mesma lógica do ChecklistSection)
  const recPendente = (receitasValores ?? [])
    .filter(r => !concluidos.has(`receita:${(r as any).receita_id}`))
    .reduce((s, r) => s + Number(r.valor), 0)

  const despPendente = (despesasValores ?? [])
    .filter(d => !concluidos.has(`despesa:${(d as any).despesa_id}`))
    .reduce((s, d) => s + Number(d.valor), 0)

  const fatPendente = Array.from(cartaoMap.entries())
    .filter(([cartaoId]) => !concluidos.has(`cartao:${cartaoId}`))
    .reduce((s, [, v]) => s + v, 0)

  // Saldo Previsto = mesma fórmula do Controle Mensal: saldoAtual + recPendente - (despPendente + fatPendente)
  // Quando saldo_hoje não foi informado, usa 0 como base (igual ao checklist sem saldo preenchido)
  const saldoHoje = saldoHojeRow?.saldo_hoje != null ? Number(saldoHojeRow.saldo_hoje) : 0
  const saldoPrevisto = saldoHoje + recPendente - despPendente - fatPendente

  const summary: DashboardSummary = {
    totalReceitas,
    totalDespesas,
    totalCartao,
    totalReservas,
    saldoPrevisto,
    saldoBancario: saldoBancario?.saldo ?? null,
  }

  return summary
}

export async function getProjecao(mesInicio: number): Promise<ProjecaoMes[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const meses = Array.from({ length: 6 }, (_, i) => addMonthsToRef(mesInicio, i))

  // Todos os 6 meses em paralelo — de ~6×latência para ~1×latência
  const resultados = await Promise.all(
    meses.map(async (mes) => {
      const [{ data: rv }, { data: dv }, { data: lc }, { data: av }] = await Promise.all([
        supabase.from('receitas_valores').select('valor').eq('user_id', user.id).eq('mes_referencia', mes),
        supabase.from('despesas_valores').select('valor').eq('user_id', user.id).eq('mes_referencia', mes),
        supabase.from('lancamentos_cartao').select('valor_parcela').eq('user_id', user.id).eq('mes_referencia', mes),
        supabase.from('aportes_valores').select('valor').eq('user_id', user.id).eq('mes_referencia', mes),
      ])

      const receitas = (rv ?? []).reduce((s, r) => s + Number(r.valor), 0)
      const saidas =
        (dv ?? []).reduce((s, d) => s + Number(d.valor), 0) +
        (lc ?? []).reduce((s, l) => s + Number(l.valor_parcela), 0) +
        (av ?? []).reduce((s, a) => s + Number(a.valor), 0)

      return {
        mesLabel: mesReferenciaLabelCurto(mes),
        mes,
        receitas,
        saidas,
        saldo: receitas - saidas,
        deficit: saidas > receitas,
      }
    })
  )

  return resultados
}

export async function salvarSaldoBancario(mesRef: number, saldo: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('saldos_bancarios')
    .upsert(
      { user_id: user.id, mes_referencia: mesRef, saldo, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,mes_referencia' }
    )

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}
