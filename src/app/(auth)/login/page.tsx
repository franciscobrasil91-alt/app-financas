'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
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
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

// Componente separado para usar useSearchParams (requer Suspense)
function ErroParam() {
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('erro') === 'nao_autorizado') {
      toast.error('Este e-mail não está autorizado a acessar o app.')
    }
  }, [searchParams])
  return null
}

function LoginForm() {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.senha,
    })

    if (error) {
      const msg = error.message.includes('Email not confirmed')
        ? 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.'
        : error.message.includes('Invalid login')
        ? 'E-mail ou senha incorretos.'
        : error.message
      toast.error(msg)
      setLoading(false)
      return
    }

    if (!authData.session) {
      toast.error('Sessão não iniciada. Tente novamente.')
      setLoading(false)
      return
    }

    toast.success('Login realizado! Redirecionando...')
    setTimeout(() => {
      window.location.replace('/dashboard')
    }, 300)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <div className="bg-primary rounded-xl p-3">
            <span className="text-2xl font-bold font-serif text-primary-foreground">A</span>
          </div>
        </div>
        <CardTitle className="text-2xl font-serif">Aruna Personal</CardTitle>
        <CardDescription>Entre na sua conta para continuar</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('senha')}
            />
            {errors.senha && <p className="text-xs text-destructive">{errors.senha.message}</p>}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entrar
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Não tem conta?{' '}
            <Link href="/cadastro" className="text-primary hover:underline font-medium">
              Cadastre-se
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <>
      <Suspense>
        <ErroParam />
      </Suspense>
      <LoginForm />
    </>
  )
}
