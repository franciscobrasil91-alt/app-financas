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

  // Cria a conta via client normal
  const supabase = createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.senha,
    options: {
      data: { nome: data.nome },
      emailRedirectTo: `${siteUrl}/api/auth/callback`,
    },
  })

  if (error) return { error: error.message }
  return { success: true }
}
