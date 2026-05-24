'use client'
import { useState } from 'react'
import { FileDown, Loader2, CheckSquare, Square } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from '@/components/ui/dialog'
import { getLancamentosMultiplosMeses } from '@/app/(dashboard)/cartao/actions'
import { addMonthsToRef, mesReferenciaLabel, dateToMesRef } from '@/lib/utils'
import { cn } from '@/lib/utils'

// Gera lista de meses: 2 passados + atual + 13 futuros
function gerarMeses(): number[] {
  const atual = dateToMesRef(new Date())
  const meses: number[] = []
  for (let i = -2; i <= 13; i++) {
    meses.push(addMonthsToRef(atual, i))
  }
  return meses
}

function formatCurrencyPDF(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDatePDF(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function ExportarFaturasDialog() {
  const [open, setOpen] = useState(false)
  const [selecionados, setSelecionados] = useState<number[]>(() => {
    const atual = dateToMesRef(new Date())
    return [atual, addMonthsToRef(atual, 1), addMonthsToRef(atual, 2)]
  })
  const [loading, setLoading] = useState(false)
  const meses = gerarMeses()
  const atual = dateToMesRef(new Date())

  function toggleMes(mes: number) {
    setSelecionados((prev) =>
      prev.includes(mes) ? prev.filter((m) => m !== mes) : [...prev, mes]
    )
  }

  function toggleTodos() {
    setSelecionados((prev) => prev.length === meses.length ? [] : [...meses])
  }

  async function exportar() {
    if (selecionados.length === 0) {
      toast.error('Selecione ao menos um mês')
      return
    }

    setLoading(true)

    try {
      const mesesOrdenados = [...selecionados].sort()
      const lancamentos = await getLancamentosMultiplosMeses(mesesOrdenados)

      // Import dinâmico para não quebrar o SSR
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const margin = 14

      // ── Cabeçalho do documento ──
      doc.setFillColor(220, 38, 38) // vermelho
      doc.rect(0, 0, pageW, 22, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Faturas do Cartão de Crédito', margin, 14)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Exportado em ${new Date().toLocaleDateString('pt-BR')}`,
        pageW - margin,
        14,
        { align: 'right' }
      )

      let y = 30

      // ── Para cada mês selecionado ──
      for (const mesRef of mesesOrdenados) {
        const itens = lancamentos.filter((l: any) => l.mes_referencia === mesRef)

        // Agrupa por cartão
        const porCartao = new Map<string, { nome: string; total: number }>()
        for (const l of itens) {
          const nome = (l.cartao as any)?.nome ?? 'Sem cartão'
          const id = l.cartao_id
          const cur = porCartao.get(id)
          if (cur) cur.total += Number(l.valor_parcela)
          else porCartao.set(id, { nome, total: Number(l.valor_parcela) })
        }

        const totalMes = itens.reduce((s: number, l: any) => s + Number(l.valor_parcela), 0)

        // Verifica se precisa de nova página
        const alturaEstimada = 14 + porCartao.size * 7 + itens.length * 8 + 24
        if (y + alturaEstimada > 270 && y > 30) {
          doc.addPage()
          y = 16
        }

        // Título do mês
        doc.setFillColor(248, 113, 113) // vermelho claro
        doc.rect(margin, y, pageW - margin * 2, 9, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        const mesLabel = mesReferenciaLabel(mesRef)
        doc.text(mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1), margin + 3, y + 6.2)
        doc.text(`Total: ${formatCurrencyPDF(totalMes)}`, pageW - margin - 3, y + 6.2, { align: 'right' })
        y += 13

        if (itens.length === 0) {
          doc.setTextColor(120, 120, 120)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'italic')
          doc.text('Nenhum lançamento neste mês.', margin + 3, y)
          y += 10
          continue
        }

        // Resumo por cartão
        doc.setTextColor(60, 60, 60)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('RESUMO POR CARTÃO', margin, y)
        y += 5

        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [['Cartão', 'Fatura']],
          body: Array.from(porCartao.values()).map((c) => [
            c.nome,
            formatCurrencyPDF(c.total),
          ]),
          styles: { fontSize: 9, cellPadding: 2.5 },
          headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 40, halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] },
          },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          tableLineColor: [220, 220, 220],
          tableLineWidth: 0.2,
        })

        y = (doc as any).lastAutoTable.finalY + 6

        // Tabela de lançamentos
        doc.setTextColor(60, 60, 60)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('LANÇAMENTOS', margin, y)
        y += 5

        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [['Descrição', 'Cartão', 'Categoria', 'Data', 'Valor']],
          body: itens.map((l: any) => [
            l.descricao,
            (l.cartao as any)?.nome ?? '—',
            (l.categoria as any)?.nome ?? '—',
            formatDatePDF(l.data_compra),
            formatCurrencyPDF(Number(l.valor_parcela)),
          ]),
          styles: { fontSize: 8.5, cellPadding: 2.5, overflow: 'linebreak' },
          headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 28 },
            2: { cellWidth: 28 },
            3: { cellWidth: 22, halign: 'center' },
            4: { cellWidth: 30, halign: 'right', textColor: [185, 28, 28], fontStyle: 'bold' },
          },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          tableLineColor: [220, 220, 220],
          tableLineWidth: 0.2,
        })

        y = (doc as any).lastAutoTable.finalY + 14
      }

      // Rodapé em todas as páginas
      const totalPages = (doc.internal as any).getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(160, 160, 160)
        doc.setFont('helvetica', 'normal')
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageW / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        )
      }

      // Download
      const nomeArquivo = `faturas_${mesesOrdenados[0]}_a_${mesesOrdenados[mesesOrdenados.length - 1]}.pdf`
      doc.save(nomeArquivo)
      toast.success('PDF gerado com sucesso!')
      setOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao gerar o PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileDown className="h-4 w-4" />
          Exportar PDF
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Exportar faturas em PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Selecione os meses que deseja incluir no relatório.
          </p>

          {/* Toggle todos */}
          <button
            type="button"
            onClick={toggleTodos}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            {selecionados.length === meses.length
              ? <CheckSquare className="h-4 w-4" />
              : <Square className="h-4 w-4" />
            }
            {selecionados.length === meses.length ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>

          {/* Lista de meses */}
          <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-1">
            {meses.map((mes) => {
              const selecionado = selecionados.includes(mes)
              const isAtual = mes === atual
              return (
                <button
                  key={mes}
                  type="button"
                  onClick={() => toggleMes(mes)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left transition-colors',
                    selecionado
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:bg-muted/50 text-foreground'
                  )}
                >
                  <div className={cn(
                    'h-4 w-4 rounded border-2 flex items-center justify-center shrink-0',
                    selecionado ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                  )}>
                    {selecionado && (
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="truncate capitalize">
                    {mesReferenciaLabel(mes)}
                    {isAtual && <span className="ml-1 text-xs text-muted-foreground">(atual)</span>}
                  </span>
                </button>
              )
            })}
          </div>

          {selecionados.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selecionados.length} mês{selecionados.length !== 1 ? 'es' : ''} selecionado{selecionados.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={exportar}
            disabled={loading || selecionados.length === 0}
            className="gap-2"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" />Gerando...</>
              : <><FileDown className="h-4 w-4" />Gerar PDF</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
