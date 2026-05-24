'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, CreditCard, Receipt, TrendingUp, PiggyBank,
  Wallet, Tag, LogOut, Menu, X, ChevronDown, CheckSquare, Shield
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { LancamentoRapidoDialog } from '@/components/sidebar/LancamentoRapidoDialog'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/checklist', label: 'Controle Mensal', icon: CheckSquare },
  { href: '/cartao', label: 'Cartão de Crédito', icon: CreditCard },
  { href: '/despesas', label: 'Despesas Previstas', icon: Receipt },
  { href: '/receitas', label: 'Receitas', icon: TrendingUp },
  { href: '/reservas', label: 'Reservas', icon: PiggyBank },
]

const cadastroItems = [
  { href: '/cadastros/cartoes', label: 'Cartões', icon: CreditCard },
  { href: '/cadastros/contas', label: 'Contas', icon: Wallet },
  { href: '/cadastros/categorias', label: 'Categorias', icon: Tag },
]

interface SidebarProps {
  email?: string
  isAdmin?: boolean
}

export function Sidebar({ email, isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [cadastrosOpen, setCadastrosOpen] = useState(
    pathname.startsWith('/cadastros')
  )
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Sessão encerrada')
    router.push('/login')
    router.refresh()
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <Link href="/sobre" onClick={() => setMobileOpen(false)} className="flex h-14 items-center px-5 border-b border-border gap-2.5 hover:bg-muted/50 transition-colors">
        <img src="/icon-192.png" alt="Aruna Personal" className="h-7 w-7 rounded-md shrink-0 object-cover" />
        <div className="leading-tight">
          <span className="font-serif font-semibold text-foreground tracking-tight text-base">Aruna</span>
          <span className="text-xs text-muted-foreground ml-1.5 font-sans">Personal</span>
        </div>
      </Link>

      {/* Atalho rápido */}
      <div className="px-3 pt-3">
        <LancamentoRapidoDialog />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname === item.href || pathname.startsWith(item.href + '/')
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        ))}

        {/* Cadastros submenu */}
        <div>
          <button
            onClick={() => setCadastrosOpen(!cadastrosOpen)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith('/cadastros')
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Wallet className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Cadastros</span>
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', cadastrosOpen && 'rotate-180')} />
          </button>

          {cadastrosOpen && (
            <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3">
              {cadastroItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
                    pathname === item.href
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* User */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 mb-2 px-1">
          <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
            {email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <span className="text-muted-foreground text-xs truncate flex-1">{email}</span>
        </div>
        {isAdmin && (
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors mb-1',
              pathname === '/admin'
                ? 'bg-indigo-50 text-indigo-600 font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Shield className="h-3.5 w-3.5" />
            Controle de Acesso
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-border z-40">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-border h-14 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-muted-foreground p-1 hover:text-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <img src="/icon-192.png" alt="Aruna Personal" className="h-6 w-6 rounded-md shrink-0 object-cover" />
        <span className="font-serif font-semibold text-foreground text-sm">Aruna Personal</span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarContent />
      </div>
    </>
  )
}
