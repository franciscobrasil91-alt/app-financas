'use client'
import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'

interface DeleteButtonProps {
  action: () => Promise<{ error?: string; success?: boolean }>
  label: string
  description: string
  onDeleted?: () => void
}

export function DeleteButton({ action, label, description, onDeleted }: DeleteButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const result = await action()
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Excluído com sucesso!')
      setOpen(false)
      onDeleted?.()
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
