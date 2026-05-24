'use client'
import { useState } from 'react'
import { FileText, Loader2, Copy, Check, Download, Bot } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { gerarRelatorio } from '@/app/(dashboard)/relatorio/actions'

export function RelatorioDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [texto, setTexto] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  async function handleOpen(v: boolean) {
    setOpen(v)
    if (v && !texto) {
      setLoading(true)
      const result = await gerarRelatorio()
      setLoading(false)
      if (result.error) {
        toast.error(result.error)
        setOpen(false)
      } else {
        setTexto(result.texto ?? null)
      }
    }
    if (!v) {
      // Mantém o texto em cache — não regenera ao reabrir
    }
  }

  async function copiar() {
    if (!texto) return
    await navigator.clipboard.writeText(texto)
    setCopiado(true)
    toast.success('Relatório copiado!')
    setTimeout(() => setCopiado(false), 2500)
  }

  function baixar() {
    if (!texto) return
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Arquivo baixado!')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Bot className="h-4 w-4 text-indigo-500" />
          Relatório para IA
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-500" />
            Relatório financeiro completo
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Copie o texto abaixo e cole em qualquer chat de IA (ChatGPT, Claude, Gemini...) para obter análises, sugestões e insights sobre suas finanças.
          </p>
        </DialogHeader>

        {/* Conteúdo */}
        <div className="flex-1 overflow-hidden flex flex-col px-6 py-4 gap-3 min-h-0">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <p className="text-sm">Gerando relatório completo...</p>
            </div>
          ) : texto ? (
            <>
              {/* Dica de uso */}
              <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm text-indigo-700 flex items-start gap-2">
                <Bot className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Sugestão de prompt:</strong> Cole o relatório e pergunte: <em>"Analise minha situação financeira, aponte riscos e sugira melhorias para os próximos meses."</em>
                </span>
              </div>

              {/* Texto */}
              <textarea
                readOnly
                value={texto}
                className="flex-1 min-h-[320px] w-full rounded-lg border bg-slate-50 p-4 text-xs font-mono text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />

              <p className="text-xs text-muted-foreground text-center">
                Clique na área de texto para selecionar tudo · {texto.split('\n').length} linhas · {(texto.length / 1024).toFixed(1)} KB
              </p>
            </>
          ) : null}
        </div>

        {/* Footer */}
        {texto && (
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-muted/20">
            <Button variant="outline" size="sm" onClick={baixar} className="gap-2">
              <Download className="h-4 w-4" />
              Baixar .txt
            </Button>

            <Button onClick={copiar} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              {copiado
                ? <><Check className="h-4 w-4" />Copiado!</>
                : <><Copy className="h-4 w-4" />Copiar relatório</>
              }
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
