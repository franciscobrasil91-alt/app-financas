'use client'
import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { criarAplicacao, atualizarAplicacao } from '@/app/(dashboard)/reservas/actions'
import { gerarGradeMeses, mesReferenciaLabelCurto, dateToMesRef } from '@/lib/utils'
import type { Aplicacao } from '@/lib/types'

interface AplicacaoFormProps {
  aplicacao?: Aplicacao
  trigger?: React.ReactNode
  onSaved?: () => void
}

const TIPOS_LABEL: Record<string, string> = {
  poupanca: 'Poupança',
  cdb_rdb: 'CDB/RDB',
  tesouro_direto: 'Tesouro Direto',
  fundos: 'Fundos',
  acoes: 'Ações',
}

export function AplicacaoForm({ aplicacao, trigger, onSaved }: AplicacaoFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tipo, setTipo] = useState(aplicacao?.tipo ?? 'cdb_rdb')
  const [tributacao, setTributacao] = useState(aplicacao?.tributacao ?? 'regressivo')
  const [ativa, setAtiva] = useState(aplicacao?.ativa ?? true)

  const mesInicio = dateToMesRef(new Date())
  const meses = gerarGradeMeses(mesInicio, 24)

  const [valores, setValores] = useState<Record<number, string>>(
    Object.fromEntries(meses.map((m) => {
      const val = aplicacao?.valores?.find((v) => v.mes_referencia === m)?.valor ?? 0
      return [m, val > 0 ? String(val) : '']
    }))
  )

  const [valorBase, setValorBase] = useState('')
  function preencherTodos() {
    const num = parseFloat(valorBase)
    if (!isNaN(num) && num > 0) {
      setValores(Object.fromEntries(meses.map((m) => [m, String(num)])))
    }
  }

  // Poupança é isenta
  const isIsento = tipo === 'poupanca'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const payload = {
      nome: form.get('nome') as string,
      tipo,
      taxa_anual: parseFloat(form.get('taxa_anual') as string) || 0,
      tributacao: isIsento ? 'isento' : tributacao,
      saldo_atual: parseFloat(form.get('saldo_atual') as string) || 0,
      data_inicio: form.get('data_inicio') as string || undefined,
      ativa,
      valores: Object.fromEntries(
        meses.map((m) => [m, parseFloat(valores[m] || '0') || 0])
      ),
    }

    const result = aplicacao
      ? await atualizarAplicacao(aplicacao.id, payload)
      : await criarAplicacao(payload)

    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(aplicacao ? 'Aplicação atualizada!' : 'Aplicação criada!')
      setOpen(false)
      onSaved?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2 bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4" />
            Nova aplicação
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{aplicacao ? 'Editar aplicação' : 'Nova aplicação'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input name="nome" defaultValue={aplicacao?.nome} required autoFocus placeholder="Ex: Tesouro Selic 2026" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPOS_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Taxa anual (%)</Label>
              <Input
                name="taxa_anual"
                type="number"
                step="0.01"
                min="0"
                defaultValue={aplicacao?.taxa_anual ?? ''}
                placeholder="Ex: 12.50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tributação</Label>
              {isIsento ? (
                <div className="h-10 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground flex items-center">
                  Isenta (poupança)
                </div>
              ) : (
                <Select value={tributacao} onValueChange={setTributacao}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regressivo">Regressivo (IR)</SelectItem>
                    <SelectItem value="isento">Isento</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1">
              <Label>Saldo atual (R$)</Label>
              <Input
                name="saldo_atual"
                type="number"
                step="0.01"
                min="0"
                defaultValue={aplicacao?.saldo_atual ?? '0'}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Data de início</Label>
            <Input
              name="data_inicio"
              type="date"
              defaultValue={aplicacao?.data_inicio ?? ''}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={ativa}
              onChange={(e) => setAtiva(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Aplicação ativa</span>
          </label>

          {/* IR info */}
          {tributacao === 'regressivo' && !isIsento && (
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
              <strong>Tabela IR regressiva:</strong> até 6m: 22,5% · até 1a: 20% · até 2a: 17,5% · acima 2a: 15%
            </div>
          )}

          {/* Grade de aportes */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Aportes mensais previstos</Label>
              <div className="flex gap-2 items-center">
                <Input
                  className="h-8 w-28"
                  type="number"
                  step="0.01"
                  placeholder="Aporte base"
                  value={valorBase}
                  onChange={(e) => setValorBase(e.target.value)}
                />
                <Button type="button" variant="outline" size="sm" onClick={preencherTodos}>
                  Replicar todos
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {meses.map((m) => (
                <div key={m} className="space-y-0.5">
                  <Label className="text-xs text-muted-foreground">{mesReferenciaLabelCurto(m)}</Label>
                  <Input
                    className="h-8 text-sm"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={valores[m] ?? ''}
                    onChange={(e) => setValores((prev) => ({ ...prev, [m]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {aplicacao ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
