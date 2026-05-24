'use client'
import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { criarReceita, atualizarReceita } from '@/app/(dashboard)/receitas/actions'
import { gerarGradeMeses, mesReferenciaLabelCurto, dateToMesRef } from '@/lib/utils'
import type { ContaBancaria, Categoria, Receita } from '@/lib/types'

interface ReceitaFormProps {
  contas: ContaBancaria[]
  categorias: Categoria[]
  receita?: Receita
  trigger?: React.ReactNode
  onSaved?: () => void
}

export function ReceitaForm({ contas, categorias, receita, trigger, onSaved }: ReceitaFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tipo, setTipo] = useState(receita?.tipo ?? 'recorrente')
  const [ativa, setAtiva] = useState(receita?.ativa ?? true)
  const [categoriaId, setCategoriaId] = useState(receita?.categoria_id ?? 'none')

  const mesInicio = dateToMesRef(new Date())
  const meses = gerarGradeMeses(mesInicio, 24)

  const [valores, setValores] = useState<Record<number, string>>(
    Object.fromEntries(meses.map((m) => {
      const val = receita?.valores?.find((v) => v.mes_referencia === m)?.valor ?? 0
      return [m, val > 0 ? String(val) : '']
    }))
  )

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
    const payload = {
      descricao: form.get('descricao') as string,
      tipo,
      conta_id: form.get('conta_id') as string || undefined,
      categoria_id: categoriaId === 'none' ? undefined : categoriaId,
      ativa,
      valores: Object.fromEntries(
        meses.map((m) => [m, parseValor(valores[m] || '0') || 0])
      ),
    }

    const result = receita
      ? await atualizarReceita(receita.id, payload)
      : await criarReceita(payload)

    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(receita ? 'Receita atualizada!' : 'Receita criada!')
      setOpen(false)
      onSaved?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2 bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4" />
            Nova receita
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{receita ? 'Editar receita' : 'Nova receita'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Descrição *</Label>
            <Input name="descricao" defaultValue={receita?.descricao} required autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recorrente">Recorrente</SelectItem>
                  <SelectItem value="pontual">Pontual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={categoriaId} onValueChange={setCategoriaId}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Conta de destino</Label>
            <Select name="conta_id" defaultValue={receita?.conta_id ?? ''}>
              <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                {contas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={ativa}
              onChange={(e) => setAtiva(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Receita ativa</span>
          </label>

          {/* Grade de valores */}
          <div className="space-y-3 border-t pt-4">
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {receita ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
