'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getReceitas() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('receitas')
    .select(`
      *,
      conta:contas_bancarias(id, nome),
      categoria:categorias(id, nome, cor),
      valores:receitas_valores(mes_referencia, valor)
    `)
    .eq('user_id', user.id)
    .order('descricao')

  return data ?? []
}

export async function criarReceita(formData: {
  descricao: string
  tipo: string
  conta_id?: string
  categoria_id?: string
  ativa: boolean
  valores: Record<number, number>
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: receita, error } = await supabase
    .from('receitas')
    .insert({
      user_id: user.id,
      descricao: formData.descricao,
      tipo: formData.tipo,
      conta_id: formData.conta_id || null,
      categoria_id: formData.categoria_id || null,
      ativa: formData.ativa,
    })
    .select()
    .single()

  if (error || !receita) return { error: error?.message ?? 'Erro' }

  const valoresRows = Object.entries(formData.valores)
    .filter(([, v]) => v > 0)
    .map(([mesRef, valor]) => ({
      receita_id: receita.id,
      user_id: user.id,
      mes_referencia: parseInt(mesRef),
      valor,
    }))

  if (valoresRows.length > 0) {
    await supabase.from('receitas_valores').insert(valoresRows)
  }

  revalidatePath('/receitas')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function atualizarReceita(id: string, formData: {
  descricao: string
  tipo: string
  conta_id?: string
  categoria_id?: string
  ativa: boolean
  valores: Record<number, number>
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('receitas')
    .update({
      descricao: formData.descricao,
      tipo: formData.tipo,
      conta_id: formData.conta_id || null,
      categoria_id: formData.categoria_id || null,
      ativa: formData.ativa,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  const valoresRows = Object.entries(formData.valores).map(([mesRef, valor]) => ({
    receita_id: id,
    user_id: user.id,
    mes_referencia: parseInt(mesRef),
    valor: valor || 0,
  }))

  if (valoresRows.length > 0) {
    await supabase
      .from('receitas_valores')
      .upsert(valoresRows, { onConflict: 'receita_id,mes_referencia' })
  }

  revalidatePath('/receitas')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deletarReceita(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  await supabase.from('receitas').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/receitas')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function getContas() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('contas_bancarias')
    .select('*')
    .eq('user_id', user.id)
    .eq('ativa', true)
    .order('nome')

  return data ?? []
}

export async function getCategorias() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('categorias')
    .select('*')
    .eq('user_id', user.id)
    .in('tipo', ['receita'])
    .order('nome')

  return data ?? []
}
