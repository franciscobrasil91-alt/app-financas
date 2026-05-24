import {
  LayoutDashboard, CheckSquare, CreditCard, Receipt,
  TrendingUp, PiggyBank, Wallet, MessageCircle,
  ArrowRight, Sparkles
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const secoes = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    titulo: 'Dashboard',
    descricao: 'Visão geral das suas finanças: saldo previsto, projeção dos próximos meses e resumo de receitas e despesas.',
  },
  {
    href: '/checklist',
    icon: CheckSquare,
    titulo: 'Controle Mensal',
    descricao: 'Marque mês a mês quais despesas já foram pagas. Mantenha o controle do que está em aberto e do que já foi quitado.',
  },
  {
    href: '/cartao',
    icon: CreditCard,
    titulo: 'Cartão de Crédito',
    descricao: 'Registre os gastos no cartão, acompanhe o total da fatura atual e visualize o histórico por mês.',
  },
  {
    href: '/despesas',
    icon: Receipt,
    titulo: 'Despesas Previstas',
    descricao: 'Cadastre suas despesas recorrentes (fixas, estimadas, sazonais ou pontuais) para que o app projete seus gastos futuros.',
  },
  {
    href: '/receitas',
    icon: TrendingUp,
    titulo: 'Receitas',
    descricao: 'Registre todas as suas fontes de renda — salário, freelas, aluguéis — para calcular seu saldo mensal real.',
  },
  {
    href: '/reservas',
    icon: PiggyBank,
    titulo: 'Reservas',
    descricao: 'Acompanhe seu fundo de emergência e outras reservas financeiras. Veja o progresso em relação à sua meta.',
  },
  {
    href: '/cadastros/cartoes',
    icon: Wallet,
    titulo: 'Cadastros',
    descricao: 'Configure seus cartões de crédito, contas bancárias e categorias. É o ponto de partida para organizar tudo.',
  },
]

const passos = [
  {
    numero: '1',
    titulo: 'Configure seus cadastros',
    descricao: 'Comece cadastrando seus cartões, contas e categorias em Cadastros. Isso é a base para todo o restante.',
    href: '/cadastros/cartoes',
  },
  {
    numero: '2',
    titulo: 'Registre suas receitas',
    descricao: 'Adicione suas fontes de renda em Receitas para que o app saiba com quanto você conta por mês.',
    href: '/receitas',
  },
  {
    numero: '3',
    titulo: 'Lance suas despesas previstas',
    descricao: 'Cadastre seus gastos fixos e recorrentes em Despesas Previstas. O app vai projetá-los automaticamente.',
    href: '/despesas',
  },
  {
    numero: '4',
    titulo: 'Acompanhe pelo Dashboard',
    descricao: 'Com tudo configurado, o Dashboard mostra seu saldo previsto e a projeção dos próximos meses.',
    href: '/dashboard',
  },
]

export default async function SobrePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const nome = (user?.user_metadata?.nome as string | undefined)
    ?? user?.email?.split('@')[0]
    ?? 'você'
  const primeiroNome = nome.split(' ')[0]

  const whatsappUrl = 'https://wa.me/5531986944772?text=Olá%20Francisco,%20tenho%20uma%20dúvida%20sobre%20o%20Aruna%20Personal!'

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-12">

        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img
              src="/icon-192.png"
              alt="Aruna Personal"
              className="h-20 w-20 rounded-3xl shadow-lg object-cover"
            />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-semibold text-foreground">
              Olá, {primeiroNome}! 👋
            </h1>
            <p className="mt-2 text-muted-foreground text-base max-w-md mx-auto">
              Bem-vindo ao Aruna Personal — seu app de finanças pessoais. Organize suas receitas, despesas e reservas em um só lugar.
            </p>
          </div>
          <Link href="/dashboard">
            <Button className="gap-2 mt-2">
              Ir para o Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Por onde começar */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h2 className="text-lg font-serif font-semibold text-foreground">Por onde começar</h2>
          </div>
          <div className="space-y-3">
            {passos.map((passo) => (
              <Link key={passo.numero} href={passo.href}>
                <Card className="hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer">
                  <CardContent className="p-4 flex gap-4 items-start">
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                      {passo.numero}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{passo.titulo}</p>
                      <p className="text-muted-foreground text-sm mt-0.5">{passo.descricao}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Seções do app */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-accent" />
            <h2 className="text-lg font-serif font-semibold text-foreground">O que cada seção faz</h2>
          </div>
          <div className="grid gap-3">
            {secoes.map((secao) => (
              <Link key={secao.href} href={secao.href}>
                <Card className="hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer">
                  <CardContent className="p-4 flex gap-3 items-start">
                    <div className="h-8 w-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                      <secao.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{secao.titulo}</p>
                      <p className="text-muted-foreground text-sm mt-0.5">{secao.descricao}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1 ml-auto" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Contato */}
        <section>
          <Card className="border-accent/20 bg-accent/5">
            <CardContent className="p-6 text-center space-y-3">
              <MessageCircle className="h-8 w-8 text-accent mx-auto" />
              <div>
                <h3 className="font-serif font-semibold text-foreground">Ficou com dúvida?</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Entre em contato pelo WhatsApp. Estou aqui para ajudar.
                </p>
              </div>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2 border-accent/40 text-accent hover:bg-accent/10 hover:text-accent">
                  <MessageCircle className="h-4 w-4" />
                  Falar no WhatsApp
                </Button>
              </a>
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  )
}
