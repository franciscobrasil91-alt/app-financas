import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const url = request.nextUrl.clone()
  const isAuthPage = url.pathname.startsWith('/login') || url.pathname.startsWith('/cadastro')
  const isApiRoute = url.pathname.startsWith('/api')

  if (isApiRoute) return supabaseResponse

  // Sem sessão → redireciona para login
  if (!session && !isAuthPage) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Com sessão em página de auth → redireciona para dashboard
  if (session && isAuthPage) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Com sessão em página protegida → verifica whitelist
  if (session && !isAuthPage) {
    const userEmail = session.user.email ?? ''
    const isAdmin = userEmail === process.env.ADMIN_EMAIL

    if (!isAdmin) {
      // Usa cookie para não bater no banco em toda requisição
      const wlCookie = request.cookies.get('wl_ok')
      const isVerified = wlCookie?.value === userEmail

      if (!isVerified) {
        const { data: permitido } = await supabase
          .from('usuarios_permitidos')
          .select('email')
          .eq('email', userEmail)
          .maybeSingle()

        if (!permitido) {
          // Não autorizado — desloga e redireciona
          await supabase.auth.signOut()
          url.pathname = '/login'
          url.searchParams.set('erro', 'nao_autorizado')
          const redirectResponse = NextResponse.redirect(url)
          // Limpa cookies de sessão
          supabaseResponse.cookies.getAll().forEach(c => {
            redirectResponse.cookies.delete(c.name)
          })
          return redirectResponse
        }

        // Marca como verificado por 24h
        supabaseResponse.cookies.set('wl_ok', userEmail, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24,
          path: '/',
        })
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webpo)$).*)',
  ],
}
