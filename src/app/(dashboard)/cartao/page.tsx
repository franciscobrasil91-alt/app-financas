import { mesRefPadrao, mesReferenciaLabel, formatCurrency } from '@/lib/utils'
import { getLancamentos, getCartoes, getCategorias } from './actions'
import { LancamentoForm } from '@/components/cartao/LancamentoForm'
import { LancamentosTable } from '@/components/cartao/LancamentosTable'
import { LancamentoLoteDialog } from '@/components/cartao/LancamentoLoteDialog'
import { ExportarFaturasDialog } from '@/components/cartao/ExportarFaturasDialog'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { CreditCard } from 'lucide-react'

interface PageProps {
  searchParams: { mes?: string; cartao?: string }
}

export default async function CartaoPage({ searchParams }: PageProps) {
  const mesRef = searchParams.mes
    ? parseInt(searchParams.mes)
    : mesRefPadrao()

  const [lancamentos, cartoes, categorias] = await Promise.all([
    getLancamentos(mesRef, searchParams.cartao),
    getCartoes(),
    getCategorias('cartao'),
  ])

  const totalMes = lancamentos.reduce((s: number, l: any) => s + Number(l.valor_parcela), 0)

  // Agrupa fatura por cartão
  const faturasPorCartao = Object.values(
    (lancamentos as any[]).reduce((acc, l) => {
      const id = l.cartao_id
      const nome = l.cartao?.nome ?? 'Sem cartão'
      if (!acc[id]) acc[id] = { id, nome, total: 0 }
      acc[id].total += Number(l.valor_parcela)
      return acc
    }, {} as Record<string, { id: string; nome: string; total: number }>)
  ) as { id: string; nome: string; total: number }[]

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 rounded-lg p-2">
            <CreditCard className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cartão de Crédito</h1>
            <p className="text-sm text-muted-foreground capitalize">
              {mesReferenciaLabel(mesRef)} · Fatura:{' '}
              <span className="text-red-600 font-medium">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalMes)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <MonthSelector mesAtual={mesRef} />
          {cartoes.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <ExportarFaturasDialog />
              <LancamentoLoteDialog cartoes={cartoes} categorias={categorias} />
              <LancamentoForm cartoes={cartoes} categorias={categorias} />
            </div>
          )}
        </div>
      </div>

      {/* Resumo por cartão */}
      {faturasPorCartao.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {faturasPorCartao.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border bg-white px-5 py-3 shadow-sm">
              <div className="bg-red-100 rounded-lg p-1.5">
                <CreditCard className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{c.nome}</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(c.total)}</p>
              </div>
            </div>
          ))}

          {/* Total geral — só aparece se houver mais de 1 cartão */}
          {faturasPorCartao.length > 1 && (
            <div className="flex items-center gap-3 rounded-xl border border-dashed bg-muted/30 px-5 py-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total</p>
                <p className="text-lg font-bold text-gray-800">{formatCurrency(totalMes)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sem cartões cadastrados */}
      {cartoes.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-2">Nenhum cartão cadastrado.</p>
          <p className="text-sm text-muted-foreground">
            Acesse <strong>Cadastros → Cartões</strong> para adicionar seu primeiro cartão.
          </p>
        </div>
      )}

      {/* Tabela de lançamentos */}
      {cartoes.length > 0 && (
        <LancamentosTable lancamentos={lancamentos as any} categorias={categorias} />
      )}
    </div>
  )
}
