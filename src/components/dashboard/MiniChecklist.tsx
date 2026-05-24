import Link from 'next/link'
import { ArrowRight, Check, CreditCard, Receipt, TrendingUp } from 'lucide-react'
import { getChecklistData } from '@/app/(dashboard)/checklist/actions'
import { formatCurrency, mesReferenciaLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface MiniChecklistProps {
  mesRef: number
  concluidos: Record<string, boolean>
}

// Ícone por tipo
function TipoIcon({ tipo }: { tipo: 'receita' | 'despesa' | 'cartao' }) {
  if (tipo === 'receita') return <TrendingUp className="h-3 w-3 text-emerald-500" />
  if (tipo === 'despesa') return <Receipt className="h-3 w-3 text-orange-400" />
  return <CreditCard className="h-3 w-3 text-red-400" />
}

interface MiniChecklistDataProps {
  mesRef: number
}

export async function MiniChecklist({ mesRef }: MiniChecklistDataProps) {
  const data = await getChecklistData(mesRef)
  const { faturas, despesas, receitas, concluidos } = data

  // Monta lista flat de todos os itens
  const todos = [
    ...receitas.map((r) => ({ key: `receita:${r.id}`, label: r.descricao, valor: r.valor, tipo: 'receita' as const })),
    ...despesas.map((d) => ({ key: `despesa:${d.id}`, label: d.descricao, valor: d.valor, tipo: 'despesa' as const, sub: d.dia_vencimento ? `vence dia ${d.dia_vencimento}` : undefined })),
    ...faturas.map((f) => ({ key: `cartao:${f.cartao_id}`, label: `Fatura ${f.nome}`, valor: f.total, tipo: 'cartao' as const })),
  ]

  const totalItens = todos.length
  const itensConcluidos = todos.filter((i) => concluidos[i.key]).length
  const pct = totalItens > 0 ? Math.round((itensConcluidos / totalItens) * 100) : 0

  // Pendentes ordenados: despesas com vencimento primeiro, depois cartões, depois receitas
  const pendentes = todos
    .filter((i) => !concluidos[i.key])
    .sort((a, b) => {
      const ordem = { despesa: 0, cartao: 1, receita: 2 }
      return ordem[a.tipo] - ordem[b.tipo]
    })
    .slice(0, 4)

  // Totais pendentes
  const receitasPendentes = receitas
    .filter((r) => !concluidos[`receita:${r.id}`])
    .reduce((s, r) => s + r.valor, 0)

  const pagarPendente =
    despesas.filter((d) => !concluidos[`despesa:${d.id}`]).reduce((s, d) => s + d.valor, 0) +
    faturas.filter((f) => !concluidos[`cartao:${f.cartao_id}`]).reduce((s, f) => s + f.total, 0)

  const mesLabel = mesReferenciaLabel(mesRef)

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground capitalize">
            Controle · {mesLabel}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {itensConcluidos} de {totalItens} {totalItens === 1 ? 'item concluído' : 'itens concluídos'}
          </p>
        </div>
        {pct === 100 && (
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
            ✓ Completo
          </span>
        )}
      </div>

      {/* Barra de progresso */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-primary' : 'bg-amber-400'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-bold text-muted-foreground w-9 text-right">{pct}%</span>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 gap-2 px-5 pb-4">
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
          <p className="text-xs text-emerald-600 mb-0.5">A receber</p>
          <p className="text-sm font-bold text-emerald-700">{formatCurrency(receitasPendentes)}</p>
        </div>
        <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
          <p className="text-xs text-red-500 mb-0.5">A pagar</p>
          <p className="text-sm font-bold text-red-600">{formatCurrency(pagarPendente)}</p>
        </div>
      </div>

      {/* Lista de pendentes */}
      <div className="flex-1 px-5 pb-3 space-y-1.5">
        {pendentes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
              <Check className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-emerald-700">Tudo em dia!</p>
            <p className="text-xs text-muted-foreground">Nenhum item pendente.</p>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Próximos pendentes
            </p>
            {pendentes.map((item) => (
              <div key={item.key} className="flex items-center gap-2.5 py-1.5">
                <div className="h-5 w-5 rounded-full border-2 border-muted flex items-center justify-center shrink-0">
                  <TipoIcon tipo={item.tipo} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{item.label}</p>
                  {(item as any).sub && (
                    <p className="text-xs text-muted-foreground">{(item as any).sub}</p>
                  )}
                </div>
                <span className={cn(
                  'text-sm font-semibold tabular-nums shrink-0',
                  item.tipo === 'receita' ? 'text-emerald-600' : 'text-red-500'
                )}>
                  {formatCurrency(item.valor)}
                </span>
              </div>
            ))}
            {pendentes.length < todos.filter((i) => !concluidos[i.key]).length && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                + {todos.filter((i) => !concluidos[i.key]).length - pendentes.length} outros pendentes
              </p>
            )}
          </>
        )}
      </div>

      {/* Link para checklist completo */}
      <Link
        href={`/checklist?mes=${mesRef}`}
        className="flex items-center justify-center gap-1.5 mx-5 mb-5 mt-2 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
      >
        Ver controle completo
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
