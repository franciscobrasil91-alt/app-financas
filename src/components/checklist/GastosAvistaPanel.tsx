'use client'
import { useState, useEffect, useTransition } from 'react'
import { Plus, Trash2, Loader2, ShoppingBag, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn, formatCurrency } from '@/lib/utils'
import {
  salvarSaldoInicial,
  criarGastoAvista,
  deletarGastoAvista,
} from '@/app/(dashboard)/checklist/actions'
import type { GastoAvista } from '@/app/(dashboard)/checklist/actions'

interface GastosAvistaPanelProps {
  mesRef: number
  saldoInicialDb: number | null
  gastosIniciais: GastoAvista[]
  receitasRecebidas: number
  saidasPagas: number
}

function parseMoeda(v: string): number {
  return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0
}

export function GastosAvistaPanel({
  mesRef,
  saldoInicialDb,
  gastosIniciais,
  receitasRecebidas,
  saidasPagas,
}: GastosAvistaPanelProps) {
  const [, startTransition] = useTransition()

  // ── Saldo inicial (banco) ──
  const [saldoInicialInput, setSaldoInicialInput] = useState(
    saldoInicialDb !== null ? String(saldoInicialDb).replace('.', ',') : ''
  )
  const [saldoInicial, setSaldoInicial] = useState<number>(saldoInicialDb ?? 0)
  const [saldoFoiSalvo, setSaldoFoiSalvo] = useState(saldoInicialDb !== null)
  const [salvandoSaldo, setSalvandoSaldo] = useState(false)

  async function handleSalvarSaldo() {
    const valor = parseMoeda(saldoInicialInput)
    setSalvandoSaldo(true)
    const res = await salvarSaldoInicial(mesRef, valor)
    setSalvandoSaldo(false)
    if (res?.error) {
      toast.error(res.error)
    } else {
      setSaldoInicial(valor)
      setSaldoFoiSalvo(true)
      toast.success('Saldo inicial salvo!')
    }
  }

  // ── Saldo hoje (localStorage — compartilhado com ChecklistSection) ──
  const storageKey = `saldo_checklist_${mesRef}`
  const [saldoHojeInput, setSaldoHojeInput] = useState('')
  const [saldoHoje, setSaldoHoje] = useState<number | null>(null)

  useEffect(() => {
    const salvo = localStorage.getItem(storageKey) ?? ''
    setSaldoHojeInput(salvo)
    if (salvo) setSaldoHoje(parseMoeda(salvo))
  }, [storageKey])

  function handleSaldoHojeChange(v: string) {
    const limpo = v.replace(/[^\d,\.]/g, '')
    setSaldoHojeInput(limpo)
    const num = parseMoeda(limpo)
    setSaldoHoje(num > 0 || limpo !== '' ? num : null)
    localStorage.setItem(storageKey, limpo)
    // Notifica ChecklistSection na mesma aba
    window.dispatchEvent(new CustomEvent('saldoAtualUpdated', { detail: { value: num, raw: limpo } }))
  }

  // ── Gastos avulsos ──
  const [gastos, setGastos] = useState<GastoAvista[]>(gastosIniciais)
  const [novoDesc, setNovoDesc] = useState('')
  const [novoValor, setNovoValor] = useState('')
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0])
  const [adicionando, setAdicionando] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showDetalhes, setShowDetalhes] = useState(false)

  async function handleAdicionarGasto(e: React.FormEvent) {
    e.preventDefault()
    if (!novoDesc.trim() || !novoValor) return
    setAdicionando(true)
    const res = await criarGastoAvista({
      mesRef,
      descricao: novoDesc.trim(),
      valor: parseMoeda(novoValor),
      data_gasto: novaData,
    })
    setAdicionando(false)
    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success('Gasto registrado!')
      setGastos((prev) => [{
        id: crypto.randomUUID(),
        descricao: novoDesc.trim(),
        valor: parseMoeda(novoValor),
        data_gasto: novaData,
        categoria_id: null,
        categoria: null,
      }, ...prev])
      setNovoDesc('')
      setNovoValor('')
      setNovaData(new Date().toISOString().split('T')[0])
      setShowForm(false)
      startTransition(() => {})
    }
  }

  function handleDeletar(id: string) {
    setGastos((prev) => prev.filter((g) => g.id !== id))
    startTransition(async () => {
      const res = await deletarGastoAvista(id)
      if (res?.error) {
        toast.error(res.error)
        setGastos(gastosIniciais)
      }
    })
  }

  // ── Cálculos ──
  const totalGastos = gastos.reduce((s, g) => s + g.valor, 0)
  const temSaldoInicial = saldoFoiSalvo
  const temSaldoHoje = saldoHoje !== null
  const saldoEsperado = saldoInicial + receitasRecebidas - saidasPagas - totalGastos
  const gastosNaoIdentificados = temSaldoInicial && temSaldoHoje
    ? saldoEsperado - saldoHoje!
    : null
  const tudoOk = gastosNaoIdentificados !== null && gastosNaoIdentificados === 0
  const gastouSemRegistrar = gastosNaoIdentificados !== null && gastosNaoIdentificados > 0
  const recebeuSemRegistrar = gastosNaoIdentificados !== null && gastosNaoIdentificados < 0

  function formatData(d: string) {
    const [, m, day] = d.split('-')
    return `${day}/${m}`
  }

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-violet-50">
        <div className="flex items-center gap-2 text-violet-700">
          <ShoppingBag className="h-4 w-4" />
          <h2 className="font-semibold text-sm">Outros Gastos do Mês</h2>
        </div>
        {totalGastos > 0 && (
          <span className="text-sm font-bold text-violet-700">{formatCurrency(totalGastos)}</span>
        )}
      </div>

      <div className="p-4 space-y-4">

        {/* ── Dois saldos lado a lado ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Saldo início */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Saldo início do mês
            </Label>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={saldoInicialInput}
                  onChange={(e) => setSaldoInicialInput(e.target.value.replace(/[^\d,\.]/g, ''))}
                  onBlur={handleSalvarSaldo}
                  onKeyDown={(e) => e.key === 'Enter' && handleSalvarSaldo()}
                  className="pl-8 h-9 text-sm font-semibold"
                />
              </div>
              {salvandoSaldo && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground self-center shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground">Quanto tinha na conta em 01/{String(mesRef).slice(4).padStart(2,'0')}</p>
          </div>

          {/* Saldo hoje */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Saldo hoje
            </Label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={saldoHojeInput}
                onChange={(e) => handleSaldoHojeChange(e.target.value)}
                className="pl-8 h-9 text-sm font-semibold"
              />
            </div>
            <p className="text-xs text-muted-foreground">Quanto tem na conta agora</p>
          </div>
        </div>

        {/* ── Card destaque: gastos não identificados ── */}
        {gastosNaoIdentificados !== null && (
          <div className={cn(
            'rounded-xl border p-4',
            tudoOk          ? 'bg-emerald-50 border-emerald-200'
            : gastouSemRegistrar ? 'bg-amber-50 border-amber-200'
            : 'bg-blue-50 border-blue-200'
          )}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  {tudoOk
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    : gastouSemRegistrar
                    ? <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    : <TrendingUp className="h-4 w-4 text-blue-500 shrink-0" />
                  }
                  <p className={cn(
                    'text-xs font-semibold uppercase tracking-wide',
                    tudoOk ? 'text-emerald-600' : gastouSemRegistrar ? 'text-amber-600' : 'text-blue-600'
                  )}>
                    {tudoOk ? 'Tudo registrado' : gastouSemRegistrar ? 'Gastos não identificados' : 'Receita não identificada'}
                  </p>
                </div>
                <p className={cn(
                  'text-2xl font-bold tabular-nums',
                  tudoOk ? 'text-emerald-700' : gastouSemRegistrar ? 'text-amber-700' : 'text-blue-700'
                )}>
                  {formatCurrency(Math.abs(gastosNaoIdentificados))}
                </p>
                <p className={cn(
                  'text-xs mt-1',
                  tudoOk ? 'text-emerald-600' : gastouSemRegistrar ? 'text-amber-600' : 'text-blue-600'
                )}>
                  {tudoOk
                    ? 'Seus gastos estão todos registrados.'
                    : gastouSemRegistrar
                    ? 'Você pode ter gasto esse valor sem registrar.'
                    : 'Você pode ter recebido algum valor sem registrar.'}
                </p>
              </div>

              {/* Botão de ver detalhes */}
              <button
                onClick={() => setShowDetalhes((v) => !v)}
                className={cn(
                  'flex items-center gap-1 text-xs font-medium shrink-0 mt-1',
                  tudoOk ? 'text-emerald-600' : gastouSemRegistrar ? 'text-amber-600' : 'text-blue-600'
                )}
              >
                {showDetalhes ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showDetalhes ? 'Ocultar' : 'Ver conta'}
              </button>
            </div>

            {/* Breakdown expansível */}
            {showDetalhes && (
              <div className="mt-3 pt-3 border-t border-current/20 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Saldo início do mês</span>
                  <span className="tabular-nums">{formatCurrency(saldoInicial)}</span>
                </div>
                {receitasRecebidas > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>+ Receitas recebidas</span>
                    <span className="tabular-nums">{formatCurrency(receitasRecebidas)}</span>
                  </div>
                )}
                {saidasPagas > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>− Despesas / faturas pagas</span>
                    <span className="tabular-nums">{formatCurrency(saidasPagas)}</span>
                  </div>
                )}
                {totalGastos > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>− Outros gastos lançados</span>
                    <span className="tabular-nums">{formatCurrency(totalGastos)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-slate-700 border-t border-current/20 pt-1 mt-1">
                  <span>Deveria ter em conta</span>
                  <span className="tabular-nums">{formatCurrency(saldoEsperado)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Saldo hoje (real)</span>
                  <span className="tabular-nums">{formatCurrency(saldoHoje!)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prompt para preencher os saldos se ainda não preencheu */}
        {!temSaldoInicial && !temSaldoHoje && (
          <p className="text-xs text-muted-foreground text-center py-1">
            Preencha os saldos acima para ver quanto você gastou sem registrar.
          </p>
        )}
        {temSaldoInicial && !temSaldoHoje && (
          <p className="text-xs text-muted-foreground text-center py-1">
            Informe o <strong>saldo hoje</strong> para ver os gastos não identificados.
          </p>
        )}

        {/* ── Lista de gastos ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {gastos.length === 0 ? 'Nenhum gasto lançado' : `${gastos.length} gasto${gastos.length > 1 ? 's' : ''} lançado${gastos.length > 1 ? 's' : ''}`}
            </p>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar gasto
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <form
              onSubmit={handleAdicionarGasto}
              className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 space-y-2"
            >
              <Input
                placeholder="Ex: Mercado, Farmácia, Uber..."
                value={novoDesc}
                onChange={(e) => setNovoDesc(e.target.value)}
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={novoValor}
                    onChange={(e) => setNovoValor(e.target.value.replace(/[^\d,\.]/g, ''))}
                    className="pl-8"
                  />
                </div>
                <Input
                  type="date"
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={adicionando || !novoDesc || !novoValor}>
                  {adicionando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Lançar'}
                </Button>
              </div>
            </form>
          )}

          {/* Lista */}
          {gastos.length > 0 && (
            <div className="space-y-1">
              {gastos.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-white"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{g.descricao}</p>
                    <p className="text-xs text-muted-foreground">{formatData(g.data_gasto)}</p>
                  </div>
                  <span className="text-sm font-semibold text-rose-500 tabular-nums shrink-0">
                    {formatCurrency(g.valor)}
                  </span>
                  <button
                    onClick={() => handleDeletar(g.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    title="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
