import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const nome = (user.user_metadata?.nome as string | undefined) ?? user.email?.split('@')[0] ?? 'você'

  return (
    <div className="min-h-screen bg-background">
      <Sidebar email={user.email} nome={nome} isAdmin={user.email === process.env.ADMIN_EMAIL} />

      {/* Main content — offset sidebar on desktop, top bar on mobile */}
      <main className="lg:pl-64">
        <div className="pt-14 lg:pt-0">
          {children}
        </div>
      </main>
    </div>
  )
}
