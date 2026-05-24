'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Loader2, CreditCard, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getCartoes, getCategorias, criarLancamento } from '@/app/(dashboard)/cartao/actions'
import type { CartaoCredito, Categoria } from '@/lib/types'

const schema = z.object({
  descricao: z.string().min(1, 'Informe a descrição'),
  cartao_id: z.string().min(1, 'Selecione o cartão'),
  categoria_id: z.string().optional(),
  data_compra: z.string().min(1, 'Informe a data'),
  valor_total: z.string().min(1, 'Informe o valor'),
  numero_parcelas: z.string().default('1'),
  meses_recorrencia: z.string().default('24'),
})

type FormData = z.infer<typeof schema>

export function LancamentoRapidoDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingDados, setLoadingDados] = useState(false)
  const [recorrente, setRecorrente] = useState(false)
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      data_compra: new Date().toISOString().split('T')[0],
      numero_parcelas: '1',
      meses_recorrencia: '24',
    },
  })

  const numeroParcelas = parseInt(watch('numero_parcelas') || '1')
  const mesesRecorrencia = parseInt(watch('meses_recorrencia') || '24')
  const valorTotal = parseFloat(watch('valor_total') || '0')
  const valorParcela = !recorrente && numeroParcelas > 1 && valorTotal > 0
    ? (valorTotal / numeroParcelas).toFixed(2)
    : null

  async function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      reset()
      setRecorrente(false)
      return
    }
    // Busca cartões e categorias ao abrir (lazy)
    if (cartoes.length === 0) {
      setLoadingDados(true)
      const [c, cat] = await Promise.all([getCartoes(), getCategorias()])
      setCartoes(c as CartaoCredito[])
      setCategorias(cat as Categoria[])
      setLoadingDados(false)
    }
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    const result = await criarLancamento({
      descricao: data.descricao,
      cartao_id: data.cartao_id,
      categoria_id: data.categoria_id,
      data_compra: data.data_compra,
      valor_total: parseFloat(data.valor_total),
      numero_parcelas: parseInt(data.numero_parcelas),
      recorrente,
      meses_recorrencia: parseInt(data.meses_recorrencia),
    })
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      if (recorrente) {
        toast.success(`Recorrência criada por ${data.meses_recorrencia} meses!`)
      } else if (parseInt(data.numero_parcelas) > 1) {
        toast.success(`${data.numero_parcelas} parcelas lançadas!`)
      } else {
        toast.success('Lançamento adicionado!')
      }
      handleOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors bg-primary/10 text-primary hover:bg-primary/15">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary shrink-0">
            <Plus className="h-3 w-3 text-primary-foreground" />
          </div>
          Lançar no cartão
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lançar no cartão</DialogTitle>
        </DialogHeader>

        {loadingDados ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRecorrente(false)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                  !recorrente
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background hover:bg-muted'
                )}
              >
                <CreditCard className="h-4 w-4" />
                Compra / Parcela
              </button>
              <button
                type="button"
                onClick={() => setRecorrente(true)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                  recorrente
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background hover:bg-muted'
                )}
              >
                <RefreshCw className="h-4 w-4" />
                Recorrente
              </button>
            </div>

            {recorrente && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
                <strong>Assinatura / Recorrência</strong> — cria lançamentos automáticos por X meses
              </div>
            )}

            {/* Descrição */}
            <div className="space-y-1">
              <Label>Descrição *</Label>
              <Input
                placeholder={recorrente ? 'Ex: Netflix, Spotify...' : 'Ex: Supermercado Extra'}
                autoFocus
                {...register('descricao')}
              />
              {errors.descricao && <p className="text-xs text-destructive">{errors.descricao.message}</p>}
            </div>

            {/* Cartão + Categoria */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cartão *</Label>
                <Select onValueChange={(v) => setValue('cartao_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {cartoes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.cartao_id && <p className="text-xs text-destructive">{errors.cartao_id.message}</p>}
              </div>

              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select onValueChange={(v) => setValue('categoria_id', v)}>
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

            {/* Data */}
            <div className="space-y-1">
              <Label>{recorrente ? 'Data de início *' : 'Data da compra *'}</Label>
              <Input type="date" {...register('data_compra')} />
            </div>

            {/* Valor + Parcelas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{recorrente ? 'Valor mensal (R$) *' : 'Valor (R$) *'}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  {...register('valor_total')}
                />
                {errors.valor_total && <p className="text-xs text-destructive">{errors.valor_total.message}</p>}
              </div>

              <div className="space-y-1">
                {recorrente ? (
                  <>
                    <Label>Gerar quantos meses</Label>
                    <Select defaultValue="24" onValueChange={(v) => setValue('meses_recorrencia', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 meses</SelectItem>
                        <SelectItem value="6">6 meses</SelectItem>
                        <SelectItem value="12">12 meses</SelectItem>
                        <SelectItem value="24">24 meses</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <>
                    <Label>Parcelas</Label>
                    <Input type="number" min="1" max="60" {...register('numero_parcelas')} />
                  </>
                )}
              </div>
            </div>

            {/* Previews */}
            {recorrente && valorTotal > 0 && (
              <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm">
                <RefreshCw className="inline h-3.5 w-3.5 mr-1 text-blue-600" />
                <span className="text-blue-700">
                  <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}</strong>
                  {' '}por mês, por <strong>{mesesRecorrencia} meses</strong>
                </span>
              </div>
            )}
            {!recorrente && valorParcela && (
              <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm">
                <span className="text-blue-700">
                  {numeroParcelas}x de{' '}
                  <strong>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(valorParcela))}
                  </strong>
                </span>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {recorrente ? 'Criar recorrência' : 'Lançar'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
