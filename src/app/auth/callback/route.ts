import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { registrarAcesso, obterIpDoRequest } from '@/lib/log-acesso'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error')
  const oauthErrorDesc = searchParams.get('error_description')

  // Supabase / Google retornou erro antes de chegar aqui
  if (oauthError) {
    console.error('[OAuth] Erro recebido:', oauthError, oauthErrorDesc)
    return NextResponse.redirect(`${origin}/login?error=oauth_falhou`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_falhou`)
  }

  // Cria resposta de sucesso (cookies serão injetados nela)
  const successRes = NextResponse.redirect(`${origin}/dashboard`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          successRes.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          successRes.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Troca o code pela sessão
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('[OAuth] exchangeCodeForSession falhou:', exchangeError.message)
    return NextResponse.redirect(`${origin}/login?error=oauth_falhou`)
  }

  // Pega a sessão recém-criada
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    return NextResponse.redirect(`${origin}/login?error=oauth_falhou`)
  }

  // Verifica se o usuário está cadastrado na tabela profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', session.user.id)
    .single()

  if (profileError || !profile) {
    // Conta Google não cadastrada — invalida sessão
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=nao_autorizado`)
  }

  // Registra data/hora/IP/dispositivo do acesso (não bloqueia o login em caso de falha)
  registrarAcesso({
    userId: session.user.id,
    email: session.user.email || '',
    nome: session.user.user_metadata?.nome || session.user.user_metadata?.full_name || null,
    ip: obterIpDoRequest(req),
    userAgent: req.headers.get('user-agent'),
    metodo: 'google',
  })

  return successRes
}
