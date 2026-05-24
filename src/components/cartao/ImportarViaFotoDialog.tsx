'use client'
import { useState, useRef } from 'react'
import { Sparkles, Upload, X, Loader2, ImagePlus, Check, Trash2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { analisarExtratoIA, salvarLancamentosIA } from '@/app/(dashboard)/cartao/ia-actions'
import type { CartaoCredito, Categoria } from '@/lib/types'
import type { LancamentoIA } from '@/app/(dashboard)/cartao/ia-actions'
import { cn } from '@/lib/utils'

interface LancamentoRevisao extends LancamentoIA {
  cartao_id: string
  categoria_id?: string
  selecionado: boolean
}

interface ImportarViaFotoDialogProps {
  cartoes: CartaoCredito[]
  categorias: Categoria[]
}

const CATEGORIAS_IA = [
  'Restaurante', 'Transporte', 'Supermercado', 'Saúde', 'Drogaria',
  'Entretenimento', 'Educação', 'Vestuário', 'Outros',
]

export function ImportarViaFotoDialog({ cartoes, categorias }: ImportarViaFotoDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'upload' | 'revisao'>('upload')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string>('')
  const [imageMime, setImageMime] = useState<'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'>('image/jpeg')
  const [cartaoSelecionado, setCartaoSelecionado] = useState(cartoes[0]?.id ?? '')
  const [analisando, setAnalisando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [lancamentos, setLancamentos] = useState<LancamentoRevisao[]>([])
  const [erroIA, setErroIA] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function resetar() {
    setStep('upload')
    setImagePreview(null)
    setImageBase64('')
    setLancamentos([])
    setErroIA(null)
    setAnalisando(false)
    setSalvando(false)
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) resetar()
  }

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem (JPEG, PNG, WebP)')
      return
    }
    const mime = file.type as any
    setImageMime(mime)
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setImagePreview(result)
      // Extrai base64 puro (sem o prefixo data:...)
      setImageBase64(result.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function analisar() {
    if (!imageBase64) { toast.error('Selecione uma imagem primeiro'); return }
    if (!cartaoSelecionado) { toast.error('Selecione o cartão'); return }

    setAnalisando(true)
    setErroIA(null)
    const result = await analisarExtratoIA(imageBase64, imageMime)
    setAnalisando(false)

    if (result.error) {
      setErroIA(result.error)
      return
    }

    // Monta lista com cartão pré-selecionado
    const lista: LancamentoRevisao[] = (result.lancamentos ?? []).map((l) => ({
      ...l,
      cartao_id: cartaoSelecionado,
      categoria_id: undefined,
      selecionado: true,
    }))
    setLancamentos(lista)
    setStep('revisao')
  }

  function atualizar(idx: number, campo: keyof LancamentoRevisao, valor: any) {
    setLancamentos((prev) => prev.map((l, i) => i === idx ? { ...l, [campo]: valor } : l))
  }

  function remover(idx: number) {
    setLancamentos((prev) => prev.filter((_, i) => i !== idx))
  }

  async function salvar() {
    const selecionados = lancamentos.filter((l) => l.selecionado)
    if (selecionados.length === 0) { toast.error('Nenhum lançamento selecionado'); return }

    setSalvando(true)
    const result = await salvarLancamentosIA(
      selecionados.map((l) => ({
        descricao: l.descricao,
        valor: l.valor,
        data: l.data,
        cartao_id: l.cartao_id,
        categoria_id: l.categoria_id,
      }))
    )
    setSalvando(false)

    if (result?.error) {
      toast.error('Erro ao salvar: ' + result.error)
    } else {
      toast.success(`${selecionados.length} lançamento${selecionados.length !== 1 ? 's' : ''} importado${selecionados.length !== 1 ? 's' : ''}!`)
      handleOpenChange(false)
    }
  }

  const selecionados = lancamentos.filter((l) => l.selecionado).length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          Importar por foto
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Importar lançamentos com IA
          </DialogTitle>
        </DialogHeader>

        {/* STEP 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tire um print do seu extrato ou fatura e a IA extrai os lançamentos automaticamente.
            </p>

            {/* Cartão */}
            <div className="space-y-1">
              <Label>Cartão de crédito *</Label>
              <Select value={cartaoSelecionado} onValueChange={setCartaoSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cartão" />
                </SelectTrigger>
                <SelectContent>
                  {cartoes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Drop zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
                imagePreview ? 'border-primary/40 bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/40 hover:bg-muted/30'
              )}
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-lg object-contain"
                  />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black"
                    onClick={(e) => { e.stopPropagation(); setImagePreview(null); setImageBase64('') }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <ImagePlus className="h-10 w-10 mx-auto text-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Clique ou arraste a imagem aqui
                  </p>
                  <p className="text-xs text-muted-foreground/70">JPEG, PNG, WebP</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />

            {erroIA && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {erroIA}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
              <Button
                onClick={analisar}
                disabled={!imageBase64 || !cartaoSelecionado || analisando}
                className="gap-2 bg-purple-600 hover:bg-purple-700"
              >
                {analisando
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Analisando com IA...</>
                  : <><Sparkles className="h-4 w-4" />Analisar imagem</>
                }
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP 2: Revisão */}
        {step === 'revisao' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                A IA encontrou <strong>{lancamentos.length}</strong> lançamento{lancamentos.length !== 1 ? 's' : ''}.
                Revise, edite e confirme os que deseja importar.
              </p>
              <Button variant="ghost" size="sm" onClick={() => setStep('upload')} className="text-xs gap-1">
                <Upload className="h-3 w-3" /> Nova imagem
              </Button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {lancamentos.map((l, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'rounded-lg border p-3 space-y-2 transition-colors',
                    l.selecionado ? 'border-primary/30 bg-primary/5' : 'border-muted opacity-60'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => atualizar(idx, 'selecionado', !l.selecionado)}
                      className={cn(
                        'mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                        l.selecionado ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
                      )}
                    >
                      {l.selecionado && <Check className="h-3 w-3" />}
                    </button>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Descrição */}
                      <div className="space-y-0.5">
                        <Label className="text-xs text-muted-foreground">Descrição</Label>
                        <Input
                          className="h-7 text-sm"
                          value={l.descricao}
                          onChange={(e) => atualizar(idx, 'descricao', e.target.value)}
                          disabled={!l.selecionado}
                        />
                      </div>

                      {/* Categoria */}
                      <div className="space-y-0.5">
                        <Label className="text-xs text-muted-foreground">
                          Categoria
                          <Badge variant="outline" className="ml-1 text-xs py-0 text-purple-600 border-purple-300">
                            IA: {l.categoria_sugerida}
                          </Badge>
                        </Label>
                        <Select
                          value={l.categoria_id ?? 'none'}
                          onValueChange={(v) => atualizar(idx, 'categoria_id', v === 'none' ? undefined : v)}
                          disabled={!l.selecionado}
                        >
                          <SelectTrigger className="h-7 text-sm">
                            <SelectValue placeholder="Sem categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem categoria</SelectItem>
                            {categorias.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Valor */}
                      <div className="space-y-0.5">
                        <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
                        <Input
                          className="h-7 text-sm"
                          type="text"
                          inputMode="decimal"
                          value={l.valor}
                          onChange={(e) => atualizar(idx, 'valor', parseFloat(e.target.value.replace(',', '.')) || 0)}
                          disabled={!l.selecionado}
                        />
                      </div>

                      {/* Data */}
                      <div className="space-y-0.5">
                        <Label className="text-xs text-muted-foreground">Data</Label>
                        <Input
                          className="h-7 text-sm"
                          type="date"
                          value={l.data}
                          onChange={(e) => atualizar(idx, 'data', e.target.value)}
                          disabled={!l.selecionado}
                        />
                      </div>
                    </div>

                    {/* Remover */}
                    <button
                      type="button"
                      onClick={() => remover(idx)}
                      className="mt-0.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
              <Button
                onClick={salvar}
                disabled={salvando || selecionados === 0}
                className="gap-2"
              >
                {salvando
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
                  : <><Check className="h-4 w-4" />Importar {selecionados} lançamento{selecionados !== 1 ? 's' : ''}</>
                }
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
