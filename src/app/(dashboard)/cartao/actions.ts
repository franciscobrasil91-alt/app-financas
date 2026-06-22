'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calcMesReferenciaCartao } from '@/lib/utils'
import { parseISO } from 'date-fns'

export async function getLancamentos(mesRef: number, cartaoId?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('lancamentos_cartao')
    .select(`
      *,
      cartao:cartoes_credito(id, nome, banco),
      categoria:categorias(id, nome, cor)
    `)
    .eq('user_id', user.id)
    .eq('mes_referencia', mesRef)
    .order('data_compra', { ascending: false })

  if (cartaoId) query = query.eq('cartao_id', cartaoId)

  const { data } = await query
  return data ?? []
}

export async function criarLancamento(formData: {
  descricao: string
  cartao_id: string
  categoria_id?: string
  data_compra: string
  valor_total: number
  numero_parcelas: number
  recorrente?: boolean
  meses_recorrencia?: number // quantos meses gerar (para recorrentes)
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: cartao } = await supabase
    .from('cartoes_credito')
    .select('dia_fechamento')
    .eq('id', formData.cartao_id)
    .eq('user_id', user.id)
    .single()

  if (!cartao) return { error: 'Cartão não encontrado' }

  const dataCompra = parseISO(formData.data_compra)
  const grupoId = crypto.randomUUID()

  let lancamentos: any[]

  if (formData.recorrente) {
    // Gera N meses de cobrança recorrente (mesmo valor todo mês)
    const qtd = formData.meses_recorrencia ?? 24
    lancamentos = Array.from({ length: qtd }, (_, i) => ({
      user_id: user.id,
      cartao_id: formData.cartao_id,
      categoria_id: formData.categoria_id || null,
      descricao: formData.descricao,
      data_compra: formData.data_compra,
      valor_total: formData.valor_total,
      valor_parcela: formData.valor_total,
      numero_parcelas: qtd,
      parcela_atual: i + 1,
      mes_referencia: calcMesReferenciaCartao(dataCompra, cartao.dia_fechamento, i + 1),
      grupo_id: grupoId,
      recorrente: true,
    }))
  } else {
    // Compra parcelada normal
    const valorParcela = formData.valor_total / formData.numero_parcelas
    lancamentos = Array.from({ length: formData.numero_parcelas }, (_, i) => ({
      user_id: user.id,
      cartao_id: formData.cartao_id,
      categoria_id: formData.categoria_id || null,
      descricao: formData.numero_parcelas > 1
        ? `${formData.descricao} (${i + 1}/${formData.numero_parcelas})`
        : formData.descricao,
      data_compra: formData.data_compra,
      valor_total: formData.valor_total,
      valor_parcela: parseFloat(valorParcela.toFixed(2)),
      numero_parcelas: formData.numero_parcelas,
      parcela_atual: i + 1,
      mes_referencia: calcMesReferenciaCartao(dataCompra, cartao.dia_fechamento, i + 1),
      grupo_id: grupoId,
      recorrente: false,
    }))
  }

  const { error } = await supabase.from('lancamentos_cartao').insert(lancamentos)
  if (error) return { error: error.message }

  revalidatePath('/cartao')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deletarLancamento(id: string, deletarGrupo = false) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  if (deletarGrupo) {
    // Busca o grupo_id
    const { data: lancamento } = await supabase
      .from('lancamentos_cartao')
      .select('grupo_id')
      .eq('id', id)
      .single()

    if (lancamento?.grupo_id) {
      await supabase
        .from('lancamentos_cartao')
        .delete()
        .eq('grupo_id', lancamento.grupo_id)
        .eq('user_id', user.id)
    }
  } else {
    await supabase
      .from('lancamentos_cartao')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
  }

  revalidatePath('/cartao')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function getLancamentosMultiplosMeses(mesesRef: number[]) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('lancamentos_cartao')
    .select(`
      *,
      cartao:cartoes_credito(id, nome),
      categoria:categorias(id, nome)
    `)
    .eq('user_id', user.id)
    .in('mes_referencia', mesesRef)
    .order('mes_referencia', { ascending: true })
    .order('data_compra', { ascending: true })

  return data ?? []
}

export async function criarLancamentosLote(dados: {
  cartao_id: string
  data_compra: string
  itens: { descricao: string; valor: number; categoria_id?: string }[]
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: cartao } = await supabase
    .from('cartoes_credito')
    .select('dia_fechamento')
    .eq('id', dados.cartao_id)
    .eq('user_id', user.id)
    .single()

  if (!cartao) return { error: 'Cartão não encontrado' }

  const dataCompra = parseISO(dados.data_compra)
  const mesRef = calcMesReferenciaCartao(dataCompra, cartao.dia_fechamento, 1)

  const rows = dados.itens.map((item) => ({
    user_id: user.id,
    cartao_id: dados.cartao_id,
    categoria_id: item.categoria_id || null,
    descricao: item.descricao,
    data_compra: dados.data_compra,
    valor_total: item.valor,
    valor_parcela: item.valor,
    numero_parcelas: 1,
    parcela_atual: 1,
    mes_referencia: mesRef,
    grupo_id: crypto.randomUUID(),
    recorrente: false,
  }))

  const { error } = await supabase.from('lancamentos_cartao').insert(rows)
  if (error) return { error: error.message }

  revalidatePath('/cartao')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function atualizarLancamento(
  id: string,
  formData: {
    descricao: string
    categoria_id?: string
    valor_parcela: number
    data_compra: string
  },
  atualizarGrupo = false
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  if (atualizarGrupo) {
    const { data: lancamento } = await supabase
      .from('lancamentos_cartao')
      .select('grupo_id, valor_parcela')
      .eq('id', id)
      .single()

    if (lancamento?.grupo_id) {
      await supabase
        .from('lancamentos_cartao')
        .update({
          descricao: formData.descricao,
          categoria_id: formData.categoria_id || null,
          valor_parcela: formData.valor_parcela,
          data_compra: formData.data_compra,
        })
        .eq('grupo_id', lancamento.grupo_id)
        .eq('user_id', user.id)
    }
  } else {
    await supabase
      .from('lancamentos_cartao')
      .update({
        descricao: formData.descricao,
        categoria_id: formData.categoria_id || null,
        valor_parcela: formData.valor_parcela,
        data_compra: formData.data_compra,
      })
      .eq('id', id)
      .eq('user_id', user.id)
  }

  revalidatePath('/cartao')
  revalidatePath('/dashboard')
  return { success: true }
}

// Cancela uma assinatura recorrente a partir de um mês: apaga o mês atual e todos os futuros,
// preservando o histórico dos meses anteriores
export async function cancelarRecorrencia(id: string, mesRefInicio: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: lancamento } = await supabase
    .from('lancamentos_cartao')
    .select('grupo_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!lancamento?.grupo_id) return { error: 'Lançamento não encontrado' }

  const { error } = await supabase
    .from('lancamentos_cartao')
    .delete()
    .eq('grupo_id', lancamento.grupo_id)
    .eq('user_id', user.id)
    .gte('mes_referencia', mesRefInicio)

  if (error) return { error: error.message }

  revalidatePath('/cartao')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function getCartoes() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('cartoes_credito')
    .select('*')
    .eq('user_id', user.id)
    .eq('ativa', true)
    .order('nome')

  return data ?? []
}

export async function getCategorias(tipo?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('categorias')
    .select('*')
    .eq('user_id', user.id)
    .order('nome')

  if (tipo) query = query.eq('tipo', tipo)

  const { data } = await query
  return data ?? []
}
