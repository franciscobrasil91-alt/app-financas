'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCategorias() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('categorias')
    .select('*')
    .eq('user_id', user.id)
    .order('tipo')
    .order('nome')
  return data ?? []
}

export async function criarCategoria(formData: {
  nome: string; tipo: string; cor: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }
  const { error } = await supabase.from('categorias').insert({ user_id: user.id, ...formData })
  if (error) return { error: error.message }
  revalidatePath('/cadastros/categorias')
  return { success: true }
}

export async function atualizarCategoria(id: string, formData: {
  nome: string; tipo: string; cor: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }
  const { error } = await supabase.from('categorias').update(formData).eq('id', id).eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/cadastros/categorias')
  return { success: true }
}

export async function deletarCategoria(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }
  await supabase.from('categorias').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/cadastros/categorias')
  return { success: true }
}

export async function criarCategoriasPadrao() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const defaults = [
    { nome: 'Alimentação', tipo: 'despesa', cor: '#f97316' },
    { nome: 'Transporte', tipo: 'despesa', cor: '#3b82f6' },
    { nome: 'Saúde', tipo: 'despesa', cor: '#ef4444' },
    { nome: 'Educação', tipo: 'despesa', cor: '#8b5cf6' },
    { nome: 'Lazer', tipo: 'despesa', cor: '#ec4899' },
    { nome: 'Casa', tipo: 'despesa', cor: '#14b8a6' },
    { nome: 'Roupas', tipo: 'despesa', cor: '#f59e0b' },
    { nome: 'Assinaturas', tipo: 'cartao', cor: '#6366f1' },
    { nome: 'Eletrônicos', tipo: 'cartao', cor: '#0ea5e9' },
    { nome: 'Restaurantes', tipo: 'cartao', cor: '#f97316' },
    { nome: 'Supermercado', tipo: 'cartao', cor: '#22c55e' },
    { nome: 'Salário', tipo: 'receita', cor: '#22c55e' },
    { nome: 'Freelance', tipo: 'receita', cor: '#10b981' },
  ].map((c) => ({ ...c, user_id: user.id }))

  const { error } = await supabase.from('categorias').insert(defaults)
  if (error) return { error: error.message }

  revalidatePath('/cadastros/categorias')
  return { success: true }
}
