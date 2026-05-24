'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  gerarGradeMeses,
  mesReferenciaLabelCurto,
  formatCurrency,
} from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Receita } from '@/lib/types'

interface ReceitasProjecaoTableProps {
  receitas: Receita[]
  mesInicio: number
}

interface LinhaCategoria {
  id: string | null
  nome: string
  cor: string | null
  valores: Record<number, number>
  total: number // mantido para ordenação futura
}

export function ReceitasProjecaoTable({ receitas, mesInicio }: ReceitasProjecaoTableProps) {
  const [aberta, setAberta] = useState(false)

  const meses = gerarGradeMeses(mesInicio, 12)

  // Agrupa receitas ativas por categoria
  const linhas: LinhaCategoria[] = []
  const mapaCategoria: Record<string, LinhaCategoria> = {}

  for (const receita of receitas) {
    if (!receita.ativa) continue

    const key = receita.categoria_id ?? '__sem_categoria__'
    const nome = (receita.categoria as any)?.nome ?? 'Sem categoria'
    const cor = (receita.categoria as any)?.cor ?? null

    if (!mapaCategoria[key]) {
      mapaCategoria[key] = { id: receita.categoria_id, nome, cor, valores: {}, total: 0 }
    }

    for (const m of meses) {
      const val = receita.valores?.find((v) => v.mes_referencia === m)?.valor ?? 0
      mapaCategoria[key].valores[m] = (mapaCategoria[key].valores[m] ?? 0) + Number(val)
    }
  }

  // Ordena: categorias nomeadas primeiro, "Sem categoria" por último
  const todasLinhas = Object.values(mapaCategoria).sort((a, b) => {
    if (a.id === null) return 1
    if (b.id === null) return -1
    return a.nome.localeCompare(b.nome)
  })

  // Total por mês (linha de rodapé)
  const totalPorMes: Record<number, number> = {}
  for (const m of meses) {
    totalPorMes[m] = todasLinhas.reduce((s, l) => s + (l.valores[m] ?? 0), 0)
  }

  const temDados = todasLinhas.length > 0

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setAberta((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Projeção por categoria</span>
          <span className="text-xs text-muted-foreground">· próximos 12 meses</span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            aberta && 'rotate-180'
          )}
        />
      </button>

      {/* Tabela expansível */}
      {aberta && (
        <div className="border-t border-border">
          {!temDados ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma receita ativa para exibir.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {/* Coluna categoria — sticky */}
                    <th className="sticky left-0 z-10 bg-muted/30 text-left font-medium text-muted-foreground px-5 py-2.5 min-w-[160px] whitespace-nowrap">
                      Categoria
                    </th>
                    {meses.map((m) => (
                      <th
                        key={m}
                        className="text-right font-medium text-muted-foreground px-3 py-2.5 min-w-[88px] whitespace-nowrap capitalize"
                      >
                        {mesReferenciaLabelCurto(m)}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {todasLinhas.map((linha, idx) => (
                    <tr
                      key={linha.id ?? '__sem__'}
                      className={cn(
                        'border-b border-border/50 hover:bg-muted/20 transition-colors',
                        idx === todasLinhas.length - 1 && 'border-b-0'
                      )}
                    >
                      {/* Nome da categoria — sticky */}
                      <td className="sticky left-0 z-10 bg-white hover:bg-muted/20 px-5 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {linha.cor ? (
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: linha.cor }}
                            />
                          ) : (
                            <span className="h-2 w-2 rounded-full shrink-0 bg-muted-foreground/30" />
                          )}
                          <span className={cn(
                            'text-sm',
                            linha.id === null ? 'text-muted-foreground italic' : 'text-foreground font-medium'
                          )}>
                            {linha.nome}
                          </span>
                        </div>
                      </td>

                      {/* Valores por mês */}
                      {meses.map((m) => {
                        const val = linha.valores[m] ?? 0
                        return (
                          <td
                            key={m}
                            className={cn(
                              'text-right px-3 py-2.5 tabular-nums',
                              val > 0 ? 'text-emerald-700 font-medium' : 'text-muted-foreground/40'
                            )}
                          >
                            {val > 0 ? formatCurrency(val) : '—'}
                          </td>
                        )
                      })}

                    </tr>
                  ))}
                </tbody>

                {/* Rodapé — total por mês */}
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/20">
                    <td className="sticky left-0 z-10 bg-muted/20 px-5 py-2.5 font-semibold text-foreground whitespace-nowrap">
                      Total
                    </td>
                    {meses.map((m) => (
                      <td
                        key={m}
                        className="text-right px-3 py-2.5 tabular-nums font-semibold text-foreground"
                      >
                        {formatCurrency(totalPorMes[m] ?? 0)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
