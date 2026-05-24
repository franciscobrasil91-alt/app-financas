'use server'
import { createClient } from '@/lib/supabase/server'

export async function cadastrarUsuario(data: {
  nome: string
  email: string
  senha: string
}) {
  const supabase = createClient()

  // Verifica se o e-mail está na lista de permitidos
  const { data: permitido } = await supabase
    .from('usuarios_permitidos')
    .select('email')
    .eq('email', data.email.toLowerCase().trim())
    .maybeSingle()

  if (!permitido) {
    return { error: 'Este e-mail não está autorizado. Entre em contato com o administrador.' }
  }

  // Cria a conta
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
