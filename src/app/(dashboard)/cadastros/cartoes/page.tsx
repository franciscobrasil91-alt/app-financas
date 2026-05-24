'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CreditCard, Plus, Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { DeleteButton } from '@/components/shared/DeleteButton'
import { criarCartao, atualizarCartao, deletarCartao, getCartoes } from './actions'
import { formatCurrency } from '@/lib/utils'
import { useEffect } from 'react'

const schema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  banco: z.string().optional(),
  dia_fechamento: z.string().transform(Number).pipe(z.number().min(1).max(31)),
  dia_vencimento: z.string().transform(Number).pipe(z.number().min(1).max(31)),
  limite: z.string().transform(Number).pipe(z.number().min(0)),
})

type FormData = z.infer<typeof schema>

function CartaoForm({ cartao, onSaved, trigger }: { cartao?: any; onSaved?: () => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ativa, setAtiva] = useState(cartao?.ativa ?? true)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: cartao ? {
      nome: cartao.nome,
      banco: cartao.banco ?? '',
      dia_fechamento: String(cartao.dia_fechamento),
      dia_vencimento: String(cartao.dia_vencimento),
      limite: String(cartao.limite),
    } : undefined,
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const payload = { ...data, ativa }
    const result = cartao
      ? await atualizarCartao(cartao.id, payload as any)
      : await criarCartao(payload as any)
    setLoading(false)
    if (result?.error) { toast.error(result.error) }
    else { toast.success(cartao ? 'Cartão atualizado!' : 'Cartão criado!'); setOpen(false); onSaved?.() }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button className="gap-2"><Plus className="h-4 w-4" />Novo cartão</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{cartao ? 'Editar cartão' : 'Novo cartão'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input {...register('nome')} autoFocus />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Banco</Label>
            <Input {...register('banco')} placeholder="Ex: Nubank, Itaú..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Dia fechamento *</Label>
              <Input {...register('dia_fechamento')} type="number" min="1" max="31" />
              {errors.dia_fechamento && <p className="text-xs text-destructive">Inválido</p>}
            </div>
            <div className="space-y-1">
              <Label>Dia vencimento *</Label>
              <Input {...register('dia_vencimento')} type="number" min="1" max="31" />
              {errors.dia_vencimento && <p className="text-xs text-destructive">Inválido</p>}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Limite (R$)</Label>
            <Input {...register('limite')} type="number" step="0.01" min="0" defaultValue="0" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} className="rounded" />
            <span className="text-sm">Cartão ativo</span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {cartao ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function CartoesPage() {
  const [cartoes, setCartoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const data = await getCartoes()
    setCartoes(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 rounded-lg p-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Cartões de Crédito</h1>
        </div>
        <CartaoForm onSaved={load} />
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : cartoes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum cartão cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cartoes.map((c) => (
            <div key={c.id} className={`bg-white rounded-lg border p-4 flex items-center gap-4 ${!c.ativa ? 'opacity-60' : ''}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.nome}</span>
                  {c.banco && <span className="text-sm text-muted-foreground">· {c.banco}</span>}
                  {!c.ativa && <Badge variant="outline">Inativo</Badge>}
                </div>
                <div className="mt-1 text-sm text-muted-foreground flex gap-4">
                  <span>Fecha dia {c.dia_fechamento}</span>
                  <span>Vence dia {c.dia_vencimento}</span>
                  {c.limite > 0 && <span>Limite: {formatCurrency(c.limite)}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <CartaoForm cartao={c} onSaved={load} trigger={
                  <button className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                } />
                <DeleteButton
                  action={deletarCartao.bind(null, c.id)}
                  label="Excluir cartão"
                  description={`Deseja excluir o cartão "${c.nome}"? Todos os lançamentos serão excluídos.`}
                  onDeleted={load}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
