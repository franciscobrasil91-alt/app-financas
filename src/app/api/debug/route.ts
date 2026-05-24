import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const cookieStore = cookies()
  const allCookies = cookieStore.getAll()
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()

  return NextResponse.json({
    cookieCount: allCookies.length,
    cookieNames: allCookies.map(c => c.name),
    user: user ? { id: user.id, email: user.email, confirmed: user.confirmed_at } : null,
    session: session ? { expires: session.expires_at } : null,
    error: error?.message ?? null,
  })
}
