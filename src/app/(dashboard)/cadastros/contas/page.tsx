'use client'
import { useState, useEffect } from 'react'
import { Wallet, Plus, Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { DeleteButton } from '@/components/shared/DeleteButton'
import { criarConta, atualizarConta, deletarConta, getContas } from './actions'

const TIPOS: Record<string, string> = {
  corrente: 'Conta Corrente',
  poupanca: 'Poupança',
  digital: 'Conta Digital',
}

function ContaForm({ conta, onSaved, trigger }: { conta?: any; onSaved?: () => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tipo, setTipo] = useState(conta?.tipo ?? 'corrente')
  const [ativa, setAtiva] = useState(conta?.ativa ?? true)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const payload = {
      nome: form.get('nome') as string,
      banco: form.get('banco') as string || undefined,
      tipo,
      ativa,
    }
    const result = conta ? await atualizarConta(conta.id, payload) : await criarConta(payload)
    setLoading(false)
    if (result?.error) { toast.error(result.error) }
    else { toast.success(conta ? 'Conta atualizada!' : 'Conta criada!'); setOpen(false); onSaved?.() }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button className="gap-2"><Plus className="h-4 w-4" />Nova conta</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{conta ? 'Editar conta' : 'Nova conta bancária'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input name="nome" defaultValue={conta?.nome} required autoFocus placeholder="Ex: Conta Corrente" />
          </div>
          <div className="space-y-1">
            <Label>Banco</Label>
            <Input name="banco" defaultValue={conta?.banco ?? ''} placeholder="Ex: Nubank, Bradesco..." />
          </div>
          <div className="space-y-1">
            <Label>Tipo *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TIPOS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} className="rounded" />
            <span className="text-sm">Conta ativa</span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {conta ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function ContasPage() {
  const [contas, setContas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const data = await getContas()
    setContas(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 rounded-lg p-2">
            <Wallet className="h-5 w-5 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Contas Bancárias</h1>
        </div>
        <ContaForm onSaved={load} />
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : contas.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Wallet className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma conta cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contas.map((c) => (
            <div key={c.id} className={`bg-white rounded-lg border p-4 flex items-center gap-4 ${!c.ativa ? 'opacity-60' : ''}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.nome}</span>
                  {c.banco && <span className="text-sm text-muted-foreground">· {c.banco}</span>}
                  {!c.ativa && <Badge variant="outline">Inativa</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{TIPOS[c.tipo] ?? c.tipo}</p>
              </div>
              <div className="flex gap-1">
                <ContaForm conta={c} onSaved={load} trigger={
                  <button className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                } />
                <DeleteButton
                  action={deletarConta.bind(null, c.id)}
                  label="Excluir conta"
                  description={`Deseja excluir a conta "${c.nome}"?`}
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
