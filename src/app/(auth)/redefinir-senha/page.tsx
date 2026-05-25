'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  senha: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmarSenha: z.string(),
}).refine((d) => d.senha === d.confirmarSenha, {
  message: 'Senhas não coincidem',
  path: ['confirmarSenha'],
})

type FormData = z.infer<typeof schema>

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({ password: data.senha })

    if (error) {
      toast.error('Erro ao redefinir senha. O link pode ter expirado.')
      setLoading(false)
      return
    }

    toast.success('Senha redefinida com sucesso!')
    setTimeout(() => router.push('/dashboard'), 1000)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <img src="/icon-192.png" alt="Aruna Personal" className="h-16 w-16 rounded-2xl object-cover" />
        </div>
        <CardTitle className="text-2xl font-serif">Nova senha</CardTitle>
        <CardDescription>Escolha uma nova senha para sua conta.</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="senha">Nova senha</Label>
            <Input
              id="senha"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              {...register('senha')}
            />
            {errors.senha && <p className="text-xs text-destructive">{errors.senha.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmarSenha">Confirmar senha</Label>
            <Input
              id="confirmarSenha"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              {...register('confirmarSenha')}
            />
            {errors.confirmarSenha && (
              <p className="text-xs text-destructive">{errors.confirmarSenha.message}</p>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar nova senha
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
