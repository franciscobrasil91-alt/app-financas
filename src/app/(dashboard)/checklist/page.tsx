import { mesRefPadrao, mesReferenciaLabel } from '@/lib/utils'
import { getChecklistData, getSaldoInicial, getGastosAvista } from './actions'
import { ChecklistPanel } from '@/components/checklist/ChecklistSection'
import { GastosAvistaPanel } from '@/components/checklist/GastosAvistaPanel'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { LayoutGrid } from 'lucide-react'

interface PageProps {
  searchParams: { mes?: string }
}

export default async function ChecklistPage({ searchParams }: PageProps) {
  const mesRef = searchParams.mes
    ? parseInt(searchParams.mes)
    : mesRefPadrao()

  const [data, saldoInicial, gastos] = await Promise.all([
    getChecklistData(mesRef),
    getSaldoInicial(mesRef),
    getGastosAvista(mesRef),
  ])

  // Calcula o que já entrou e saiu conforme o checklist salvo no banco
  const receitasRecebidas = data.receitas
    .filter((r) => data.concluidos[`receita:${r.id}`])
    .reduce((s, r) => s + r.valor, 0)

  const saidasPagas =
    data.despesas
      .filter((d) => data.concluidos[`despesa:${d.id}`])
      .reduce((s, d) => s + d.valor, 0) +
    data.faturas
      .filter((f) => data.concluidos[`cartao:${f.cartao_id}`])
      .reduce((s, f) => s + f.total, 0)

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 rounded-lg p-2">
            <LayoutGrid className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Controle Mensal</h1>
            <p className="text-sm text-muted-foreground capitalize">
              {mesReferenciaLabel(mesRef)}
            </p>
          </div>
        </div>
        <MonthSelector mesAtual={mesRef} />
      </div>

      {/* Controle de gastos à vista */}
      <GastosAvistaPanel
        key={mesRef}
        mesRef={mesRef}
        saldoInicialDb={saldoInicial}
        gastosIniciais={gastos}
        receitasRecebidas={receitasRecebidas}
        saidasPagas={saidasPagas}
      />

      {/* Checklist de receitas, despesas e faturas */}
      <ChecklistPanel
        key={`checklist-${mesRef}`}
        faturas={data.faturas}
        despesas={data.despesas}
        receitas={data.receitas}
        concluidos={data.concluidos}
        mesRef={mesRef}
      />
    </div>
  )
}
