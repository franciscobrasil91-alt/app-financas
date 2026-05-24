import { TrendingUp, Pencil } from 'lucide-react'
import { getReceitas, getContas, getCategorias, deletarReceita } from './actions'
import { ReceitaForm } from '@/components/receitas/ReceitaForm'
import { ReceitasProjecaoTable } from '@/components/receitas/ReceitasProjecaoTable'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, dateToMesRef } from '@/lib/utils'
import { DeleteButton } from '@/components/shared/DeleteButton'

const RECEITAS_SUGERIDAS = [
  'Salário', 'Vale Transporte', 'Vale Refeição', 'Comissões',
  '13º Salário', 'Restituição IRPF', 'Freelance',
]

export default async function ReceitasPage() {
  const [receitas, contas, categorias] = await Promise.all([getReceitas(), getContas(), getCategorias()])
  const mesAtual = dateToMesRef(new Date())

  const totalMesAtual = receitas.reduce((sum: number, r: any) => {
    const v = r.valores?.find((v: any) => v.mes_referencia === mesAtual)?.valor ?? 0
    return sum + Number(v)
  }, 0)

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 rounded-lg p-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Receitas</h1>
            <p className="text-sm text-muted-foreground">
              Total este mês:{' '}
              <span className="text-green-600 font-semibold">{formatCurrency(totalMesAtual)}</span>
            </p>
          </div>
        </div>
        <ReceitaForm contas={contas as any} categorias={categorias as any} />
      </div>

      {/* Sugestões se vazio */}
      {receitas.length === 0 && (
        <div className="rounded-lg border bg-green-50 border-green-200 p-4">
          <p className="text-sm font-medium text-green-800 mb-2">Exemplos para começar:</p>
          <div className="flex flex-wrap gap-2">
            {RECEITAS_SUGERIDAS.map((s) => (
              <span key={s} className="text-xs bg-white border border-green-300 text-green-700 rounded-full px-3 py-1">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lista */}
      {receitas.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma receita cadastrada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(receitas as any[]).map((r) => {
            const valorMesAtual = r.valores?.find((v: any) => v.mes_referencia === mesAtual)?.valor ?? 0

            return (
              <div
                key={r.id}
                className={`bg-white rounded-lg border p-4 flex items-center gap-4 ${!r.ativa ? 'opacity-60' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{r.descricao}</span>
                    <Badge variant={r.tipo === 'recorrente' ? 'success' : 'secondary'}>
                      {r.tipo === 'recorrente' ? 'Recorrente' : 'Pontual'}
                    </Badge>
                    {!r.ativa && <Badge variant="outline">Inativa</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {r.categoria && (
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: r.categoria.cor ?? '#6b7280' }}
                        />
                        {r.categoria.nome}
                      </span>
                    )}
                    {r.conta && <span>{r.conta.nome}</span>}
                    {valorMesAtual > 0 && (
                      <span className="text-green-600 font-medium">
                        {formatCurrency(valorMesAtual)} este mês
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 shrink-0">
                  <ReceitaForm
                    contas={contas as any}
                    categorias={categorias as any}
                    receita={r}
                    trigger={
                      <button className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                    }
                  />
                  <DeleteButton
                    action={deletarReceita.bind(null, r.id)}
                    label="Excluir receita"
                    description={`Deseja excluir a receita "${r.descricao}"?`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Projeção por categoria */}
      {receitas.length > 0 && (
        <ReceitasProjecaoTable receitas={receitas as any} mesInicio={mesAtual} />
      )}
    </div>
  )
}
