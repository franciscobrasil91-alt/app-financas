'use client'
import { useState, useTransition, useEffect, useCallback } from 'react'
import { Check, CreditCard, Receipt, TrendingUp, TrendingDown, Pencil, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  toggleChecklist,
  registrarPagamento,
  editarDespesaChecklist,
  editarReceitaChecklist,
  criarDespesaPontual,
  criarReceitaPontual,
  removerDespesaDoMes,
  removerReceitaDoMes,
} from '@/app/(dashboard)/checklist/actions'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { FaturaCartao, ItemDespesa, ItemReceita } from '@/app/(dashboard)/checklist/actions'

// ─── Schema de edição ───────────────────────────────────────────────────────
const editSchema = z.object({
  descricao: z.string().min(1, 'Descrição obrigatória'),
  valor: z.string().min(1, 'Valor obrigatório'),
  dia_vencimento: z.string().optional(),
})
type EditForm = z.infer<typeof editSchema>

// ─── Item individual ────────────────────────────────────────────────────────
interface CheckItemProps {
  label: string
  sublabel?: string
  valor: number
  valorPago?: number          // preenchido quando há pagamento parcial
  itemKey: string
  concluido: boolean
  corValor: string
  onToggle: (key: string) => void
  onEdit?: () => void
}

function CheckItem({ label, sublabel, valor, valorPago, itemKey, concluido, corValor, onToggle, onEdit }: CheckItemProps) {
  const isParcial = !concluido && (valorPago ?? 0) > 0

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border transition-all select-none group',
        concluido
          ? 'bg-muted/30 border-muted opacity-60'
          : isParcial
          ? 'bg-amber-50/60 border-amber-200'
          : 'bg-white border-border hover:bg-muted/10'
      )}
    >
      {/* Área de toggle (círculo) */}
      <div
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
        onClick={() => onToggle(itemKey)}
      >
        <div className={cn(
          'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
          concluido
            ? 'bg-green-500 border-green-500'
            : isParcial
            ? 'border-amber-400 bg-amber-100'
            : 'border-muted-foreground/40'
        )}>
          {concluido && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
          {isParcial && <span className="text-[8px] font-bold text-amber-600 leading-none">½</span>}
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium truncate', concluido && 'line-through text-muted-foreground')}>
            {label}
          </p>
          {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
          {isParcial && (
            <p className="text-xs text-amber-600/80">
              Pago: {formatCurrency(valorPago!)} · Restante: {formatCurrency(valor - valorPago!)}
            </p>
          )}
        </div>
      </div>

      <span className={cn('text-sm font-semibold tabular-nums shrink-0', concluido ? 'text-muted-foreground line-through' : corValor)}>
        {formatCurrency(valor)}
      </span>

      {/* Botão de edição */}
      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-all opacity-0 group-hover:opacity-100 shrink-0"
          title="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────
interface ChecklistPanelProps {
  faturas: FaturaCartao[]
  despesas: ItemDespesa[]
  receitas: ItemReceita[]
  concluidos: Record<string, boolean>
  valoresPagos: Record<string, number>
  mesRef: number
}

function parseSaldo(v: string): number {
  return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0
}

type EditTarget = { tipo: 'despesa' | 'receita'; item: ItemDespesa | ItemReceita } | null

type PagandoItem = {
  tipo: 'cartao' | 'despesa' | 'receita'
  key: string
  referenciaId: string
  label: string
  valorTotal: number
}

export function ChecklistPanel({
  faturas,
  despesas,
  receitas,
  concluidos: inicial,
  valoresPagos: iniciaisVP,
  mesRef,
}: ChecklistPanelProps) {
  const [estados, setEstados] = useState<Record<string, boolean>>(inicial)
  const [valoresPagosLocal, setValoresPagosLocal] = useState<Record<string, number>>(iniciaisVP)
  const [pending, startTransition] = useTransition()

  // ── Estado do dialog de edição ──
  const [editTarget, setEditTarget] = useState<EditTarget>(null)
  const [salvando, setSalvando] = useState(false)
  const [removendo, setRemovendo] = useState(false)
  const [confirmarRemocao, setConfirmarRemocao] = useState(false)

  // ── Estado do dialog de criação pontual ──
  const [criarTipo, setCriarTipo] = useState<'despesa' | 'receita' | null>(null)
  const [criando, setCriando] = useState(false)

  // ── Estado do dialog de pagamento ──
  const [pagandoItem, setPagandoItem] = useState<PagandoItem | null>(null)
  const [valorPagarInput, setValorPagarInput] = useState('')
  const [pagando, setPagando] = useState(false)

  // Lista local mutável
  const [despesasLocal, setDespesasLocal] = useState(despesas)
  const [receitasLocal, setReceitasLocal] = useState(receitas)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  })

  const {
    register: registerCriar,
    handleSubmit: handleSubmitCriar,
    reset: resetCriar,
    formState: { errors: errorsCriar },
  } = useForm<EditForm>({ resolver: zodResolver(editSchema) })

  // ── Saldo atual — lido do localStorage ──
  const storageKey = `saldo_checklist_${mesRef}`
  const [saldoAtual, setSaldoAtual] = useState(0)

  useEffect(() => {
    setSaldoAtual(parseSaldo(localStorage.getItem(storageKey) ?? ''))
    const handler = (e: Event) => {
      setSaldoAtual((e as CustomEvent).detail.value ?? 0)
    }
    window.addEventListener('saldoAtualUpdated', handler)
    return () => window.removeEventListener('saldoAtualUpdated', handler)
  }, [storageKey])

  // ── Clique no círculo: desmarcar se já pago, ou abrir modal de pagamento ──
  const handleCircleClick = useCallback((
    key: string,
    tipo: 'cartao' | 'despesa' | 'receita',
    referenciaId: string,
    label: string,
    valorTotal: number
  ) => {
    if (estados[key]) {
      // Desmarcar → limpa pagamento
      setEstados(prev => ({ ...prev, [key]: false }))
      setValoresPagosLocal(prev => { const n = { ...prev }; delete n[key]; return n })
      startTransition(async () => {
        const result = await toggleChecklist(mesRef, tipo, referenciaId, false)
        if (result?.error) {
          setEstados(prev => ({ ...prev, [key]: true }))
          toast.error(result.error)
        }
      })
    } else {
      // Abrir modal de pagamento
      const currentPago = valoresPagosLocal[key]
      setPagandoItem({ tipo, key, referenciaId, label, valorTotal })
      const valFormatado = currentPago != null
        ? String(currentPago).replace('.', ',')
        : String(valorTotal).replace('.', ',')
      setValorPagarInput(valFormatado)
    }
  }, [estados, valoresPagosLocal, mesRef])

  // ── Confirmar pagamento (total ou parcial) ──
  async function onConfirmarPagamento() {
    if (!pagandoItem) return
    setPagando(true)
    const valor = parseFloat(valorPagarInput.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) {
      toast.error('Informe um valor válido')
      setPagando(false)
      return
    }

    const result = await registrarPagamento(
      mesRef,
      pagandoItem.tipo,
      pagandoItem.referenciaId,
      valor,
      pagandoItem.valorTotal
    )

    if (result?.error) { toast.error(result.error); setPagando(false); return }

    const concluido = result.concluido ?? (valor >= pagandoItem.valorTotal)
    setEstados(prev => ({ ...prev, [pagandoItem.key]: concluido }))
    if (concluido) {
      setValoresPagosLocal(prev => { const n = { ...prev }; delete n[pagandoItem.key]; return n })
      toast.success('Pago! ✓')
    } else {
      setValoresPagosLocal(prev => ({ ...prev, [pagandoItem.key]: valor }))
      toast.success(`Pagamento parcial de ${formatCurrency(valor)} registrado.`)
    }

    setPagandoItem(null)
    setPagando(false)
  }

  // ── Criação pontual ──
  function abrirCriacao(tipo: 'despesa' | 'receita') {
    setCriarTipo(tipo)
    resetCriar({ descricao: '', valor: '', dia_vencimento: '' })
  }

  async function onCriarPontual(data: EditForm) {
    if (!criarTipo) return
    setCriando(true)
    const valor = parseFloat(data.valor.replace(',', '.'))

    if (criarTipo === 'despesa') {
      const dia = data.dia_vencimento ? parseInt(data.dia_vencimento) : null
      const result = await criarDespesaPontual(mesRef, { descricao: data.descricao, valor, dia_vencimento: dia })
      if (result?.error) { toast.error(result.error); setCriando(false); return }
      setDespesasLocal((prev) => [...prev, {
        id: result.id!, descricao: data.descricao, valor, dia_vencimento: dia,
      }])
    } else {
      const result = await criarReceitaPontual(mesRef, { descricao: data.descricao, valor })
      if (result?.error) { toast.error(result.error); setCriando(false); return }
      setReceitasLocal((prev) => [...prev, { id: result.id!, descricao: data.descricao, valor }])
    }

    toast.success(`${criarTipo === 'despesa' ? 'Despesa' : 'Receita'} adicionada!`)
    setCriarTipo(null)
    setCriando(false)
  }

  // ── Remoção ──
  async function onRemover() {
    if (!editTarget) return
    setRemovendo(true)
    let result
    if (editTarget.tipo === 'despesa') {
      result = await removerDespesaDoMes(editTarget.item.id, mesRef)
      if (!result?.error) setDespesasLocal((prev) => prev.filter((d) => d.id !== editTarget.item.id))
    } else {
      result = await removerReceitaDoMes(editTarget.item.id, mesRef)
      if (!result?.error) setReceitasLocal((prev) => prev.filter((r) => r.id !== editTarget.item.id))
    }
    if (result?.error) { toast.error(result.error); setRemovendo(false); return }
    toast.success('Item removido do mês.')
    setEditTarget(null)
    setConfirmarRemocao(false)
    setRemovendo(false)
  }

  // ── Edição inline ──
  function abrirEdicao(tipo: 'despesa' | 'receita', item: ItemDespesa | ItemReceita) {
    setEditTarget({ tipo, item })
    setConfirmarRemocao(false)
    reset({
      descricao: item.descricao,
      valor: String(item.valor).replace('.', ','),
      dia_vencimento: tipo === 'despesa' ? String((item as ItemDespesa).dia_vencimento ?? '') : '',
    })
  }

  async function onSalvarEdicao(data: EditForm) {
    if (!editTarget) return
    setSalvando(true)
    const valor = parseFloat(data.valor.replace(',', '.'))

    if (editTarget.tipo === 'despesa') {
      const dia = data.dia_vencimento ? parseInt(data.dia_vencimento) : null
      const result = await editarDespesaChecklist(editTarget.item.id, mesRef, {
        descricao: data.descricao, valor, dia_vencimento: dia,
      })
      if (result?.error) { toast.error(result.error); setSalvando(false); return }
      setDespesasLocal((prev) => prev.map((d) =>
        d.id === editTarget.item.id ? { ...d, descricao: data.descricao, valor, dia_vencimento: dia } : d
      ))
    } else {
      const result = await editarReceitaChecklist(editTarget.item.id, mesRef, {
        descricao: data.descricao, valor,
      })
      if (result?.error) { toast.error(result.error); setSalvando(false); return }
      setReceitasLocal((prev) => prev.map((r) =>
        r.id === editTarget.item.id ? { ...r, descricao: data.descricao, valor } : r
      ))
    }

    toast.success('Salvo!')
    setEditTarget(null)
    setSalvando(false)
  }

  // ── Cálculos de projeção (descontando pagamentos parciais) ──
  const receitasPendentes = receitasLocal.filter(r => !estados[`receita:${r.id}`])
  const despesasPendentes = despesasLocal.filter(d => !estados[`despesa:${d.id}`])
  const faturasPendentes  = faturas.filter(f  => !estados[`cartao:${f.cartao_id}`])

  const totalRecPendente = receitasPendentes.reduce((s, r) => {
    const pago = valoresPagosLocal[`receita:${r.id}`] ?? 0
    return s + Math.max(0, r.valor - pago)
  }, 0)

  const totalDespPendente = despesasPendentes.reduce((s, d) => {
    const pago = valoresPagosLocal[`despesa:${d.id}`] ?? 0
    return s + Math.max(0, d.valor - pago)
  }, 0)

  const totalFatPendente = faturasPendentes.reduce((s, f) => {
    const pago = valoresPagosLocal[`cartao:${f.cartao_id}`] ?? 0
    return s + Math.max(0, f.total - pago)
  }, 0)

  const totalPagarPendente = totalDespPendente + totalFatPendente
  const saldoProjetado = saldoAtual + totalRecPendente - totalPagarPendente

  // Totais gerais (para os headers de seção)
  const totalReceitas = receitasLocal.reduce((s, r) => s + r.valor, 0)
  const totalDespesas = despesasLocal.reduce((s, d) => s + d.valor, 0)
  const totalCartoes  = faturas.reduce((s, f) => s + f.total, 0)

  // Progresso
  const allKeys = [
    ...receitasLocal.map(r => `receita:${r.id}`),
    ...despesasLocal.map(d => `despesa:${d.id}`),
    ...faturas.map(f  => `cartao:${f.cartao_id}`),
  ]
  const totalItens      = allKeys.length
  const itensConcluidos = allKeys.filter(k => estados[k]).length
  const pct = totalItens > 0 ? Math.round((itensConcluidos / totalItens) * 100) : 0

  // Valor faltante no modal de pagamento
  const valorPagarNum = parseFloat(valorPagarInput.replace(',', '.')) || 0
  const restante = pagandoItem ? Math.max(0, pagandoItem.valorTotal - valorPagarNum) : 0

  return (
    <>
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
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-sm font-bold text-green-700">{formatCurrency(totalReceitas)}</span>
              {totalRecPendente < totalReceitas && (
                <p className="text-xs text-green-600/70">{formatCurrency(totalRecPendente)} pendente</p>
              )}
            </div>
            <button
              onClick={() => abrirCriacao('receita')}
              className="h-6 w-6 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition-colors shrink-0"
              title="Adicionar receita pontual"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="p-3 space-y-2">
          {receitasLocal.length === 0
            ? <p className="text-sm text-muted-foreground text-center py-4">Nenhuma receita prevista para este mês.</p>
            : receitasLocal.map((r) => (
              <CheckItem
                key={r.id}
                itemKey={`receita:${r.id}`}
                label={r.descricao}
                valor={r.valor}
                valorPago={valoresPagosLocal[`receita:${r.id}`]}
                concluido={!!estados[`receita:${r.id}`]}
                corValor="text-green-600"
                onToggle={(key) => handleCircleClick(key, 'receita', r.id, r.descricao, r.valor)}
                onEdit={() => abrirEdicao('receita', r)}
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
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-sm font-bold text-orange-700">{formatCurrency(totalDespesas)}</span>
              {totalDespPendente < totalDespesas && (
                <p className="text-xs text-orange-600/70">{formatCurrency(totalDespPendente)} pendente</p>
              )}
            </div>
            <button
              onClick={() => abrirCriacao('despesa')}
              className="h-6 w-6 rounded-full bg-orange-600 text-white flex items-center justify-center hover:bg-orange-700 transition-colors shrink-0"
              title="Adicionar despesa pontual"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="p-3 space-y-2">
          {despesasLocal.length === 0
            ? <p className="text-sm text-muted-foreground text-center py-4">Nenhuma despesa prevista para este mês.</p>
            : despesasLocal.map((d) => (
              <CheckItem
                key={d.id}
                itemKey={`despesa:${d.id}`}
                label={d.descricao}
                sublabel={d.dia_vencimento ? `Vencimento dia ${d.dia_vencimento}` : undefined}
                valor={d.valor}
                valorPago={valoresPagosLocal[`despesa:${d.id}`]}
                concluido={!!estados[`despesa:${d.id}`]}
                corValor="text-red-600"
                onToggle={(key) => handleCircleClick(key, 'despesa', d.id, d.descricao, d.valor)}
                onEdit={() => abrirEdicao('despesa', d)}
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
                valorPago={valoresPagosLocal[`cartao:${f.cartao_id}`]}
                concluido={!!estados[`cartao:${f.cartao_id}`]}
                corValor="text-red-600"
                onToggle={(key) => handleCircleClick(key, 'cartao', f.cartao_id, `Fatura ${f.nome}`, f.total)}
              />
            ))
          }
        </div>
      </div>

    </div> {/* fim space-y-5 */}

      {/* ── Dialog de pagamento ── */}
      <Dialog open={!!pagandoItem} onOpenChange={(open) => !open && setPagandoItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-base">Registrar pagamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground truncate">{pagandoItem?.label}</p>

            <div className="space-y-1.5">
              <Label htmlFor="pg-valor">Valor pago (R$)</Label>
              <Input
                id="pg-valor"
                inputMode="decimal"
                placeholder="0,00"
                value={valorPagarInput}
                onChange={e => setValorPagarInput(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && onConfirmarPagamento()}
              />
              {pagandoItem && valorPagarNum > 0 && valorPagarNum < pagandoItem.valorTotal && (
                <p className="text-xs text-amber-600">
                  Pagamento parcial — {formatCurrency(restante)} ficará pendente.
                </p>
              )}
              {pagandoItem && valorPagarNum >= pagandoItem.valorTotal && valorPagarNum > 0 && (
                <p className="text-xs text-green-600">Valor total coberto — item será marcado como pago. ✓</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setPagandoItem(null)}>
                Cancelar
              </Button>
              <Button type="button" className="flex-1" onClick={onConfirmarPagamento} disabled={pagando || valorPagarNum <= 0}>
                {pagando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar
              </Button>
            </div>

            {pagandoItem && valorPagarNum !== pagandoItem.valorTotal && (
              <button
                type="button"
                className="text-xs text-muted-foreground underline underline-offset-2 w-full text-center"
                onClick={() => setValorPagarInput(String(pagandoItem.valorTotal).replace('.', ','))}
              >
                Pagar valor total ({formatCurrency(pagandoItem.valorTotal)})
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog de criação pontual ── */}
      <Dialog open={!!criarTipo} onOpenChange={(open) => !open && setCriarTipo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-base">
              {criarTipo === 'despesa' ? 'Nova despesa' : 'Nova receita'} — só este mês
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitCriar(onCriarPontual)} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="cr-descricao">Descrição</Label>
              <Input id="cr-descricao" placeholder={criarTipo === 'despesa' ? 'Ex: Conserto do carro' : 'Ex: Freela de maio'} {...registerCriar('descricao')} />
              {errorsCriar.descricao && <p className="text-xs text-destructive">{errorsCriar.descricao.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cr-valor">Valor (R$)</Label>
              <Input id="cr-valor" inputMode="decimal" placeholder="0,00" {...registerCriar('valor')} />
              {errorsCriar.valor && <p className="text-xs text-destructive">{errorsCriar.valor.message}</p>}
            </div>

            {criarTipo === 'despesa' && (
              <div className="space-y-1.5">
                <Label htmlFor="cr-venc">Dia de vencimento <span className="text-muted-foreground">(opcional)</span></Label>
                <Input id="cr-venc" type="number" min={1} max={31} placeholder="Ex: 15" {...registerCriar('dia_vencimento')} />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Este item aparece apenas no checklist de {String(mesRef).slice(0,4)}/{String(mesRef).slice(4).padStart(2,'0')}.
            </p>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCriarTipo(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={criando}>
                {criando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog de edição ── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-base">
              Editar {editTarget?.tipo === 'despesa' ? 'despesa' : 'receita'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSalvarEdicao)} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="ed-descricao">Descrição</Label>
              <Input id="ed-descricao" {...register('descricao')} />
              {errors.descricao && <p className="text-xs text-destructive">{errors.descricao.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ed-valor">Valor (R$)</Label>
              <Input id="ed-valor" inputMode="decimal" placeholder="0,00" {...register('valor')} />
              {errors.valor && <p className="text-xs text-destructive">{errors.valor.message}</p>}
            </div>

            {editTarget?.tipo === 'despesa' && (
              <div className="space-y-1.5">
                <Label htmlFor="ed-venc">Dia de vencimento</Label>
                <Input
                  id="ed-venc"
                  type="number"
                  min={1}
                  max={31}
                  placeholder="Ex: 10"
                  {...register('dia_vencimento')}
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              A alteração do valor vale apenas para este mês.
            </p>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditTarget(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={salvando}>
                {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>

            {/* Remover do mês */}
            <div className="border-t pt-3 mt-1">
              {!confirmarRemocao ? (
                <button
                  type="button"
                  onClick={() => setConfirmarRemocao(true)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover do mês
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-destructive font-medium">Tem certeza? O item será removido deste mês.</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => setConfirmarRemocao(false)}>
                      Não
                    </Button>
                    <Button type="button" variant="destructive" size="sm" className="flex-1 text-xs h-8" onClick={onRemover} disabled={removendo}>
                      {removendo && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      Sim, remover
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
