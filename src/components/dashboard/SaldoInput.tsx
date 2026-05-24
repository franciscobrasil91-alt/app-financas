'use client'
import { useState } from 'react'
import { Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { salvarSaldoBancario } from '@/app/(dashboard)/dashboard/actions'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface SaldoInputProps {
  mesRef: number
  saldoAtual: number | null
}

export function SaldoInput({ mesRef, saldoAtual }: SaldoInputProps) {
  const [valor, setValor] = useState(saldoAtual?.toString() ?? '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSalvar() {
    const num = parseFloat(valor.replace(',', '.'))
    if (isNaN(num)) {
      toast.error('Valor inválido')
      return
    }
    setLoading(true)
    const result = await salvarSaldoBancario(mesRef, num)
    setLoading(false)

    if (result.error) {
      toast.error('Erro ao salvar saldo')
    } else {
      toast.success('Saldo salvo!')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <Label className="text-sm font-medium text-muted-foreground mb-2 block">
        Saldo bancário atual
      </Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            R$
          </span>
          <Input
            className="pl-8"
            type="number"
            step="0.01"
            placeholder="0,00"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSalvar()}
          />
        </div>
        <Button onClick={handleSalvar} disabled={loading} size="sm">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            'Salvar'
          )}
        </Button>
      </div>
      {saldoAtual !== null && (
        <p className="text-xs text-muted-foreground mt-1">
          Último salvo: {formatCurrency(saldoAtual)}
        </p>
      )}
    </div>
  )
}
