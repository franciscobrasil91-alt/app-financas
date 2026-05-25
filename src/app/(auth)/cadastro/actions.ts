'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function cadastrarUsuario(data: {
  nome: string
  email: string
  senha: string
}) {
  const email = data.email.toLowerCase().trim()

  // Usa o client admin para garantir que o RLS não bloqueie a verificação
  const admin = createAdminClient()
  const { data: permitido } = await admin
    .from('usuarios_permitidos')
    .select('email')
    .eq('email', email)
    .maybeSingle()

  if (!permitido) {
    return { error: 'Este e-mail não está autorizado. Entre em contato com o administrador.' }
  }

  // Usa o client admin para criar o usuário mesmo com signups desativados
  const { error } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.senha,
    user_metadata: { nome: data.nome },
    email_confirm: true, // e-mail já foi validado pela whitelist, não precisa de confirmação
  })

  if (error) {
    if (error.message.includes('already registered') || error.message.includes('already exists')) {
      return { error: 'Este e-mail já possui uma conta cadastrada.' }
    }
    return { error: error.message }
  }
  return { success: true }
}
