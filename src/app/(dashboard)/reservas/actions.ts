'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getAplicacoes() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('aplicacoes')
    .select(`
      *,
      valores:aportes_valores(mes_referencia, valor)
    `)
    .eq('user_id', user.id)
    .order('nome')

  return data ?? []
}

export async function criarAplicacao(formData: {
  nome: string
  tipo: string
  taxa_anual: number
  tributacao: string
  saldo_atual: number
  data_inicio?: string
  ativa: boolean
  valores: Record<number, number>
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: aplicacao, error } = await supabase
    .from('aplicacoes')
    .insert({
      user_id: user.id,
      nome: formData.nome,
      tipo: formData.tipo,
      taxa_anual: formData.taxa_anual,
      tributacao: formData.tributacao,
      saldo_atual: formData.saldo_atual,
      data_inicio: formData.data_inicio || null,
      ativa: formData.ativa,
    })
    .select()
    .single()

  if (error || !aplicacao) return { error: error?.message ?? 'Erro' }

  const valoresRows = Object.entries(formData.valores)
    .filter(([, v]) => v > 0)
    .map(([mesRef, valor]) => ({
      aplicacao_id: aplicacao.id,
      user_id: user.id,
      mes_referencia: parseInt(mesRef),
      valor,
    }))

  if (valoresRows.length > 0) {
    await supabase.from('aportes_valores').insert(valoresRows)
  }

  revalidatePath('/reservas')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function atualizarAplicacao(id: string, formData: {
  nome: string
  tipo: string
  taxa_anual: number
  tributacao: string
  saldo_atual: number
  data_inicio?: string
  ativa: boolean
  valores: Record<number, number>
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('aplicacoes')
    .update({
      nome: formData.nome,
      tipo: formData.tipo,
      taxa_anual: formData.taxa_anual,
      tributacao: formData.tributacao,
      saldo_atual: formData.saldo_atual,
      data_inicio: formData.data_inicio || null,
      ativa: formData.ativa,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  const valoresRows = Object.entries(formData.valores).map(([mesRef, valor]) => ({
    aplicacao_id: id,
    user_id: user.id,
    mes_referencia: parseInt(mesRef),
    valor: valor || 0,
  }))

  if (valoresRows.length > 0) {
    await supabase
      .from('aportes_valores')
      .upsert(valoresRows, { onConflict: 'aplicacao_id,mes_referencia' })
  }

  revalidatePath('/reservas')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deletarAplicacao(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  await supabase.from('aplicacoes').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/reservas')
  revalidatePath('/dashboard')
  return { success: true }
}
