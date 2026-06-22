'use client'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Layers, RefreshCw, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { atualizarLancamento, cancelarRecorrencia } from '@/app/(dashboard)/cartao/actions'
import type { LancamentoCartao, Categoria } from '@/lib/types'

const schema = z.object({
  descricao: z.string().min(1, 'Informe a descrição'),
  categoria_id: z.string().optional(),
  valor_parcela: z.string().min(1, 'Informe o valor'),
  data_compra: z.string().min(1, 'Informe a data'),
})

type FormData = z.infer<typeof schema>

interface EditLancamentoDialogProps {
  lancamento: LancamentoCartao | null
  categorias: Categoria[]
  onClose: () => void
}

export function EditLancamentoDialog({ lancamento, categorias, onClose }: EditLancamentoDialogProps) {
  const [loading, setLoading] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false)
  const isGrupo = !!lancamento && (lancamento.numero_parcelas > 1 || (lancamento as any).recorrente)
  const isRecorrente = !!(lancamento as any)?.recorrente

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const categoriaAtualId = (lancamento?.categoria as any)?.id ?? 'none'

  useEffect(() => {
    if (lancamento) {
      reset({
        descricao: lancamento.descricao,
        categoria_id: categoriaAtualId === 'none' ? undefined : categoriaAtualId,
        valor_parcela: String(lancamento.valor_parcela),
        data_compra: lancamento.data_compra,
      })
    }
  }, [lancamento, reset])

  async function handleCancelarAssinatura() {
    if (!lancamento) return
    setCancelando(true)
    const mesRef = (lancamento as any).mes_referencia as number
    const result = await cancelarRecorrencia(lancamento.id, mesRef)
    setCancelando(false)
    if (result?.error) {
      toast.error('Erro ao cancelar assinatura')
    } else {
      toast.success('Assinatura cancelada! O histórico dos meses anteriores foi preservado.')
      onClose()
    }
  }

  async function salvar(data: FormData, atualizarGrupo: boolean) {
    if (!lancamento) return
    setLoading(true)
    const result = await atualizarLancamento(
      lancamento.id,
      {
        descricao: data.descricao,
        categoria_id: data.categoria_id,
        valor_parcela: parseFloat(data.valor_parcela),
        data_compra: data.data_compra,
      },
      atualizarGrupo
    )
    setLoading(false)
    if (result?.error) {
      toast.error('Erro ao atualizar lançamento')
    } else {
      toast.success(atualizarGrupo ? 'Todos os lançamentos atualizados!' : 'Lançamento atualizado!')
      onClose()
    }
  }

  return (
    <Dialog open={!!lancamento} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar lançamento</DialogTitle>
        </DialogHeader>

        {isGrupo && (
          <div className="rounded-md bg-orange-50 border border-orange-200 p-3 text-sm text-orange-800">
            {isRecorrente ? (
              <><RefreshCw className="inline h-4 w-4 mr-1" />Cobrança recorrente — você poderá salvar só este mês ou atualizar todos os meses.</>
            ) : (
              <><Layers className="inline h-4 w-4 mr-1" />Compra parcelada — você poderá salvar só esta parcela ou todas.</>
            )}
          </div>
        )}

        <form className="space-y-4">
          {/* Descrição */}
          <div className="space-y-1">
            <Label>Descrição *</Label>
            <Input {...register('descricao')} />
            {errors.descricao && <p className="text-xs text-destructive">{errors.descricao.message}</p>}
          </div>

          {/* Categoria */}
          <div className="space-y-1">
            <Label>Categoria</Label>
            <Select
              defaultValue={categoriaAtualId}
              onValueChange={(v) => setValue('categoria_id', v === 'none' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data + Valor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Data da compra *</Label>
              <Input type="date" {...register('data_compra')} />
              {errors.data_compra && <p className="text-xs text-destructive">{errors.data_compra.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Valor da parcela (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                {...register('valor_parcela')}
              />
              {errors.valor_parcela && <p className="text-xs text-destructive">{errors.valor_parcela.message}</p>}
            </div>
          </div>

          <DialogFooter className="gap-2 flex-wrap">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            {isGrupo && (
              <Button
                type="button"
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
                disabled={loading}
                onClick={handleSubmit((data) => salvar(data, true))}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isRecorrente ? 'Atualizar toda recorrência' : 'Atualizar todas as parcelas'}
              </Button>
            )}
            <Button
              type="button"
              disabled={loading}
              onClick={handleSubmit((data) => salvar(data, false))}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isGrupo ? (isRecorrente ? 'Salvar só este mês' : 'Salvar só esta parcela') : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>

        {/* Cancelar assinatura — só para recorrentes */}
        {isRecorrente && (
          <div className="border-t pt-4 mt-2">
            {!confirmarCancelamento ? (
              <button
                type="button"
                onClick={() => setConfirmarCancelamento(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancelar assinatura a partir deste mês
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-destructive font-medium">
                  O histórico dos meses anteriores será preservado. Deseja cancelar esta assinatura a partir de agora?
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={() => setConfirmarCancelamento(false)}
                  >
                    Não
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={handleCancelarAssinatura}
                    disabled={cancelando}
                  >
                    {cancelando && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    Sim, cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
