'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { addMonthsToRef, mesReferenciaLabelCurto } from '@/lib/utils'
import type { DashboardSummary, ProjecaoMes } from '@/lib/types'

export async function getDashboardData(mesRef: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Tudo em paralelo — join direto via !inner elimina as 3 queries de IDs
  const [
    { data: receitasValores },
    { data: despesasValores },
    { data: lancamentosCartao },
    { data: aportesValores },
    { data: saldoBancario },
  ] = await Promise.all([
    supabase
      .from('receitas_valores')
      .select('valor, receita:receitas!inner(ativa)')
      .eq('user_id', user.id)
      .eq('mes_referencia', mesRef)
      .eq('receitas.ativa', true),
    supabase
      .from('despesas_valores')
      .select('valor, despesa:despesas!inner(ativa)')
      .eq('user_id', user.id)
      .eq('mes_referencia', mesRef)
      .eq('despesas.ativa', true),
    supabase
      .from('lancamentos_cartao')
      .select('valor_parcela')
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
  ])

  const totalReceitas = (receitasValores ?? []).reduce((s, r) => s + Number(r.valor), 0)
  const totalDespesas = (despesasValores ?? []).reduce((s, d) => s + Number(d.valor), 0)
  const totalCartao = (lancamentosCartao ?? []).reduce((s, l) => s + Number(l.valor_parcela), 0)
  const totalReservas = (aportesValores ?? []).reduce((s, a) => s + Number(a.valor), 0)

  const summary: DashboardSummary = {
    totalReceitas,
    totalDespesas,
    totalCartao,
    totalReservas,
    saldoPrevisto: totalReceitas - totalDespesas - totalCartao - totalReservas,
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
