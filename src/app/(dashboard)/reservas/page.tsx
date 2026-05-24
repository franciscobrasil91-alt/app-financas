import { PiggyBank, Pencil } from 'lucide-react'
import { getAplicacoes, deletarAplicacao } from './actions'
import { AplicacaoForm } from '@/components/reservas/AplicacaoForm'
import { ProjecaoReservaChart } from '@/components/reservas/ProjecaoReservaChart'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, dateToMesRef } from '@/lib/utils'
import { DeleteButton } from '@/components/shared/DeleteButton'

const TIPOS_LABEL: Record<string, string> = {
  poupanca: 'Poupança',
  cdb_rdb: 'CDB/RDB',
  tesouro_direto: 'Tesouro Direto',
  fundos: 'Fundos',
  acoes: 'Ações',
}

export default async function ReservasPage() {
  const aplicacoes = await getAplicacoes()
  const mesAtual = dateToMesRef(new Date())

  const totalSaldo = aplicacoes.reduce((s: number, a: any) => s + Number(a.saldo_atual), 0)
  const totalAportesMes = aplicacoes.reduce((s: number, a: any) => {
    const v = a.valores?.find((v: any) => v.mes_referencia === mesAtual)?.valor ?? 0
    return s + Number(v)
  }, 0)

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 rounded-lg p-2">
            <PiggyBank className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reservas e Investimentos</h1>
            <p className="text-sm text-muted-foreground">
              Patrimônio total:{' '}
              <span className="text-orange-600 font-semibold">{formatCurrency(totalSaldo)}</span>
              {totalAportesMes > 0 && (
                <> · Aportes este mês: <span className="font-semibold">{formatCurrency(totalAportesMes)}</span></>
              )}
            </p>
          </div>
        </div>
        <AplicacaoForm />
      </div>

      {/* Lista de aplicações */}
      {aplicacoes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <PiggyBank className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma aplicação cadastrada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(aplicacoes as any[]).map((a) => {
            const aportesMes = a.valores?.find((v: any) => v.mes_referencia === mesAtual)?.valor ?? 0

            return (
              <div
                key={a.id}
                className={`bg-white rounded-lg border p-4 flex items-center gap-4 ${!a.ativa ? 'opacity-60' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{a.nome}</span>
                    <Badge variant="warning">{TIPOS_LABEL[a.tipo] ?? a.tipo}</Badge>
                    {!a.ativa && <Badge variant="outline">Inativa</Badge>}
                    <Badge variant="outline">
                      {a.tributacao === 'isento' ? 'Isento' : `IR Regressivo`}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-4 text-sm">
                    <span className="text-orange-600 font-semibold">
                      {formatCurrency(a.saldo_atual)} atual
                    </span>
                    <span className="text-muted-foreground">
                      {a.taxa_anual}% a.a.
                    </span>
                    {aportesMes > 0 && (
                      <span className="text-muted-foreground">
                        Aporte este mês: {formatCurrency(aportesMes)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 shrink-0">
                  <AplicacaoForm
                    aplicacao={a}
                    trigger={
                      <button className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                    }
                  />
                  <DeleteButton
                    action={deletarAplicacao.bind(null, a.id)}
                    label="Excluir aplicação"
                    description={`Deseja excluir a aplicação "${a.nome}"?`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Gráfico de projeção */}
      {aplicacoes.length > 0 && (
        <ProjecaoReservaChart aplicacoes={aplicacoes as any} />
      )}
    </div>
  )
}
