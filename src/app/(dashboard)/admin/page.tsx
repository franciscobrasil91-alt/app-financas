import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUsuariosPermitidos, adicionarUsuario, removerUsuario } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Shield, Trash2, UserPlus } from 'lucide-react'

export default async function AdminPage() {
  // Só o admin acessa
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/dashboard')

  const usuarios = await getUsuariosPermitidos()

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-indigo-100 rounded-lg p-2">
          <Shield className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Controle de Acesso</h1>
          <p className="text-sm text-muted-foreground">
            {usuarios.length} e-mail{usuarios.length !== 1 ? 's' : ''} autorizado{usuarios.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Formulário para adicionar */}
      <div className="rounded-xl border bg-white p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-indigo-500" />
          Adicionar cliente
        </h2>
        <form action={adicionarUsuario} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="email">E-mail *</Label>
              <Input id="email" name="email" type="email" placeholder="cliente@email.com" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nome">Nome (opcional)</Label>
              <Input id="nome" name="nome" placeholder="Nome do cliente" />
            </div>
          </div>
          <Button type="submit" className="w-full sm:w-auto">
            Adicionar
          </Button>
        </form>
      </div>

      {/* Lista de autorizados */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/30">
          <h2 className="font-semibold text-sm">E-mails autorizados</h2>
        </div>
        {usuarios.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum e-mail cadastrado ainda.
          </p>
        ) : (
          <div className="divide-y">
            {usuarios.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{u.email}</p>
                  {u.nome && <p className="text-xs text-muted-foreground">{u.nome}</p>}
                </div>
                <form action={removerUsuario.bind(null, u.id)}>
                  <button
                    type="submit"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
