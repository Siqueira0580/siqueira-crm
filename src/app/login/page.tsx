'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react'

const supabase = createClient()

// Ícone Google SVG
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const err = searchParams.get('error')
    if (err === 'nao_autorizado') {
      setError('Acesso negado. Sua conta Google não está cadastrada no sistema. Solicite acesso ao administrador.')
    } else if (err === 'oauth_falhou') {
      setError('Falha ao autenticar com o Google. Verifique se as configurações OAuth estão corretas no Supabase e tente novamente.')
    } else if (err === 'bloqueado') {
      setError('Seu acesso foi bloqueado pelo administrador. Entre em contato para mais informações.')
    } else if (err === 'inatividade') {
      setError('Sua sessão foi encerrada por inatividade. Entre novamente.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('E-mail ou senha inválidos. Verifique suas credenciais ou use "Esqueci minha senha".')
        fetch('/api/log-acesso-falha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }).catch(() => {})
        return
      }

      // Registra data/hora/IP/dispositivo do acesso (não bloqueia o login em caso de falha)
      if (data.session?.access_token) {
        fetch('/api/log-acesso', {
          method: 'POST',
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        }).catch(() => {})
      }

      // Se o usuário recebeu uma senha provisória, redireciona para redefinir senha
      if (data.user?.user_metadata?.must_change_password) {
        router.push('/redefinir-senha')
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoadingGoogle(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) {
      setError('Erro ao iniciar login com Google.')
      setLoadingGoogle(false)
    }
    // Se não houve erro, o browser vai redirecionar automaticamente
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-2xl mb-4 shadow-xl p-2">
            <Image
              src="/logo.png"
              alt="Siqueira Inteligência Imobiliária"
              width={80}
              height={80}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-white">Siqueira CRM</h1>
          <p className="text-blue-300 text-sm mt-1">Inteligência Imobiliária</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">Entrar na conta</h2>

          {/* Erro global */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Botão Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loadingGoogle || loading}
            className="w-full flex items-center justify-center gap-3 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-xl transition-all disabled:opacity-60 mb-5"
          >
            {loadingGoogle
              ? <Loader2 size={18} className="animate-spin text-slate-400" />
              : <GoogleIcon />
            }
            {loadingGoogle ? 'Redirecionando...' : 'Entrar com Google'}
          </button>

          {/* Divisor */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-slate-400">ou entre com e-mail</span>
            </div>
          </div>

          {/* Formulário e-mail/senha */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                className="input"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Senha</label>
                <Link href="/esqueci-senha" className="text-xs text-blue-600 hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || loadingGoogle} className="btn-primary w-full justify-center py-2.5">
              {loading && <Loader2 size={16} className="animate-spin" />}
              Entrar
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            O acesso é concedido pelo administrador do sistema.
          </p>
        </div>

        <p className="text-center mt-6">
          <Link href="/" className="text-blue-300 hover:text-white text-sm transition-colors">
            ← Voltar ao site
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-white" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
