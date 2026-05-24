'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ReferenceLine,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { ProjecaoMes } from '@/lib/types'

interface ProjecaoChartProps {
  dados: ProjecaoMes[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const receitas = payload.find((p: any) => p.dataKey === 'receitas')?.value ?? 0
  const saidas   = payload.find((p: any) => p.dataKey === 'saidas')?.value ?? 0
  const saldo    = receitas - saidas
  const positivo = saldo >= 0
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-4 text-sm min-w-[200px]">
      <p className="font-bold text-slate-700 mb-3 capitalize text-base">{label}</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2.5 w-2.5 rounded-sm bg-indigo-400 inline-block" />Receitas
          </span>
          <span className="font-semibold text-indigo-600">{formatCurrency(receitas)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-400 inline-block" />Saídas
          </span>
          <span className="font-semibold text-rose-500">{formatCurrency(saidas)}</span>
        </div>
        <div className="border-t border-slate-100 pt-2 flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className={`h-2.5 w-2.5 rounded-full inline-block ${positivo ? 'bg-emerald-400' : 'bg-red-500'}`} />Saldo
          </span>
          <span className={`font-bold text-base ${positivo ? 'text-emerald-600' : 'text-red-600'}`}>
            {positivo ? '+' : ''}{formatCurrency(saldo)}
          </span>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-3 text-center">Clique para abrir o mês</p>
    </div>
  )
}

const SaldoDot = (props: any) => {
  const { cx, cy, payload } = props
  const positivo = payload.receitas >= payload.saidas
  return (
    <circle cx={cx} cy={cy} r={4}
      fill={positivo ? '#10b981' : '#ef4444'}
      stroke="white" strokeWidth={2} />
  )
}

export function ProjecaoChart({ dados }: ProjecaoChartProps) {
  const router = useRouter()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    // setTimeout garante que o browser já pintou o layout do CSS Grid
    const t = setTimeout(() => {
      if (wrapperRef.current) {
        setWidth(wrapperRef.current.getBoundingClientRect().width)
      }
    }, 100)

    const onResize = () => {
      if (wrapperRef.current) {
        setWidth(wrapperRef.current.getBoundingClientRect().width)
      }
    }
    window.addEventListener('resize', onResize)

    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  function handleClick(data: any) {
    if (data?.activePayload?.[0]?.payload?.mes) {
      router.push(`/dashboard?mes=${data.activePayload[0].payload.mes}`)
    }
  }

  const rawMax = dados.length > 0
    ? Math.max(...dados.map((d) => Math.max(d.receitas, d.saidas)))
    : 0
  const maxVal = rawMax > 0 ? rawMax * 1.15 : 1000

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
            Projeção — próximos 6 meses
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Clique em um mês para abrir o detalhe</p>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-indigo-400 inline-block" />Receitas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-rose-400 inline-block" />Saídas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-5 rounded-full bg-emerald-400 inline-block" />Saldo
          </span>
        </div>
      </div>

      {/* Chart area */}
      <div ref={wrapperRef} style={{ width: '100%', height: 260 }}>
        {width > 0 && dados.length > 0 && (
          <ComposedChart
            width={width}
            height={260}
            data={dados}
            margin={{ top: 10, right: 16, left: 0, bottom: 4 }}
            onClick={handleClick}
            style={{ cursor: 'pointer' }}
          >
            <defs>
              <linearGradient id="gradReceitas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818cf8" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="gradReceitasDeficit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fca5a5" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#f87171" stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="gradSaidas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" stopOpacity={0.85} />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.65} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

            <XAxis
              dataKey="mesLabel"
              tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
              }
              domain={[0, maxVal]}
              width={52}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 8 }} />
            <ReferenceLine y={0} stroke="#e2e8f0" />

            <Bar dataKey="receitas" name="Receitas" radius={[6, 6, 0, 0]} maxBarSize={44}>
              {dados.map((entry, i) => (
                <Cell key={i} fill={entry.deficit ? 'url(#gradReceitasDeficit)' : 'url(#gradReceitas)'} />
              ))}
            </Bar>

            <Bar dataKey="saidas" name="Saídas" fill="url(#gradSaidas)" radius={[6, 6, 0, 0]} maxBarSize={44} />

            <Line
              type="monotone"
              dataKey="saldo"
              name="Saldo"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={<SaldoDot />}
              activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }}
              connectNulls
            />
          </ComposedChart>
        )}

        {width > 0 && dados.length === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Nenhum dado de projeção disponível.
          </div>
        )}
      </div>

      {/* Legenda mobile */}
      <div className="flex sm:hidden justify-center gap-4 mt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-indigo-400 inline-block" />Receitas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-rose-400 inline-block" />Saídas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-5 rounded-full bg-emerald-400 inline-block" />Saldo
        </span>
      </div>
    </div>
  )
}
