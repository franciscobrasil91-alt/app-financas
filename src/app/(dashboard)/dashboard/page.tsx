import { mesRefPadrao } from '@/lib/utils'
import { getDashboardData, getProjecao } from './actions'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { ProjecaoChart } from '@/components/dashboard/ProjecaoChart'
import { RelatorioDialog } from '@/components/dashboard/RelatorioDialog'
import { MiniChecklist } from '@/components/dashboard/MiniChecklist'
import { createClient } from '@/lib/supabase/server'

interface PageProps {
  searchParams: { mes?: string }
}

function saudacao() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const mesRef = searchParams.mes
    ? parseInt(searchParams.mes)
    : mesRefPadrao()

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const nome = (user?.user_metadata?.nome as string | undefined)
    ?? user?.email?.split('@')[0]
    ?? 'você'
  const primeiroNome = nome.split(' ')[0]

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">{saudacao()},</p>
          <h1 className="text-xl font-serif font-semibold text-foreground">{primeiroNome} 👋</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
