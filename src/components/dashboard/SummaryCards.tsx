import { TrendingUp, TrendingDown, CreditCard, PiggyBank } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { DashboardSummary } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SummaryCardsProps {
  summary: DashboardSummary
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const positivo = summary.saldoPrevisto >= 0

  const cards = [
    {
      title: 'Receitas do mês',
      value: summary.totalReceitas,
      icon: TrendingUp,
      iconColor: 'text-emerald-500',
      valueColor: 'text-emerald-700',
      bg: 'bg-white',
      border: 'border-border',
    },
    {
      title: 'Saídas previstas',
      value: summary.totalDespesas,
      icon: TrendingDown,
      iconColor: 'text-rose-400',
      valueColor: 'text-rose-500',
      bg: 'bg-white',
      border: 'border-border',
    },
    {
      title: 'Fatura do cartão',
      value: summary.totalCartao,
      icon: CreditCard,
      iconColor: 'text-rose-400',
      valueColor: 'text-rose-500',
      bg: 'bg-white',
      border: 'border-border',
    },
    ...(summary.totalReservas > 0
      ? [{
          title: 'Aportes previstos',
          value: summary.totalReservas,
          icon: PiggyBank,
          iconColor: 'text-amber-400',
          valueColor: 'text-amber-600',
          bg: 'bg-white',
          border: 'border-border',
        }]
      : []),
  ]

  return (
    <div className={cn(
      'grid gap-3 items-stretch',
      // Saldo hero + N cards lado a lado
      cards.length === 3
        ? 'grid-cols-2 lg:grid-cols-4'
        : 'grid-cols-2 lg:grid-cols-5'
    )}>

      {/* Hero — Saldo Previsto, ocupa 1 col no mobile, 1 col no lg */}
      <div className={cn(
        'col-span-2 lg:col-span-1 rounded-2xl border px-5 py-4 flex flex-col justify-between',
        positivo
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-rose-50 border-rose-200'
      )}>
        <div className="flex items-center justify-between mb-3">
          <p className={cn(
            'text-[11px] font-semibold uppercase tracking-widest',
            positivo ? 'text-emerald-600' : 'text-rose-400'
          )}>
            Saldo Previsto
          </p>
          <span className={cn(
            'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
            positivo
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-rose-100 text-rose-600'
          )}>
            {positivo ? '↑' : '↓'}
          </span>
        </div>
        <div>
          <p className={cn(
            'text-2xl font-bold tabular-nums leading-none',
            positivo ? 'text-emerald-700' : 'text-rose-600'
          )}>
            {formatCurrency(summary.saldoPrevisto)}
          </p>
          <p className={cn(
            'text-[11px] mt-1.5',
            positivo ? 'text-emerald-500' : 'text-rose-400'
          )}>
            {positivo ? 'sobra estimada do mês' : 'déficit estimado'}
          </p>
        </div>
      </div>

      {/* Cards secundários */}
      {cards.map((card) => (
        <div
          key={card.title}
          className={cn(
            'rounded-2xl border px-5 py-4 flex flex-col justify-between',
            card.bg,
            card.border
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">
              {card.title}
            </p>
            <card.icon className={cn('h-3.5 w-3.5 shrink-0 opacity-60', card.iconColor)} />
          </div>
          <p className={cn('text-xl font-bold tabular-nums leading-none', card.valueColor)}>
            {formatCurrency(card.value)}
          </p>
        </div>
      ))}
    </div>
  )
}
