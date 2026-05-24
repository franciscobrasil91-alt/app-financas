'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// Verifica se o usuário logado é o admin
async function verificarAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  return user.email === process.env.ADMIN_EMAIL
}

export async function getUsuariosPermitidos() {
  if (!await verificarAdmin()) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('usuarios_permitidos')
    .select('*')
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function adicionarUsuario(formData: FormData) {
  if (!await verificarAdmin()) return { error: 'Não autorizado' }

  const email = (formData.get('email') as string)?.toLowerCase().trim()
  const nome  = (formData.get('nome')  as string)?.trim() || null

  if (!email) return { error: 'E-mail obrigatório' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('usuarios_permitidos')
    .insert({ email, nome })

  if (error) {
    if (error.code === '23505') return { error: 'Este e-mail já está na lista' }
    return { error: error.message }
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function removerUsuario(id: string) {
  if (!await verificarAdmin()) return { error: 'Não autorizado' }

  const admin = createAdminClient()
  await admin.from('usuarios_permitidos').delete().eq('id', id)

  revalidatePath('/admin')
  return { success: true }
}
