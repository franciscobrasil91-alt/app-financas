'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { mesReferenciaLabel, addMonthsToRef } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import { dateToMesRef } from '@/lib/utils'

interface MonthSelectorProps {
  mesAtual: number
}

export function MonthSelector({ mesAtual }: MonthSelectorProps) {
  const router = useRouter()

  function navegar(delta: number) {
    const novoMes = addMonthsToRef(mesAtual, delta)
    const params = new URLSearchParams()
    params.set('mes', String(novoMes))
    router.push(`?${params.toString()}`)
  }

  const hoje = new Date()
  const mesHoje = dateToMesRef(hoje)
  const isHoje = mesAtual === mesHoje

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon" onClick={() => navegar(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-[180px] text-center">
        <span className="text-lg font-semibold capitalize">
          {mesReferenciaLabel(mesAtual)}
        </span>
        {isHoje && (
          <span className="ml-2 text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
            atual
          </span>
        )}
      </div>

      <Button variant="outline" size="icon" onClick={() => navegar(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isHoje && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => {
            const params = new URLSearchParams()
            params.set('mes', String(mesHoje))
            router.push(`?${params.toString()}`)
          }}
        >
          Hoje
        </Button>
      )}
    </div>
  )
}
