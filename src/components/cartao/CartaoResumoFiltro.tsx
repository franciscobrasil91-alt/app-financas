'use client'
import { useState } from 'react'
import { CreditCard } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { LancamentosTable } from './LancamentosTable'

interface FaturaCartao {
  id: string
  nome: string
  total: number
}

interface Props {
  faturasPorCartao: FaturaCartao[]
  totalMes: number
  lancamentos: any[]
  categorias: any[]
  cartoes: any[]
}

export function CartaoResumoFiltro({ faturasPorCartao, totalMes, lancamentos, categorias, cartoes }: Props) {
  const [filtroCartaoId, setFiltroCartaoId] = useState<string | null>(null)

  const lancamentosFiltrados = filtroCartaoId
    ? lancamentos.filter((l) => l.cartao_id === filtroCartaoId)
    : lancamentos

  function toggleFiltro(id: string) {
    setFiltroCartaoId((prev) => (prev === id ? null : id))
  }

  return (
    <>
      {/* Resumo por cartão */}
      {faturasPorCartao.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {faturasPorCartao.map((c) => {
            const ativo = filtroCartaoId === c.id
            return (
              <button
                key={c.id}
                onClick={() => toggleFiltro(c.id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-5 py-3 shadow-sm transition-all text-left',
                  ativo
                    ? 'bg-red-600 border-red-600 shadow-md scale-[1.02]'
                    : 'bg-white border-border hover:border-red-300 hover:shadow-md'
                )}
              >
                <div className={cn('rounded-lg p-1.5', ativo ? 'bg-white/20' : 'bg-red-100')}>
                  <CreditCard className={cn('h-4 w-4', ativo ? 'text-white' : 'text-red-500')} />
                </div>
                <div>
                  <p className={cn(
                    'text-xs font-medium uppercase tracking-wide',
                    ativo ? 'text-white/80' : 'text-muted-foreground'
                  )}>
                    {c.nome}
                  </p>
                  <p className={cn('text-lg font-bold', ativo ? 'text-white' : 'text-red-600')}>
                    {formatCurrency(c.total)}
                  </p>
                </div>
              </button>
            )
          })}

          {/* Total geral — só aparece se houver mais de 1 cartão */}
          {faturasPorCartao.length > 1 && (
            <div className={cn(
              'flex items-center gap-3 rounded-xl border px-5 py-3 transition-all',
              filtroCartaoId
                ? 'border-dashed bg-muted/30'
                : 'border-dashed bg-muted/50'
            )}>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total</p>
                <p className="text-lg font-bold text-gray-800">{formatCurrency(totalMes)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Indicador de filtro ativo */}
      {filtroCartaoId && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Mostrando apenas <strong className="text-foreground">
              {faturasPorCartao.find((c) => c.id === filtroCartaoId)?.nome}
            </strong> · {lancamentosFiltrados.length} lançamento{lancamentosFiltrados.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setFiltroCartaoId(null)}
            className="text-xs underline hover:text-foreground transition-colors"
          >
            Ver todos
          </button>
        </div>
      )}

      {/* Tabela de lançamentos */}
      {cartoes.length > 0 && (
        <LancamentosTable lancamentos={lancamentosFiltrados} categorias={categorias} />
      )}
    </>
  )
}
