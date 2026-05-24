'use client'
import { useState } from 'react'
import { Clock, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DespesaForm } from '@/components/despesas/DespesaForm'
import { DeleteButton } from '@/components/shared/DeleteButton'
import { formatCurrency, dateToMesRef } from '@/lib/utils'
import { deletarDespesa } from '@/app/(dashboard)/despesas/actions'
import { cn } from '@/lib/utils'
import type { Categoria, ContaBancaria, CartaoCredito } from '@/lib/types'

type Filtro = 'todas' | 'fixa' | 'estimada' | 'sazonal' | 'pontual' | 'inativas'

const filtros: { value: Filtro; label: string }[] = [
  { value: 'todas',    label: 'Todas'    },
  { value: 'fixa',     label: 'Fixas'    },
  { value: 'estimada', label: 'Estimadas'},
  { value: 'sazonal',  label: 'Sazonais' },
  { value: 'pontual',  label: 'Pontuais' },
  { value: 'inativas', label: 'Inativas' },
]

const tipoBadge: Record<string, { label: string; variant: string }> = {
  fixa:     { label: 'Fixa',     variant: 'default'   },
  estimada: { label: 'Estimada', variant: 'secondary' },
  sazonal:  { label: 'Sazonal',  variant: 'warning'   },
  pontual:  { label: 'Pontual',  variant: 'warning'   },
}

interface Props {
  despesas: any[]
  categorias: Categoria[]
  contas: ContaBancaria[]
  cartoes: CartaoCredito[]
}

export function DespesasList({ despesas, categorias, contas, cartoes }: Props) {
  const [filtroAtivo, setFiltroAtivo] = useState<Filtro>('todas')
  const mesAtual = dateToMesRef(new Date())

  const despesasFiltradas = despesas.filter((d) => {
    if (filtroAtivo === 'inativas') return !d.ativa
    if (filtroAtivo === 'todas')    return d.ativa
    return d.ativa && d.tipo === filtroAtivo
  })

  // Contagem por filtro (para mostrar no chip)
  const contagem: Record<Filtro, number> = {
    todas:    despesas.filter((d) => d.ativa).length,
    fixa:     despesas.filter((d) => d.ativa && d.tipo === 'fixa').length,
    estimada: despesas.filter((d) => d.ativa && d.tipo === 'estimada').length,
    sazonal:  despesas.filter((d) => d.ativa && d.tipo === 'sazonal').length,
    pontual:  despesas.filter((d) => d.ativa && d.tipo === 'pontual').length,
    inativas: despesas.filter((d) => !d.ativa).length,
  }

  return (
    <div className="space-y-4">
      {/* Chips de filtro */}
      <div className="flex flex-wrap gap-2">
        {filtros.map(({ value, label }) => {
          const count = contagem[value]
          if (count === 0 && value !== 'todas') return null
          return (
            <button
              key={value}
              onClick={() => setFiltroAtivo(value)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                filtroAtivo === value
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900'
              )}
            >
              {label}
              <span className={cn(
                'text-xs rounded-full px-1.5 py-0.5 font-semibold',
                filtroAtivo === value
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-100 text-gray-500'
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Lista */}
      {despesasFiltradas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhuma despesa nesta categoria.
        </p>
      ) : (
        <div className="space-y-3">
          {despesasFiltradas.map((d) => {
            const valorMesAtual = d.valores?.find((v: any) => v.mes_referencia === mesAtual)?.valor ?? 0
            const badge = tipoBadge[d.tipo] ?? tipoBadge.fixa

            const comValor = d.tipo === 'pontual'
              ? (d.valores ?? []).filter((v: any) => Number(v.valor) > 0)
              : []
            const totalOcorrencias = comValor.length
            const restantes = comValor.filter((v: any) => v.mes_referencia >= mesAtual).length

            return (
              <div
                key={d.id}
                className={`bg-white rounded-lg border p-4 flex items-start gap-4 ${!d.ativa ? 'opacity-60' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{d.descricao}</span>
                    <Badge variant={badge.variant as any}>{badge.label}</Badge>
                    {!d.ativa && <Badge variant="outline">Inativa</Badge>}
                    {d.categoria && (
                      <Badge
                        variant="outline"
                        style={{ borderColor: d.categoria.cor, color: d.categoria.cor }}
                      >
                        {d.categoria.nome}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {d.dia_vencimento && <span>Vence dia {d.dia_vencimento}</span>}
                    {d.conta  && <span>· {d.conta.nome}</span>}
                    {d.cartao && <span>· {d.cartao.nome}</span>}
                    {valorMesAtual > 0 && (
                      <span className="text-red-600 font-medium">
                        · {formatCurrency(valorMesAtual)} este mês
                      </span>
                    )}
                    {d.tipo === 'pontual' && d.ativa && totalOcorrencias > 0 && (
                      <span className="flex items-center gap-1 text-amber-600 font-medium">
                        <Clock className="h-3 w-3" />
                        {restantes > 0
                          ? `${restantes} de ${totalOcorrencias} ${totalOcorrencias === 1 ? 'vez' : 'vezes'} restante${restantes !== 1 ? 's' : ''}`
                          : 'Concluída — será arquivada'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 shrink-0">
                  <DespesaForm
                    categorias={categorias}
                    contas={contas}
                    cartoes={cartoes}
                    despesa={d}
                    trigger={
                      <button className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                    }
                  />
                  <DeleteButton
                    action={deletarDespesa.bind(null, d.id)}
                    label="Excluir despesa"
                    description={`Deseja excluir a despesa "${d.descricao}" e todos os seus valores?`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
