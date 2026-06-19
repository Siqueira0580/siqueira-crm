'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/recuperar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao processar solicitação.')

      setEnviado(true)
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar o e-mail. Tente novamente.')
    } finally {
      setLoading(false)
    }
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
          <p className="text-blue-300 text-sm mt-1">Recuperação de acesso</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {enviado ? (
            <div className="text-center">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-slate-800">Senha provisória enviada!</h2>
              <p className="text-slate-500 text-sm mt-2">
                Enviamos uma senha provisória para{' '}
                <span className="font-medium text-slate-700">{email}</span>.
              </p>
              <p className="text-slate-500 text-sm mt-2">
                Use-a para entrar no sistema — ao fazer login, você será solicitado a criar uma senha definitiva.
              </p>
              <p className="text-xs text-slate-400 mt-3">Não encontrou? Verifique a pasta de spam.</p>
              <Link href="/login" className="btn-primary inline-flex items-center gap-2 mt-6">
                <ArrowLeft size={15} />
                Ir para o login
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Mail size={18} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Esqueceu a senha?</h2>
                  <p className="text-xs text-slate-500">Enviaremos uma senha provisória por e-mail</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">E-mail cadastrado</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Enviar senha provisória
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1">
                  <ArrowLeft size={14} />
                  Voltar ao login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
