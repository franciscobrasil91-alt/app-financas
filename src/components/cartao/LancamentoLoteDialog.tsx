'use client'
import { useState } from 'react'
import { Plus, Trash2, Loader2, ListPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from '@/components/ui/dialog'
import { criarLancamentosLote } from '@/app/(dashboard)/cartao/actions'
import { formatCurrency } from '@/lib/utils'
import type { CartaoCredito, Categoria } from '@/lib/types'

interface Item {
  id: number
  descricao: string
  valor: string
  categoria_id: string
}

interface LancamentoLoteDialogProps {
  cartoes: CartaoCredito[]
  categorias: Categoria[]
}

let nextId = 1
function novoItem(): Item {
  return { id: nextId++, descricao: '', valor: '', categoria_id: 'none' }
}

export function LancamentoLoteDialog({ cartoes, categorias }: LancamentoLoteDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cartaoId, setCartaoId] = useState(cartoes[0]?.id ?? '')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [itens, setItens] = useState<Item[]>([novoItem(), novoItem(), novoItem()])

  function resetar() {
    setCartaoId(cartoes[0]?.id ?? '')
    setData(new Date().toISOString().split('T')[0])
    setItens([novoItem(), novoItem(), novoItem()])
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) resetar()
  }

  function atualizarItem(id: number, campo: keyof Item, valor: string) {
    setItens((prev) => prev.map((it) => it.id === id ? { ...it, [campo]: valor } : it))
  }

  function adicionarLinha() {
    setItens((prev) => [...prev, novoItem()])
  }

  function removerLinha(id: number) {
    if (itens.length <= 1) return
    setItens((prev) => prev.filter((it) => it.id !== id))
  }

  function parseValor(v: string) {
    return parseFloat(v.replace(',', '.')) || 0
  }

  // Filtra apenas itens preenchidos (descrição + valor > 0)
  const itensValidos = itens.filter(
    (it) => it.descricao.trim().length > 0 && parseValor(it.valor) > 0
  )

  const total = itensValidos.reduce((s, it) => s + parseValor(it.valor), 0)

  async function salvar() {
    if (!cartaoId) { toast.error('Selecione o cartão'); return }
    if (!data) { toast.error('Informe a data'); return }
    if (itensValidos.length === 0) {
      toast.error('Preencha ao menos um lançamento com descrição e valor')
      return
    }

    setLoading(true)
    const result = await criarLancamentosLote({
      cartao_id: cartaoId,
      data_compra: data,
      itens: itensValidos.map((it) => ({
        descricao: it.descricao.trim(),
        valor: parseValor(it.valor),
        categoria_id: it.categoria_id !== 'none' ? it.categoria_id : undefined,
      })),
    })
    setLoading(false)

    if (result?.error) {
      toast.error('Erro ao salvar: ' + result.error)
    } else {
      toast.success(`${itensValidos.length} lançamento${itensValidos.length !== 1 ? 's' : ''} criado${itensValidos.length !== 1 ? 's' : ''}!`)
      handleOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ListPlus className="h-4 w-4" />
          Lançar vários
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="h-5 w-5" />
            Lançamento em lote
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Campos fixos */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Cartão (fixo para todos)</Label>
              <Select value={cartaoId} onValueChange={setCartaoId}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {cartoes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Data (fixa para todos)</Label>
              <Input
                type="date"
                className="h-8"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
          </div>

          {/* Cabeçalho da tabela */}
          <div className="grid grid-cols-[1fr_28px_110px_130px] gap-2 px-1">
            <span className="text-xs font-medium text-muted-foreground">Descrição</span>
            <span />
            <span className="text-xs font-medium text-muted-foreground">Valor (R$)</span>
            <span className="text-xs font-medium text-muted-foreground">Categoria</span>
          </div>

          {/* Linhas */}
          <div className="space-y-2">
            {itens.map((it, idx) => (
              <div key={it.id} className="grid grid-cols-[1fr_28px_110px_130px] gap-2 items-center">
                {/* Descrição */}
                <Input
                  className="h-8 text-sm"
                  placeholder={`Ex: Almoço ${idx + 1}`}
                  value={it.descricao}
                  onChange={(e) => atualizarItem(it.id, 'descricao', e.target.value)}
                />

                {/* Remover */}
                <button
                  type="button"
                  onClick={() => removerLinha(it.id)}
                  disabled={itens.length <= 1}
                  className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                {/* Valor */}
                <Input
                  className="h-8 text-sm"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={it.valor}
                  onChange={(e) => atualizarItem(it.id, 'valor', e.target.value)}
                />

                {/* Categoria */}
                <Select
                  value={it.categoria_id}
                  onValueChange={(v) => atualizarItem(it.id, 'categoria_id', v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Botão adicionar linha */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={adicionarLinha}
            className="gap-1.5 text-muted-foreground hover:text-foreground w-full border border-dashed"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar linha
          </Button>

          {/* Resumo */}
          {itensValidos.length > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-2.5 border">
              <span className="text-sm text-muted-foreground">
                {itensValidos.length} lançamento{itensValidos.length !== 1 ? 's' : ''}
              </span>
              <span className="text-base font-bold text-red-600">
                {formatCurrency(total)}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={loading || itensValidos.length === 0}>
            {loading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
              : `Lançar ${itensValidos.length > 0 ? itensValidos.length : ''} item${itensValidos.length !== 1 ? 'ns' : ''}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
