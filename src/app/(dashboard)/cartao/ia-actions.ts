'use server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calcMesReferenciaCartao } from '@/lib/utils'
import { parseISO } from 'date-fns'

export interface LancamentoIA {
  descricao: string
  valor: number
  data: string          // YYYY-MM-DD
  categoria_sugerida: string
}

export async function analisarExtratoIA(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
): Promise<{ lancamentos?: LancamentoIA[]; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'sua_chave_aqui') {
    return { error: 'Chave da API Anthropic não configurada. Adicione ANTHROPIC_API_KEY no .env.local' }
  }

  try {
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: imageBase64 },
            },
            {
              type: 'text',
              text: `Analise esta imagem de extrato ou fatura de cartão de crédito.
Extraia TODAS as transações visíveis e retorne um JSON válido no seguinte formato:

{
  "lancamentos": [
    {
      "descricao": "Nome limpo do estabelecimento (sem códigos, sem cidade duplicada)",
      "valor": 99.90,
      "data": "2026-05-23",
      "categoria_sugerida": "Restaurante"
    }
  ]
}

Regras:
- valor: sempre número positivo em reais (ex: 22.00, não "-R$ 22,00")
- data: formato YYYY-MM-DD. Se o ano não aparecer, use ${new Date().getFullYear()}
- categoria_sugerida: escolha a mais adequada entre: Restaurante, Transporte, Supermercado, Saúde, Drogaria, Entretenimento, Educação, Vestuário, Outros
- descricao: limpe o nome, remova códigos numéricos iniciais, mantenha o nome do estabelecimento legível
- Retorne APENAS o JSON, sem explicações.`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extrai o JSON da resposta
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { error: 'Não foi possível extrair os dados da imagem.' }

    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed.lancamentos)) return { error: 'Formato de resposta inválido.' }

    return { lancamentos: parsed.lancamentos }
  } catch (err: any) {
    console.error('Erro IA:', err)
    return { error: err.message ?? 'Erro ao chamar a IA.' }
  }
}

export async function salvarLancamentosIA(lancamentos: {
  descricao: string
  valor: number
  data: string
  cartao_id: string
  categoria_id?: string
}[]) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Busca dia_fechamento de cada cartão único
  const cartaoIds = [...new Set(lancamentos.map((l) => l.cartao_id))]
  const { data: cartoes } = await supabase
    .from('cartoes_credito')
    .select('id, dia_fechamento')
    .in('id', cartaoIds)
    .eq('user_id', user.id)

  const diaFechMap = Object.fromEntries((cartoes ?? []).map((c) => [c.id, c.dia_fechamento]))

  const rows = lancamentos.map((l) => {
    const dataCompra = parseISO(l.data)
    const diaFech = diaFechMap[l.cartao_id] ?? 1
    return {
      user_id: user.id,
      cartao_id: l.cartao_id,
      categoria_id: l.categoria_id || null,
      descricao: l.descricao,
      data_compra: l.data,
      valor_total: l.valor,
      valor_parcela: l.valor,
      numero_parcelas: 1,
      parcela_atual: 1,
      mes_referencia: calcMesReferenciaCartao(dataCompra, diaFech, 1),
      grupo_id: crypto.randomUUID(),
      recorrente: false,
    }
  })

  const { error } = await supabase.from('lancamentos_cartao').insert(rows)
  if (error) return { error: error.message }

  revalidatePath('/cartao')
  revalidatePath('/dashboard')
  return { success: true }
}
