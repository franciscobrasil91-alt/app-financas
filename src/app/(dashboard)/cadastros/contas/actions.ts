'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getContas() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('contas_bancarias')
    .select('*')
    .eq('user_id', user.id)
    .order('nome')
  return data ?? []
}

export async function criarConta(formData: {
  nome: string; banco?: string; tipo: string; ativa: boolean
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }
  const { error } = await supabase.from('contas_bancarias').insert({ user_id: user.id, ...formData })
  if (error) return { error: error.message }
  revalidatePath('/cadastros/contas')
  return { success: true }
}

export async function atualizarConta(id: string, formData: {
  nome: string; banco?: string; tipo: string; ativa: boolean
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }
  const { error } = await supabase.from('contas_bancarias').update(formData).eq('id', id).eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/cadastros/contas')
  return { success: true }
}

export async function deletarConta(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }
  await supabase.from('contas_bancarias').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/cadastros/contas')
  return { success: true }
}
