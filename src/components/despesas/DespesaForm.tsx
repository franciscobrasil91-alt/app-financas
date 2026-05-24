'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { criarDespesa, atualizarDespesa } from '@/app/(dashboard)/despesas/actions'
import { gerarGradeMeses, mesReferenciaLabelCurto, dateToMesRef, addMonthsToRef } from '@/lib/utils'
import type { Categoria, ContaBancaria, CartaoCredito, Despesa, TipoDespesa } from '@/lib/types'

interface DespesaFormProps {
  categorias: Categoria[]
  contas: ContaBancaria[]
  cartoes: CartaoCredito[]
  despesa?: Despesa
  onSaved?: () => void
  trigger?: React.ReactNode
}

const MESES_GRADE = 24

export function DespesaForm({ categorias, contas, cartoes, despesa, onSaved, trigger }: DespesaFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const mesInicio = dateToMesRef(new Date())
  const meses = gerarGradeMeses(mesInicio, MESES_GRADE)

  // Inicializa grade de valores
  const defaultValores: Record<string, string> = {}
  meses.forEach((m) => {
    const val = despesa?.valores?.find((v) => v.mes_referencia === m)?.valor ?? 0
    defaultValores[`valor_${m}`] = val > 0 ? String(val) : ''
  })

  const [tipo, setTipo] = useState(despesa?.tipo ?? 'fixa')
  const [valores, setValores] = useState<Record<number, string>>(
    Object.fromEntries(meses.map((m) => {
      const val = despesa?.valores?.find((v) => v.mes_referencia === m)?.valor ?? 0
      return [m, val > 0 ? String(val) : '']
    }))
  )
  const [ativa, setAtiva] = useState(despesa?.ativa ?? true)

  // ── Pontual ──
  const [pontualValor, setPontualValor] = useState(() => {
    if (despesa?.tipo === 'pontual' && despesa.valores?.length) {
      const v = despesa.valores.find((v) => Number(v.valor) > 0)
      return v ? String(v.valor) : ''
    }
    return ''
  })
  const [pontualMesInicio, setPontualMesInicio] = useState(() => {
    if (despesa?.tipo === 'pontual' && despesa.valores?.length) {
      const comValor = despesa.valores.filter((v) => Number(v.valor) > 0)
      return comValor.length ? String(Math.min(...comValor.map((v) => v.mes_referencia))) : String(mesInicio)
    }
    return String(mesInicio)
  })
  const [pontualNVezes, setPontualNVezes] = useState(() => {
    if (despesa?.tipo === 'pontual' && despesa.valores?.length) {
      return String(despesa.valores.filter((v) => Number(v.valor) > 0).length)
    }
    return '1'
  })

  // Para preencher todos os meses com o mesmo valor
  const [valorBase, setValorBase] = useState('')
  function parseValor(v: string) {
    return parseFloat(v.replace(',', '.'))
  }
  function preencherTodos() {
    const num = parseValor(valorBase)
    if (!isNaN(num) && num > 0) {
      setValores(Object.fromEntries(meses.map((m) => [m, String(num)])))
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = new FormData(e.currentTarget)
    // Para pontual: gera valores para N meses a partir do mês de início
    let valoresFinais: Record<number, number>
    if (tipo === 'pontual') {
      const val = parseValor(pontualValor) || 0
      const inicio = parseInt(pontualMesInicio)
      const nVezes = parseInt(pontualNVezes) || 1
      valoresFinais = Object.fromEntries(
        Array.from({ length: nVezes }, (_, i) => [addMonthsToRef(inicio, i), val])
      )
    } else {
      valoresFinais = Object.fromEntries(
        meses.map((m) => [m, parseValor(valores[m] || '0') || 0])
      )
    }

    const payload = {
      descricao: form.get('descricao') as string,
      tipo,
      categoria_id: form.get('categoria_id') as string || undefined,
      dia_vencimento: form.get('dia_vencimento') ? parseInt(form.get('dia_vencimento') as string) : undefined,
      conta_id: form.get('conta_id') as string || undefined,
      cartao_id: form.get('cartao_id') as string || undefined,
      ativa,
      valores: valoresFinais,
    }

    const result = despesa
      ? await atualizarDespesa(despesa.id, payload)
      : await criarDespesa(payload)

    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(despesa ? 'Despesa atualizada!' : 'Despesa criada!')
      setOpen(false)
      onSaved?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nova despesa
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{despesa ? 'Editar despesa' : 'Nova despesa prevista'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Descrição */}
          <div className="space-y-1">
            <Label>Descrição *</Label>
            <Input name="descricao" defaultValue={despesa?.descricao} required autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Tipo */}
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoDespesa)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixa">Fixa</SelectItem>
                  <SelectItem value="estimada">Estimada</SelectItem>
                  <SelectItem value="sazonal">Sazonal</SelectItem>
                  <SelectItem value="pontual">Pontual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Categoria */}
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select name="categoria_id" defaultValue={despesa?.categoria_id ?? ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Dia vencimento */}
            <div className="space-y-1">
              <Label>Dia vencimento</Label>
              <Input
                name="dia_vencimento"
                type="number"
                min="1"
                max="31"
                defaultValue={despesa?.dia_vencimento ?? ''}
                placeholder="Ex: 10"
              />
            </div>

            {/* Conta */}
            <div className="space-y-1">
              <Label>Conta</Label>
              <Select name="conta_id" defaultValue={despesa?.conta_id ?? ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {contas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cartão */}
            <div className="space-y-1">
              <Label>Cartão</Label>
              <Select name="cartao_id" defaultValue={despesa?.cartao_id ?? ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {cartoes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Ativa */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={ativa}
              onChange={(e) => setAtiva(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Despesa ativa</span>
          </label>

          {/* Valores — layout diferente por tipo */}
          <div className="border-t pt-4">
            {tipo === 'pontual' ? (
              // ── UI simplificada para Pontual ──
              <div className="space-y-3">
                <div>
                  <Label className="text-base font-semibold">Configuração da despesa pontual</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Define valor, quando começa e quantas vezes vai ocorrer. Arquiva automaticamente depois.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Valor por mês (R$) *</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={pontualValor}
                      onChange={(e) => setPontualValor(e.target.value.replace(/[^\d,\.]/g, ''))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Mês de início *</Label>
                    <Select value={pontualMesInicio} onValueChange={setPontualMesInicio}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {gerarGradeMeses(mesInicio, 12).map((m) => (
                          <SelectItem key={m} value={String(m)}>
                            {mesReferenciaLabelCurto(m)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Quantas vezes *</Label>
                    <Select value={pontualNVezes} onValueChange={setPontualNVezes}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n === 1 ? '1 vez' : `${n} vezes`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Preview dos meses */}
                {pontualValor && parseValor(pontualValor) > 0 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
                    {Array.from({ length: parseInt(pontualNVezes) || 1 }, (_, i) =>
                      mesReferenciaLabelCurto(addMonthsToRef(parseInt(pontualMesInicio), i))
                    ).join(' · ')}
                    {' '}→ arquiva automaticamente depois
                  </div>
                )}
              </div>
            ) : (
              // ── Grade 24 meses para fixa/estimada/sazonal ──
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Valores mensais (24 meses)</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      className="h-8 w-28"
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
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
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={valores[m] ?? ''}
                        onChange={(e) => setValores((prev) => ({ ...prev, [m]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {despesa ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
