'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { gerarGradeMeses, dateToMesRef } from '@/lib/utils'

export async function getDespesas() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('despesas')
    .select(`
      *,
      categoria:categorias(id, nome, cor),
      conta:contas_bancarias(id, nome),
      cartao:cartoes_credito(id, nome),
      valores:despesas_valores(mes_referencia, valor)
    `)
    .eq('user_id', user.id)
    .order('descricao')

  return data ?? []
}

export async function criarDespesa(formData: {
  descricao: string
  tipo: string
  categoria_id?: string
  dia_vencimento?: number
  conta_id?: string
  cartao_id?: string
  ativa: boolean
  valores: Record<number, number> // mesRef → valor
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: despesa, error } = await supabase
    .from('despesas')
    .insert({
      user_id: user.id,
      descricao: formData.descricao,
      tipo: formData.tipo,
      categoria_id: formData.categoria_id || null,
      dia_vencimento: formData.dia_vencimento || null,
      conta_id: formData.conta_id || null,
      cartao_id: formData.cartao_id || null,
      ativa: formData.ativa,
    })
    .select()
    .single()

  if (error || !despesa) return { error: error?.message ?? 'Erro desconhecido' }

  // Insere valores mensais
  const valoresRows = Object.entries(formData.valores)
    .filter(([, v]) => v > 0)
    .map(([mesRef, valor]) => ({
      despesa_id: despesa.id,
      user_id: user.id,
      mes_referencia: parseInt(mesRef),
      valor,
    }))

  if (valoresRows.length > 0) {
    await supabase.from('despesas_valores').insert(valoresRows)
  }

  revalidatePath('/despesas')
  revalidatePath('/dashboard')
  return { success: true, id: despesa.id }
}

export async function atualizarDespesa(id: string, formData: {
  descricao: string
  tipo: string
  categoria_id?: string
  dia_vencimento?: number
  conta_id?: string
  cartao_id?: string
  ativa: boolean
  valores: Record<number, number>
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('despesas')
    .update({
      descricao: formData.descricao,
      tipo: formData.tipo,
      categoria_id: formData.categoria_id || null,
      dia_vencimento: formData.dia_vencimento || null,
      conta_id: formData.conta_id || null,
      cartao_id: formData.cartao_id || null,
      ativa: formData.ativa,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  // Upsert valores mensais
  const valoresRows = Object.entries(formData.valores).map(([mesRef, valor]) => ({
    despesa_id: id,
    user_id: user.id,
    mes_referencia: parseInt(mesRef),
    valor: valor || 0,
  }))

  if (valoresRows.length > 0) {
    await supabase
      .from('despesas_valores')
      .upsert(valoresRows, { onConflict: 'despesa_id,mes_referencia' })
  }

  revalidatePath('/despesas')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deletarDespesa(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  await supabase.from('despesas').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/despesas')
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

export async function getCategoriasAll() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('categorias')
    .select('*')
    .eq('user_id', user.id)
    .order('nome')

  return data ?? []
}

// ─── Auto-arquivo de pontuais expiradas ──────────────────────────────────────
export async function autoArquivarPontuais() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { arquivadas: 0 }

  const mesAtual = dateToMesRef(new Date())

  const { data: pontuais } = await supabase
    .from('despesas')
    .select('id, despesas_valores(mes_referencia, valor)')
    .eq('user_id', user.id)
    .eq('tipo', 'pontual')
    .eq('ativa', true)

  if (!pontuais?.length) return { arquivadas: 0 }

  const expiradas = (pontuais as any[])
    .filter((d) => {
      const comValor = (d.despesas_valores ?? []).filter((v: any) => Number(v.valor) > 0)
      if (!comValor.length) return false
      const ultimoMes = Math.max(...comValor.map((v: any) => v.mes_referencia))
      return ultimoMes < mesAtual
    })
    .map((d) => d.id)

  if (!expiradas.length) return { arquivadas: 0 }

  await supabase
    .from('despesas')
    .update({ ativa: false })
    .in('id', expiradas)
    .eq('user_id', user.id)

  revalidatePath('/despesas')
  revalidatePath('/dashboard')
  return { arquivadas: expiradas.length }
}

export async function getCartoesAll() {
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
