'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface FaturaCartao {
  cartao_id: string
  nome: string
  total: number
}

export interface ItemDespesa {
  id: string
  descricao: string
  valor: number
  dia_vencimento: number | null
}

export interface ItemReceita {
  id: string
  descricao: string
  valor: number
}

export interface ChecklistData {
  faturas: FaturaCartao[]
  despesas: ItemDespesa[]
  receitas: ItemReceita[]
  concluidos: Record<string, boolean>   // chave: "tipo:referencia_id"
}

export async function getChecklistData(mesRef: number): Promise<ChecklistData> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { faturas: [], despesas: [], receitas: [], concluidos: {} }

  // Todas as 4 queries em paralelo
  const [
    { data: lancamentos },
    { data: despesasRaw },
    { data: receitasRaw },
    { data: checkRaw },
  ] = await Promise.all([
    supabase
      .from('lancamentos_cartao')
      .select('cartao_id, valor_parcela, cartao:cartoes_credito(id, nome)')
      .eq('user_id', user.id)
      .eq('mes_referencia', mesRef),
    supabase
      .from('despesas')
      .select('id, descricao, dia_vencimento, despesas_valores!inner(valor, mes_referencia)')
      .eq('user_id', user.id)
      .eq('ativa', true)
      .eq('despesas_valores.mes_referencia', mesRef)
      .gt('despesas_valores.valor', 0),
    supabase
      .from('receitas')
      .select('id, descricao, receitas_valores!inner(valor, mes_referencia)')
      .eq('user_id', user.id)
      .eq('ativa', true)
      .eq('receitas_valores.mes_referencia', mesRef)
      .gt('receitas_valores.valor', 0),
    supabase
      .from('checklist_mensal')
      .select('tipo, referencia_id, concluido')
      .eq('user_id', user.id)
      .eq('mes_referencia', mesRef),
  ])

  const cartaoMap = new Map<string, FaturaCartao>()
  for (const l of lancamentos ?? []) {
    const cartao = l.cartao as any
    if (!cartao) continue
    const atual = cartaoMap.get(cartao.id)
    if (atual) {
      atual.total += Number(l.valor_parcela)
    } else {
      cartaoMap.set(cartao.id, { cartao_id: cartao.id, nome: cartao.nome, total: Number(l.valor_parcela) })
    }
  }
  const faturas = Array.from(cartaoMap.values()).filter((f) => f.total > 0)

  const despesas: ItemDespesa[] = (despesasRaw ?? []).map((d: any) => ({
    id: d.id,
    descricao: d.descricao,
    dia_vencimento: d.dia_vencimento,
    valor: Number(d.despesas_valores?.[0]?.valor ?? 0),
  }))

  const receitas: ItemReceita[] = (receitasRaw ?? []).map((r: any) => ({
    id: r.id,
    descricao: r.descricao,
    valor: Number(r.receitas_valores?.[0]?.valor ?? 0),
  }))

  const concluidos: Record<string, boolean> = {}
  for (const c of checkRaw ?? []) {
    concluidos[`${c.tipo}:${c.referencia_id}`] = c.concluido
  }

  return { faturas, despesas, receitas, concluidos }
}

export async function toggleChecklist(
  mesRef: number,
  tipo: 'cartao' | 'despesa' | 'receita',
  referenciaId: string,
  concluido: boolean
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Upsert direto — 1 query em vez de select + insert/update
  const { error } = await supabase
    .from('checklist_mensal')
    .upsert(
      { user_id: user.id, mes_referencia: mesRef, tipo, referencia_id: referenciaId, concluido },
      { onConflict: 'user_id,mes_referencia,tipo,referencia_id' }
    )

  if (error) return { error: error.message }

  revalidatePath('/checklist')
  return { success: true }
}

// ─── Saldo Inicial ────────────────────────────────────────────────────────────

export async function getSaldoInicial(mesRef: number): Promise<number | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('saldo_inicial_mes')
    .select('valor')
    .eq('user_id', user.id)
    .eq('mes_referencia', mesRef)
    .maybeSingle()

  return data?.valor ?? null
}

export async function salvarSaldoInicial(mesRef: number, valor: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('saldo_inicial_mes')
    .upsert(
      { user_id: user.id, mes_referencia: mesRef, valor, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,mes_referencia' }
    )

  if (error) return { error: error.message }
  revalidatePath('/checklist')
  return { success: true }
}

// ─── Gastos à Vista ───────────────────────────────────────────────────────────

export interface GastoAvista {
  id: string
  descricao: string
  valor: number
  data_gasto: string
  categoria_id: string | null
  categoria?: { nome: string; cor: string | null } | null
}

export async function getGastosAvista(mesRef: number): Promise<GastoAvista[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('gastos_avista')
    .select('id, descricao, valor, data_gasto, categoria_id, categoria:categorias(nome, cor)')
    .eq('user_id', user.id)
    .eq('mes_referencia', mesRef)
    .order('data_gasto', { ascending: false })
    .order('created_at', { ascending: false })

  return (data ?? []).map((g: any) => ({
    id: g.id,
    descricao: g.descricao,
    valor: Number(g.valor),
    data_gasto: g.data_gasto,
    categoria_id: g.categoria_id,
    categoria: g.categoria ?? null,
  }))
}

export async function criarGastoAvista(payload: {
  mesRef: number
  descricao: string
  valor: number
  data_gasto: string
  categoria_id?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase.from('gastos_avista').insert({
    user_id: user.id,
    mes_referencia: payload.mesRef,
    descricao: payload.descricao,
    valor: payload.valor,
    data_gasto: payload.data_gasto,
    categoria_id: payload.categoria_id ?? null,
  })

  if (error) return { error: error.message }
  revalidatePath('/checklist')
  return { success: true }
}

// ─── Criação de item pontual direto no checklist ─────────────────────────────

export async function criarDespesaPontual(mesRef: number, data: {
  descricao: string
  valor: number
  dia_vencimento?: number | null
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: despesa, error: e1 } = await supabase
    .from('despesas')
    .insert({ user_id: user.id, descricao: data.descricao, tipo: 'pontual', dia_vencimento: data.dia_vencimento ?? null, ativa: true })
    .select('id')
    .single()

  if (e1) return { error: e1.message }

  const { error: e2 } = await supabase
    .from('despesas_valores')
    .insert({ despesa_id: despesa.id, user_id: user.id, mes_referencia: mesRef, valor: data.valor })

  if (e2) return { error: e2.message }

  revalidatePath('/checklist')
  return { success: true, id: despesa.id }
}

export async function criarReceitaPontual(mesRef: number, data: {
  descricao: string
  valor: number
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: receita, error: e1 } = await supabase
    .from('receitas')
    .insert({ user_id: user.id, descricao: data.descricao, tipo: 'pontual', ativa: true })
    .select('id')
    .single()

  if (e1) return { error: e1.message }

  const { error: e2 } = await supabase
    .from('receitas_valores')
    .insert({ receita_id: receita.id, user_id: user.id, mes_referencia: mesRef, valor: data.valor })

  if (e2) return { error: e2.message }

  revalidatePath('/checklist')
  return { success: true, id: receita.id }
}

// ─── Remoção de item do mês no checklist ─────────────────────────────────────

export async function removerDespesaDoMes(id: string, mesRef: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Remove o valor deste mês
  await supabase
    .from('despesas_valores')
    .delete()
    .eq('despesa_id', id)
    .eq('mes_referencia', mesRef)

  // Remove também do checklist se estava marcado
  await supabase
    .from('checklist_mensal')
    .delete()
    .eq('user_id', user.id)
    .eq('mes_referencia', mesRef)
    .eq('tipo', 'despesa')
    .eq('referencia_id', id)

  // Se for pontual e não tiver mais valores, apaga o registro pai
  const { count } = await supabase
    .from('despesas_valores')
    .select('*', { count: 'exact', head: true })
    .eq('despesa_id', id)

  if (count === 0) {
    await supabase.from('despesas').delete().eq('id', id).eq('user_id', user.id)
  }

  revalidatePath('/checklist')
  revalidatePath('/despesas')
  return { success: true }
}

export async function removerReceitaDoMes(id: string, mesRef: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  await supabase
    .from('receitas_valores')
    .delete()
    .eq('receita_id', id)
    .eq('mes_referencia', mesRef)

  await supabase
    .from('checklist_mensal')
    .delete()
    .eq('user_id', user.id)
    .eq('mes_referencia', mesRef)
    .eq('tipo', 'receita')
    .eq('referencia_id', id)

  // Se for pontual e não tiver mais valores, apaga o registro pai
  const { count } = await supabase
    .from('receitas_valores')
    .select('*', { count: 'exact', head: true })
    .eq('receita_id', id)

  if (count === 0) {
    await supabase.from('receitas').delete().eq('id', id).eq('user_id', user.id)
  }

  revalidatePath('/checklist')
  revalidatePath('/receitas')
  return { success: true }
}

// ─── Edição inline de despesa/receita no checklist ───────────────────────────

export async function editarDespesaChecklist(
  id: string,
  mesRef: number,
  data: { descricao: string; valor: number; dia_vencimento?: number | null }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const [r1, r2] = await Promise.all([
    supabase
      .from('despesas')
      .update({ descricao: data.descricao, dia_vencimento: data.dia_vencimento ?? null })
      .eq('id', id)
      .eq('user_id', user.id),
    supabase
      .from('despesas_valores')
      .upsert(
        { despesa_id: id, user_id: user.id, mes_referencia: mesRef, valor: data.valor },
        { onConflict: 'despesa_id,mes_referencia' }
      ),
  ])

  if (r1.error) return { error: r1.error.message }
  if (r2.error) return { error: r2.error.message }

  revalidatePath('/checklist')
  revalidatePath('/despesas')
  return { success: true }
}

export async function editarReceitaChecklist(
  id: string,
  mesRef: number,
  data: { descricao: string; valor: number }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const [r1, r2] = await Promise.all([
    supabase
      .from('receitas')
      .update({ descricao: data.descricao })
      .eq('id', id)
      .eq('user_id', user.id),
    supabase
      .from('receitas_valores')
      .upsert(
        { receita_id: id, user_id: user.id, mes_referencia: mesRef, valor: data.valor },
        { onConflict: 'receita_id,mes_referencia' }
      ),
  ])

  if (r1.error) return { error: r1.error.message }
  if (r2.error) return { error: r2.error.message }

  revalidatePath('/checklist')
  revalidatePath('/receitas')
  return { success: true }
}

export async function deletarGastoAvista(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('gastos_avista')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/checklist')
  return { success: true }
}
