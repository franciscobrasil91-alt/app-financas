'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCartoes() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('cartoes_credito')
    .select('*')
    .eq('user_id', user.id)
    .order('nome')
  return data ?? []
}

export async function criarCartao(formData: {
  nome: string; banco?: string; dia_fechamento: number
  dia_vencimento: number; limite: number; ativa: boolean
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }
  const { error } = await supabase.from('cartoes_credito').insert({ user_id: user.id, ...formData })
  if (error) return { error: error.message }
  revalidatePath('/cadastros/cartoes')
  return { success: true }
}

export async function atualizarCartao(id: string, formData: {
  nome: string; banco?: string; dia_fechamento: number
  dia_vencimento: number; limite: number; ativa: boolean
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }
  const { error } = await supabase.from('cartoes_credito').update(formData).eq('id', id).eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/cadastros/cartoes')
  return { success: true }
}

export async function deletarCartao(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }
  await supabase.from('cartoes_credito').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/cadastros/cartoes')
  return { success: true }
}
