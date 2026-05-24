import { Receipt } from 'lucide-react'
import { getDespesas, getContas, getCategoriasAll, getCartoesAll, autoArquivarPontuais } from './actions'
import { DespesaForm } from '@/components/despesas/DespesaForm'
import { DespesasList } from '@/components/despesas/DespesasList'

export default async function DespesasPage() {
  await autoArquivarPontuais()

  const [despesas, contas, categorias, cartoes] = await Promise.all([
    getDespesas(),
    getContas(),
    getCategoriasAll(),
    getCartoesAll(),
  ])

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 rounded-lg p-2">
            <Receipt className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Despesas Previstas</h1>
            <p className="text-sm text-muted-foreground">
              {despesas.length} despesa{despesas.length !== 1 ? 's' : ''} cadastrada{despesas.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <DespesaForm categorias={categorias as any} contas={contas as any} cartoes={cartoes as any} />
      </div>

      {/* Lista com filtros */}
      {despesas.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma despesa cadastrada ainda.</p>
        </div>
      ) : (
        <DespesasList
          despesas={despesas as any[]}
          categorias={categorias as any}
          contas={contas as any}
          cartoes={cartoes as any}
        />
      )}
    </div>
  )
}
