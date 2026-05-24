'use client'
import { useState, useMemo } from 'react'
import { Trash2, Pencil, Layers, RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { deletarLancamento } from '@/app/(dashboard)/cartao/actions'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { LancamentoCartao, Categoria } from '@/lib/types'
import { cn } from '@/lib/utils'
import { EditLancamentoDialog } from './EditLancamentoDialog'

type SortKey = 'descricao' | 'cartao' | 'categoria' | 'data_compra' | 'valor_parcela'
type SortDir = 'asc' | 'desc'

interface LancamentosTableProps {
  lancamentos: LancamentoCartao[]
  categorias: Categoria[]
}

function SortIcon({ coluna, sortKey, sortDir }: { coluna: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== coluna) return <ChevronsUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50 inline" />
  return sortDir === 'asc'
    ? <ChevronUp className="ml-1 h-3.5 w-3.5 inline text-primary" />
    : <ChevronDown className="ml-1 h-3.5 w-3.5 inline text-primary" />
}

export function LancamentosTable({ lancamentos, categorias }: LancamentosTableProps) {
  const [deletando, setDeletando] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    id: string; grupo: boolean; descricao: string; recorrente?: boolean
  } | null>(null)
  const [editando, setEditando] = useState<LancamentoCartao | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('descricao')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(col: SortKey) {
    if (sortKey === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(col)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    return [...lancamentos].sort((a, b) => {
      let valA: string | number = ''
      let valB: string | number = ''

      switch (sortKey) {
        case 'descricao':
          valA = a.descricao.toLowerCase()
          valB = b.descricao.toLowerCase()
          break
        case 'cartao':
          valA = ((a.cartao as any)?.nome ?? '').toLowerCase()
          valB = ((b.cartao as any)?.nome ?? '').toLowerCase()
          break
        case 'categoria':
          valA = ((a.categoria as any)?.nome ?? '').toLowerCase()
          valB = ((b.categoria as any)?.nome ?? '').toLowerCase()
          break
        case 'data_compra':
          valA = a.data_compra
          valB = b.data_compra
          break
        case 'valor_parcela':
          valA = Number(a.valor_parcela)
          valB = Number(b.valor_parcela)
          break
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [lancamentos, sortKey, sortDir])

  async function confirmarDelete(id: string, deleteGrupo: boolean) {
    setDeletando(id)
    const result = await deletarLancamento(id, deleteGrupo)
    setDeletando(null)
    setConfirmDialog(null)
    if (result?.error) {
      toast.error('Erro ao excluir lançamento')
    } else {
      toast.success('Lançamento excluído')
    }
  }

  if (lancamentos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhum lançamento neste mês.</p>
      </div>
    )
  }

  const total = lancamentos.reduce((s, l) => s + Number(l.valor_parcela), 0)

  const thClass = "cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap"

  return (
    <>
      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className={thClass} onClick={() => handleSort('descricao')}>
                Descrição <SortIcon coluna="descricao" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead className={cn(thClass, 'hidden sm:table-cell')} onClick={() => handleSort('cartao')}>
                Cartão <SortIcon coluna="cartao" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead className={cn(thClass, 'hidden md:table-cell')} onClick={() => handleSort('categoria')}>
                Categoria <SortIcon coluna="categoria" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead className={cn(thClass, 'hidden sm:table-cell')} onClick={() => handleSort('data_compra')}>
                Data <SortIcon coluna="data_compra" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead className={cn(thClass, 'text-right')} onClick={() => handleSort('valor_parcela')}>
                Valor <SortIcon coluna="valor_parcela" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm">{l.descricao}</p>
                      {(l as any).recorrente && (
                        <span className="inline-flex items-center gap-0.5 text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
                          <RefreshCw className="h-3 w-3" />
                          Recorrente
                        </span>
                      )}
                    </div>
                    {!((l as any).recorrente) && l.numero_parcelas > 1 && (
                      <p className="text-xs text-muted-foreground">
                        Parcela {l.parcela_atual}/{l.numero_parcelas}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {(l.cartao as any)?.nome ?? '—'}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {l.categoria ? (
                    <Badge
                      variant="outline"
                      style={{ borderColor: (l.categoria as any).cor, color: (l.categoria as any).cor }}
                    >
                      {(l.categoria as any).nome}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {formatDate(l.data_compra)}
                </TableCell>
                <TableCell className="text-right font-medium text-red-600">
                  {formatCurrency(l.valor_parcela)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditando(l)}
                      disabled={deletando === l.id}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setConfirmDialog({
                          id: l.id,
                          grupo: l.numero_parcelas > 1 || (l as any).recorrente,
                          descricao: l.descricao,
                          recorrente: (l as any).recorrente,
                        })
                      }
                      disabled={deletando === l.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Total */}
        <div className="border-t px-4 py-3 flex justify-between items-center bg-muted/20">
          <span className="text-sm font-medium text-muted-foreground">
            Total do mês · {lancamentos.length} lançamento{lancamentos.length !== 1 ? 's' : ''}
          </span>
          <span className="text-lg font-bold text-red-600">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Edit dialog */}
      <EditLancamentoDialog
        lancamento={editando}
        categorias={categorias}
        onClose={() => setEditando(null)}
      />

      {/* Confirm dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir lançamento</DialogTitle>
            <DialogDescription>
              Deseja excluir <strong>{confirmDialog?.descricao}</strong>?
            </DialogDescription>
          </DialogHeader>

          {confirmDialog?.grupo && (
            <div className="rounded-md bg-orange-50 border border-orange-200 p-3 text-sm text-orange-800">
              {confirmDialog.recorrente ? (
                <><RefreshCw className="inline h-4 w-4 mr-1" />
                Esta é uma cobrança recorrente. Você pode excluir apenas este mês ou cancelar toda a recorrência.</>
              ) : (
                <><Layers className="inline h-4 w-4 mr-1" />
                Esta compra tem múltiplas parcelas. Você pode excluir apenas esta parcela ou todas.</>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancelar</Button>
            {confirmDialog?.grupo && (
              <Button
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
                onClick={() => confirmarDelete(confirmDialog.id, true)}
              >
                {confirmDialog.recorrente ? 'Cancelar toda a recorrência' : 'Excluir todas as parcelas'}
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => confirmDialog && confirmarDelete(confirmDialog.id, false)}
            >
              {confirmDialog?.grupo
                ? (confirmDialog.recorrente ? 'Excluir só este mês' : 'Excluir só esta parcela')
                : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
