import { mesRefPadrao } from '@/lib/utils'
import { getDashboardData, getProjecao } from './actions'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { ProjecaoChart } from '@/components/dashboard/ProjecaoChart'
import { RelatorioDialog } from '@/components/dashboard/RelatorioDialog'
import { MiniChecklist } from '@/components/dashboard/MiniChecklist'

interface PageProps {
  searchParams: { mes?: string }
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const mesRef = searchParams.mes
    ? parseInt(searchParams.mes)
    : mesRefPadrao()

  const [summary, projecao] = await Promise.all([
    getDashboardData(mesRef),
    getProjecao(mesRef),
  ])

  const defaultSummary = {
    totalReceitas: 0,
    totalDespesas: 0,
    totalCartao: 0,
    totalReservas: 0,
    saldoPrevisto: 0,
    saldoBancario: null,
  }

  const data = summary ?? defaultSummary

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">

      {/* Header — compacto, sem subtítulo */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <div className="flex items-center gap-2">
          <RelatorioDialog />
          <MonthSelector mesAtual={mesRef} />
        </div>
      </div>

      {/* Cards — saldo hero + cards secundários na mesma linha */}
      <SummaryCards summary={data} />

      {/* Bottom row — chart (3/5) + checklist (2/5) para dar mais ar ao checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        <div className="lg:col-span-3">
          <ProjecaoChart key={mesRef} dados={projecao} />
        </div>
        <div className="lg:col-span-2">
          <MiniChecklist mesRef={mesRef} />
        </div>
      </div>

    </div>
  )
}
