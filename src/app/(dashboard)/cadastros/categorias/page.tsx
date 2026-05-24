'use client'
import { useState, useEffect } from 'react'
import { Tag, Plus, Loader2, Pencil, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { DeleteButton } from '@/components/shared/DeleteButton'
import { criarCategoria, atualizarCategoria, deletarCategoria, getCategorias, criarCategoriasPadrao } from './actions'

const TIPOS: Record<string, string> = {
  despesa: 'Despesa',
  receita: 'Receita',
  cartao: 'Cartão',
}

const CORES_SUGERIDAS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#0ea5e9',
]

function CategoriaForm({ cat, onSaved, trigger }: { cat?: any; onSaved?: () => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tipo, setTipo] = useState(cat?.tipo ?? 'despesa')
  const [cor, setCor] = useState(cat?.cor ?? '#6366f1')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const payload = { nome: form.get('nome') as string, tipo, cor }
    const result = cat ? await atualizarCategoria(cat.id, payload) : await criarCategoria(payload)
    setLoading(false)
    if (result?.error) { toast.error(result.error) }
    else { toast.success(cat ? 'Categoria atualizada!' : 'Categoria criada!'); setOpen(false); onSaved?.() }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button className="gap-2"><Plus className="h-4 w-4" />Nova categoria</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{cat ? 'Editar categoria' : 'Nova categoria'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input name="nome" defaultValue={cat?.nome} required autoFocus />
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
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {CORES_SUGERIDAS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: cor === c ? '#1f2937' : 'transparent',
                  }}
                />
              ))}
              <input
                type="color"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} style={{ backgroundColor: cor }}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {cat ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [seedLoading, setSeedLoading] = useState(false)

  async function load() {
    setLoading(true)
    const data = await getCategorias()
    setCategorias(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSeed() {
    setSeedLoading(true)
    const result = await criarCategoriasPadrao()
    setSeedLoading(false)
    if (result?.error) { toast.error(result.error) }
    else { toast.success('Categorias padrão criadas!'); load() }
  }

  const porTipo = categorias.reduce((acc, c) => {
    if (!acc[c.tipo]) acc[c.tipo] = []
    acc[c.tipo].push(c)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 rounded-lg p-2">
            <Tag className="h-5 w-5 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
        </div>
        <div className="flex gap-2">
          {categorias.length === 0 && (
            <Button variant="outline" onClick={handleSeed} disabled={seedLoading} className="gap-2">
              {seedLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Criar categorias padrão
            </Button>
          )}
          <CategoriaForm onSaved={load} />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : categorias.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Tag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma categoria cadastrada.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Clique em "Criar categorias padrão" para começar rapidamente.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(TIPOS).map(([tipo, tipoLabel]) => {
            const lista = porTipo[tipo] ?? []
            if (lista.length === 0) return null
            return (
              <div key={tipo}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  {tipoLabel} ({lista.length})
                </h2>
                <div className="space-y-2">
                  {lista.map((c: any) => (
                    <div key={c.id} className="bg-white rounded-lg border p-3 flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: c.cor }} />
                      <span className="font-medium flex-1">{c.nome}</span>
                      <div className="flex gap-1">
                        <CategoriaForm cat={c} onSaved={load} trigger={
                          <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        } />
                        <DeleteButton
                          action={deletarCategoria.bind(null, c.id)}
                          label="Excluir categoria"
                          description={`Deseja excluir a categoria "${c.nome}"?`}
                          onDeleted={load}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
