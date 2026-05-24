'use client'
import { useState, useTransition, useEffect, useCallback } from 'react'
import { Check, CreditCard, Receipt, TrendingUp, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'
import { toggleChecklist } from '@/app/(dashboard)/checklist/actions'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { FaturaCartao, ItemDespesa, ItemReceita } from '@/app/(dashboard)/checklist/actions'

// ─── Item individual ────────────────────────────────────────────────────────
interface CheckItemProps {
  label: string
  sublabel?: string
  valor: number
  itemKey: string
  concluido: boolean
  corValor: string
  onToggle: (key: string) => void
}

function CheckItem({ label, sublabel, valor, itemKey, concluido, corValor, onToggle }: CheckItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border transition-all cursor-pointer select-none',
        concluido
          ? 'bg-muted/30 border-muted opacity-60'
          : 'bg-white border-border hover:bg-muted/10'
      )}
      onClick={() => onToggle(itemKey)}
    >
      <div className={cn(
        'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
        concluido ? 'bg-green-500 border-green-500' : 'border-muted-foreground/40'
      )}>
        {concluido && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', concluido && 'line-through text-muted-foreground')}>
          {label}
        </p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>

      <span className={cn('text-sm font-semibold tabular-nums shrink-0', concluido ? 'text-muted-foreground line-through' : corValor)}>
        {formatCurrency(valor)}
      </span>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────
interface ChecklistPanelProps {
  faturas: FaturaCartao[]
  despesas: ItemDespesa[]
  receitas: ItemReceita[]
  concluidos: Record<string, boolean>
  mesRef: number
}

function parseSaldo(v: string): number {
  return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0
}

export function ChecklistPanel({ faturas, despesas, receitas, concluidos: inicial, mesRef }: ChecklistPanelProps) {
  // Estado centralizado de todos os checkboxes
  const [estados, setEstados] = useState<Record<string, boolean>>(inicial)
  const [pending, startTransition] = useTransition()

  // Saldo atual — lido do localStorage (escrito pelo GastosAvistaPanel no topo)
  const storageKey = `saldo_checklist_${mesRef}`
  const [saldoAtual, setSaldoAtual] = useState(0)

  useEffect(() => {
    setSaldoAtual(parseSaldo(localStorage.getItem(storageKey) ?? ''))

    // Sincroniza quando GastosAvistaPanel atualiza o valor na mesma aba
    const handler = (e: Event) => {
      setSaldoAtual((e as CustomEvent).detail.value ?? 0)
    }
    window.addEventListener('saldoAtualUpdated', handler)
    return () => window.removeEventListener('saldoAtualUpdated', handler)
  }, [storageKey])

  // Toggle de um item: atualiza estado local + salva no banco
  const handleToggle = useCallback((key: string) => {
    const [tipo, referenciaId] = key.split(':') as ['cartao' | 'despesa' | 'receita', string]
    const novoEstado = !estados[key]

    setEstados((prev) => ({ ...prev, [key]: novoEstado }))

    startTransition(async () => {
      const result = await toggleChecklist(mesRef, tipo, referenciaId, novoEstado)
      if (result?.error) {
        setEstados((prev) => ({ ...prev, [key]: !novoEstado }))
        toast.error(result.error)
      }
    })
  }, [estados, mesRef])

  // ── Cálculos de projeção ──
  // Pendentes = ainda não marcados
  const receitasPendentes   = receitas.filter((r) => !estados[`receita:${r.id}`])
  const despesasPendentes   = despesas.filter((d) => !estados[`despesa:${d.id}`])
  const faturasPendentes    = faturas.filter((f)  => !estados[`cartao:${f.cartao_id}`])

  const totalRecPendente  = receitasPendentes.reduce((s, r) => s + r.valor, 0)
  const totalDespPendente = despesasPendentes.reduce((s, d) => s + d.valor, 0)
  const totalFatPendente  = faturasPendentes.reduce((s, f) => s + f.total, 0)
  const totalPagarPendente = totalDespPendente + totalFatPendente

  const saldoProjetado = saldoAtual + totalRecPendente - totalPagarPendente

  // Totais gerais (para os headers de seção)
  const totalReceitas = receitas.reduce((s, r) => s + r.valor, 0)
  const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0)
  const totalCartoes  = faturas.reduce((s, f) => s + f.total, 0)

  // Progresso
  const allKeys = [
    ...receitas.map((r) => `receita:${r.id}`),
    ...despesas.map((d) => `despesa:${d.id}`),
    ...faturas.map((f)  => `cartao:${f.cartao_id}`),
  ]
  const totalItens     = allKeys.length
  const itensConcluidos = allKeys.filter((k) => estados[k]).length
  const pct = totalItens > 0 ? Math.round((itensConcluidos / totalItens) * 100) : 0

  return (
    <div className="space-y-5">

      {/* ── Rótulo separador ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
          O que ainda vai acontecer
        </p>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* ── Projeção financeira ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-white p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Saldo atual</p>
          <p className={cn('text-base font-bold', saldoAtual >= 0 ? 'text-gray-800' : 'text-red-600')}>
            {formatCurrency(saldoAtual)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-500" /> A receber
          </p>
          <p className="text-base font-bold text-green-600">
            + {formatCurrency(totalRecPendente)}
          </p>
          {totalRecPendente < totalReceitas && (
            <p className="text-xs text-muted-foreground mt-0.5">
              de {formatCurrency(totalReceitas)}
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-white p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
            <TrendingDown className="h-3 w-3 text-red-500" /> A pagar
          </p>
          <p className="text-base font-bold text-red-600">
            − {formatCurrency(totalPagarPendente)}
          </p>
          {totalPagarPendente < (totalDespesas + totalCartoes) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              de {formatCurrency(totalDespesas + totalCartoes)}
            </p>
          )}
        </div>

        <div className={cn(
          'rounded-xl border p-3 text-center',
          saldoProjetado >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        )}>
          <p className="text-xs text-muted-foreground mb-1 font-medium">Projeção final</p>
          <p className={cn('text-base font-bold', saldoProjetado >= 0 ? 'text-green-700' : 'text-red-700')}>
            {formatCurrency(saldoProjetado)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {saldoProjetado >= 0 ? 'sobra estimada' : 'déficit estimado'}
          </p>
        </div>
      </div>

      {/* ── Progresso ── */}
      {totalItens > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{itensConcluidos} de {totalItens} item{totalItens !== 1 ? 's' : ''} concluído{itensConcluidos !== 1 ? 's' : ''}</span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                pct === 100 ? 'bg-green-500' : 'bg-indigo-500'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          {pct === 100 && (
            <p className="text-xs text-green-600 font-medium text-center">
              ✓ Todos os itens do mês concluídos!
            </p>
          )}
        </div>
      )}

      {/* ── Receitas ── */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-green-50">
          <div className="flex items-center gap-2 text-green-700">
            <TrendingUp className="h-4 w-4" />
            <h2 className="font-semibold text-sm">Receitas</h2>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-green-700">{formatCurrency(totalReceitas)}</span>
            {totalRecPendente < totalReceitas && (
              <p className="text-xs text-green-600/70">{formatCurrency(totalRecPendente)} pendente</p>
            )}
          </div>
        </div>
        <div className="p-3 space-y-2">
          {receitas.length === 0
            ? <p className="text-sm text-muted-foreground text-center py-4">Nenhuma receita prevista para este mês.</p>
            : receitas.map((r) => (
              <CheckItem
                key={r.id}
                itemKey={`receita:${r.id}`}
                label={r.descricao}
                valor={r.valor}
                concluido={!!estados[`receita:${r.id}`]}
                corValor="text-green-600"
                onToggle={handleToggle}
              />
            ))
          }
        </div>
      </div>

      {/* ── Despesas ── */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-orange-50">
          <div className="flex items-center gap-2 text-orange-700">
            <Receipt className="h-4 w-4" />
            <h2 className="font-semibold text-sm">Despesas</h2>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-orange-700">{formatCurrency(totalDespesas)}</span>
            {totalDespPendente < totalDespesas && (
              <p className="text-xs text-orange-600/70">{formatCurrency(totalDespPendente)} pendente</p>
            )}
          </div>
        </div>
        <div className="p-3 space-y-2">
          {despesas.length === 0
            ? <p className="text-sm text-muted-foreground text-center py-4">Nenhuma despesa prevista para este mês.</p>
            : despesas.map((d) => (
              <CheckItem
                key={d.id}
                itemKey={`despesa:${d.id}`}
                label={d.descricao}
                sublabel={d.dia_vencimento ? `Vencimento dia ${d.dia_vencimento}` : undefined}
                valor={d.valor}
                concluido={!!estados[`despesa:${d.id}`]}
                corValor="text-red-600"
                onToggle={handleToggle}
              />
            ))
          }
        </div>
      </div>

      {/* ── Faturas de Cartão ── */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <CreditCard className="h-4 w-4" />
            <h2 className="font-semibold text-sm">Faturas de Cartão</h2>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-red-700">{formatCurrency(totalCartoes)}</span>
            {totalFatPendente < totalCartoes && (
              <p className="text-xs text-red-600/70">{formatCurrency(totalFatPendente)} pendente</p>
            )}
          </div>
        </div>
        <div className="p-3 space-y-2">
          {faturas.length === 0
            ? <p className="text-sm text-muted-foreground text-center py-4">Nenhuma fatura de cartão neste mês.</p>
            : faturas.map((f) => (
              <CheckItem
                key={f.cartao_id}
                itemKey={`cartao:${f.cartao_id}`}
                label={`Fatura ${f.nome}`}
                valor={f.total}
                concluido={!!estados[`cartao:${f.cartao_id}`]}
                corValor="text-red-600"
                onToggle={handleToggle}
              />
            ))
          }
        </div>
      </div>

    </div>
  )
}
