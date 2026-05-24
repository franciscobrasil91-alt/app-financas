'use server'
import { createClient } from '@/lib/supabase/server'
import {
  addMonthsToRef, dateToMesRef, gerarGradeMeses,
  mesReferenciaLabel, mesReferenciaLabelCurto,
} from '@/lib/utils'

function fmt(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function fmtData(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function linha(char = '─', n = 60) {
  return char.repeat(n)
}

export async function gerarRelatorio(): Promise<{ texto?: string; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const hoje = new Date()
  const mesAtual = dateToMesRef(hoje)
  const meses12 = gerarGradeMeses(mesAtual, 12)   // próximos 12 meses
  const meses6  = gerarGradeMeses(mesAtual, 6)    // próximos 6 meses para cartão

  // ── Busca paralela de todos os dados ─────────────────────────────────────
  const [
    { data: receitasRaw },
    { data: despesasRaw },
    { data: aplicacoesRaw },
    { data: lancamentosRaw },
    { data: rvAll },
    { data: dvAll },
    { data: lcAll },
    { data: avAll },
  ] = await Promise.all([
    supabase.from('receitas').select('*, receitas_valores(*), conta:contas_bancarias(nome)').eq('user_id', user.id).eq('ativa', true).order('descricao'),
    supabase.from('despesas').select('*, despesas_valores(*), categoria:categorias(nome), conta:contas_bancarias(nome)').eq('user_id', user.id).eq('ativa', true).order('descricao'),
    supabase.from('aplicacoes').select('*').eq('user_id', user.id).order('nome'),
    supabase.from('lancamentos_cartao').select('*, cartao:cartoes_credito(nome), categoria:categorias(nome)').eq('user_id', user.id).in('mes_referencia', meses6).order('mes_referencia').order('data_compra'),
    supabase.from('receitas_valores').select('receita_id, mes_referencia, valor').eq('user_id', user.id).in('mes_referencia', meses12),
    supabase.from('despesas_valores').select('despesa_id, mes_referencia, valor').eq('user_id', user.id).in('mes_referencia', meses12),
    supabase.from('lancamentos_cartao').select('mes_referencia, valor_parcela').eq('user_id', user.id).in('mes_referencia', meses12),
    supabase.from('aportes_valores').select('aplicacao_id, mes_referencia, valor').eq('user_id', user.id).in('mes_referencia', meses12),
  ])

  const receitas    = receitasRaw    ?? []
  const despesas    = despesasRaw    ?? []
  const aplicacoes  = aplicacoesRaw  ?? []
  const lancamentos = lancamentosRaw ?? []

  // ── Monta o relatório ─────────────────────────────────────────────────────
  const linhas: string[] = []

  const push = (...args: string[]) => linhas.push(...args)

  push(
    `# RELATÓRIO FINANCEIRO PESSOAL`,
    `Gerado em: ${hoje.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
    `Período coberto: ${mesReferenciaLabel(mesAtual)} a ${mesReferenciaLabel(meses12[meses12.length - 1])}`,
    '',
    linha(),
    '',
  )

  // ── 1. PROJEÇÃO MENSAL ────────────────────────────────────────────────────
  push(`## 1. PROJEÇÃO MENSAL (próximos 12 meses)`, '')

  const headerProj = `| ${'Mês'.padEnd(12)} | ${'Receitas'.padStart(14)} | ${'Saídas'.padStart(14)} | ${'Cartões'.padStart(14)} | ${'Saldo'.padStart(14)} |`
  const sepProj    = `|${'-'.repeat(14)}|${'-'.repeat(16)}:|${'-'.repeat(16)}:|${'-'.repeat(16)}:|${'-'.repeat(16)}:|`
  push(headerProj, sepProj)

  for (const mes of meses12) {
    const recMes = (rvAll ?? []).filter((r) => r.mes_referencia === mes).reduce((s, r) => s + Number(r.valor), 0)
    const despMes = (dvAll ?? []).filter((d) => d.mes_referencia === mes).reduce((s, d) => s + Number(d.valor), 0)
    const cartMes = (lcAll ?? []).filter((l) => l.mes_referencia === mes).reduce((s, l) => s + Number(l.valor_parcela), 0)
    const saldo = recMes - despMes - cartMes
    const saldoStr = (saldo >= 0 ? '+' : '') + fmt(saldo)
    push(`| ${mesReferenciaLabelCurto(mes).padEnd(12)} | ${fmt(recMes).padStart(14)} | ${fmt(despMes).padStart(14)} | ${fmt(cartMes).padStart(14)} | ${saldoStr.padStart(14)} |`)
  }

  push('', linha(), '')

  // ── 2. RECEITAS ───────────────────────────────────────────────────────────
  push(`## 2. RECEITAS CADASTRADAS`, '')

  if (receitas.length === 0) {
    push('Nenhuma receita cadastrada.', '')
  } else {
    for (const r of receitas) {
      const conta = (r.conta as any)?.nome ? ` · Conta: ${(r.conta as any).nome}` : ''
      push(`### ${r.descricao}`, `Tipo: ${r.tipo}${conta}`, '')

      const valores = (r.receitas_valores ?? [])
        .filter((rv: any) => meses12.includes(rv.mes_referencia) && Number(rv.valor) > 0)
        .sort((a: any, b: any) => a.mes_referencia - b.mes_referencia)

      if (valores.length > 0) {
        for (const rv of valores) {
          push(`  - ${mesReferenciaLabelCurto(rv.mes_referencia)}: ${fmt(Number(rv.valor))}`)
        }
      } else {
        push('  (Sem valores nos próximos 12 meses)')
      }
      push('')
    }
  }

  push(linha(), '')

  // ── 3. DESPESAS ───────────────────────────────────────────────────────────
  push(`## 3. DESPESAS PREVISTAS`, '')

  if (despesas.length === 0) {
    push('Nenhuma despesa cadastrada.', '')
  } else {
    for (const d of despesas) {
      const cat = (d.categoria as any)?.nome ? ` · Categoria: ${(d.categoria as any).nome}` : ''
      const venc = d.dia_vencimento ? ` · Vence dia ${d.dia_vencimento}` : ''
      push(`### ${d.descricao}`, `Tipo: ${d.tipo}${cat}${venc}`, '')

      const valores = (d.despesas_valores ?? [])
        .filter((dv: any) => meses12.includes(dv.mes_referencia) && Number(dv.valor) > 0)
        .sort((a: any, b: any) => a.mes_referencia - b.mes_referencia)

      if (valores.length > 0) {
        for (const dv of valores) {
          push(`  - ${mesReferenciaLabelCurto(dv.mes_referencia)}: ${fmt(Number(dv.valor))}`)
        }
      } else {
        push('  (Sem valores nos próximos 12 meses)')
      }
      push('')
    }
  }

  push(linha(), '')

  // ── 4. CARTÃO DE CRÉDITO ─────────────────────────────────────────────────
  push(`## 4. LANÇAMENTOS DO CARTÃO DE CRÉDITO (próximos 6 meses)`, '')

  for (const mes of meses6) {
    const itensMes = lancamentos.filter((l: any) => l.mes_referencia === mes)
    const totalMes = itensMes.reduce((s: number, l: any) => s + Number(l.valor_parcela), 0)

    const mesLabel = mesReferenciaLabel(mes)
    push(`### ${mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1)} — Total: ${fmt(totalMes)}`)

    if (itensMes.length === 0) {
      push('  Sem lançamentos neste mês.', '')
      continue
    }

    // Agrupa por cartão
    const porCartao = new Map<string, { nome: string; itens: any[] }>()
    for (const l of itensMes) {
      const nome = (l.cartao as any)?.nome ?? 'Sem cartão'
      if (!porCartao.has(nome)) porCartao.set(nome, { nome, itens: [] })
      porCartao.get(nome)!.itens.push(l)
    }

    for (const [, grupo] of porCartao) {
      const totalCartao = grupo.itens.reduce((s, l) => s + Number(l.valor_parcela), 0)
      push(``, `**${grupo.nome}** — ${fmt(totalCartao)}`)
      for (const l of grupo.itens) {
        const cat = (l.categoria as any)?.nome ? ` [${(l.categoria as any).nome}]` : ''
        const parc = l.numero_parcelas > 1 ? ` (${l.parcela_atual}/${l.numero_parcelas})` : ''
        const rec  = l.recorrente ? ' ♻' : ''
        push(`  - ${l.descricao}${parc}${rec}${cat}: ${fmt(Number(l.valor_parcela))} · ${fmtData(l.data_compra)}`)
      }
    }
    push('')
  }

  push(linha(), '')

  // ── 5. RESERVAS / INVESTIMENTOS ───────────────────────────────────────────
  push(`## 5. RESERVAS E INVESTIMENTOS`, '')

  if (aplicacoes.length === 0) {
    push('Nenhuma reserva ou investimento cadastrado.', '')
  } else {
    for (const a of aplicacoes) {
      const aportesMes = (avAll ?? [])
        .filter((av: any) => av.aplicacao_id === a.id)
        .sort((x: any, y: any) => x.mes_referencia - y.mes_referencia)

      push(
        `### ${a.nome}`,
        `Tipo: ${a.tipo} · Tributação: ${a.tributacao}`,
        `Taxa anual: ${a.taxa_anual}% · Saldo atual: ${fmt(Number(a.saldo_atual))}`,
      )

      const aportesProx = aportesMes.filter((av: any) => meses12.includes(av.mes_referencia) && Number(av.valor) > 0)
      if (aportesProx.length > 0) {
        push('Aportes previstos:')
        for (const av of aportesProx) {
          push(`  - ${mesReferenciaLabelCurto(av.mes_referencia)}: ${fmt(Number(av.valor))}`)
        }
      }
      push('')
    }
  }

  push(linha(), '')

  // ── Rodapé ────────────────────────────────────────────────────────────────
  push(
    `> Relatório gerado automaticamente pelo app de finanças pessoais.`,
    `> Os valores refletem o planejamento cadastrado e não representam dados bancários reais.`,
  )

  return { texto: linhas.join('\n') }
}
