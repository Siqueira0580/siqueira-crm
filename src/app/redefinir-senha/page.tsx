'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { validarSenha } from '@/lib/validar-senha'
import { Eye, EyeOff, Loader2, KeyRound, CheckCircle, AlertCircle } from 'lucide-react'

const supabase = createClient()

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    // Verifica se o usuário está logado (veio do login com senha provisória)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setHasSession(true)
      }
      setCheckingSession(false)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const erroSenha = validarSenha(password)
    if (erroSenha) {
      setError(erroSenha)
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      // Atualiza a senha e remove o flag de senha provisória
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { must_change_password: false },
      })
      if (updateError) throw new Error(updateError.message)

      setStatus('success')
      setTimeout(() => router.push('/dashboard'), 2500)
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar a senha. Tente novamente.')
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  // Carregando verificação de sessão
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 text-center max-w-sm w-full">
          <Loader2 size={36} className="animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Verificando sessão...</p>
        </div>
      </div>
    )
  }

  // Sem sessão ativa — usuário chegou aqui sem ter feito login
  if (!hasSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 text-center max-w-sm w-full">
          <AlertCircle size={36} className="text-amber-500 mx-auto mb-4" />
          <h2 className="text-slate-800 font-semibold mb-2">Sessão não encontrada</h2>
          <p className="text-slate-500 text-sm mb-6">
            Faça login com sua senha provisória para acessar esta página.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="btn-primary w-full justify-center"
          >
            Ir para o login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl mb-4 shadow-xl p-2">
            <Image src="/logo.png" alt="Siqueira" width={68} height={68} className="object-contain" priority />
          </div>
          <h1 className="text-2xl font-bold text-white">Siqueira CRM</h1>
          <p className="text-blue-300 text-sm mt-1">Criar senha definitiva</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {status === 'success' ? (
            <div className="text-center">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-slate-800">Senha criada com sucesso!</h2>
              <p className="text-slate-500 text-sm mt-2">Redirecionando para o dashboard...</p>
              <Loader2 size={18} className="animate-spin text-blue-500 mx-auto mt-4" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <KeyRound size={18} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Crie sua senha definitiva</h2>
                  <p className="text-xs text-slate-500">Mínimo de 8 caracteres, com letras e números</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-5 text-sm text-blue-700">
                Você entrou com uma senha provisória. Defina agora sua senha permanente.
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Nova senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input pr-10"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={8}
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

                <div>
                  <label className="label">Confirmar nova senha</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                    <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Salvar senha definitiva
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
