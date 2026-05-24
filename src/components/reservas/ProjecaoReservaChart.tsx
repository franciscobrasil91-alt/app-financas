'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { formatCurrency, projetarAplicacao, dateToMesRef } from '@/lib/utils'
import type { Aplicacao } from '@/lib/types'

interface ProjecaoReservaChartProps {
  aplicacoes: Aplicacao[]
}

const CORES = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#14b8a6']

export function ProjecaoReservaChart({ aplicacoes }: ProjecaoReservaChartProps) {
  const mesInicio = dateToMesRef(new Date())
  const ativas = aplicacoes.filter((a) => a.ativa)

  if (ativas.length === 0) return null

  // Projeta cada aplicação
  const projections = ativas.map((a, i) => {
    const aportesMensais: Record<number, number> = {}
    ;(a.valores ?? []).forEach((v) => { aportesMensais[v.mes_referencia] = Number(v.valor) })

    const dataInicio = a.data_inicio ? new Date(a.data_inicio) : new Date()

    return {
      nome: a.nome,
      cor: CORES[i % CORES.length],
      dados: projetarAplicacao(
        Number(a.saldo_atual),
        Number(a.taxa_anual),
        a.tributacao,
        aportesMensais,
        dataInicio,
        mesInicio,
        24
      ),
    }
  })

  // Monta dados para o chart (indexed por mesLabel)
  const mesesLabels = projections[0].dados.map((d) => d.mesLabel)
  const chartData = mesesLabels.map((label, i) => {
    const row: Record<string, string | number> = { mesLabel: label }
    projections.forEach((p) => {
      row[p.nome] = parseFloat(p.dados[i].saldo.toFixed(2))
    })
    return row
  })

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
        Projeção de saldo — 24 meses
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="mesLabel"
            tick={{ fontSize: 11 }}
            interval={3}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) =>
              new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
            }
          />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            labelFormatter={(label) => label}
          />
          <Legend />
          {projections.map((p) => (
            <Line
              key={p.nome}
              type="monotone"
              dataKey={p.nome}
              stroke={p.cor}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
