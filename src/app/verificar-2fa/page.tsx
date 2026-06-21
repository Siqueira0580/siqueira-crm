'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ShieldCheck, Loader2, AlertTriangle, LogOut } from 'lucide-react'

const supabase = createClient()

export default function Verificar2FAPage() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [factorId, setFactorId] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [verificando, setVerificando] = useState(false)

  useEffect(() => {
    const preparar = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        router.push('/login')
        return
      }

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal && aal.currentLevel === aal.nextLevel) {
        // Já satisfez o nível exigido (ou 2FA não está ativo) — segue normalmente
        router.push('/dashboard')
        return
      }

      const { data: factorsData, error: factorsErr } = await supabase.auth.mfa.listFactors()
      const factor = factorsData?.totp?.find(f => f.status === 'verified')
      if (factorsErr || !factor) {
        setErro('Não foi possível carregar a verificação em duas etapas. Tente sair e entrar novamente.')
        setCarregando(false)
        return
      }
      setFactorId(factor.id)

      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: factor.id })
      if (challengeErr || !challenge) {
        setErro('Não foi possível iniciar a verificação. Tente novamente.')
        setCarregando(false)
        return
      }
      setChallengeId(challenge.id)
      setCarregando(false)
    }
    preparar()
  }, [router])

  const handleVerificar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setVerificando(true)
    try {
      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code: codigo.trim() })
      if (error) throw error
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setErro('Código inválido ou expirado. Tente novamente.')
      setCodigo('')
    } finally {
      setVerificando(false)
    }
  }

  const sair = async () => {
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-4">
              <ShieldCheck size={26} className="text-white" />
            </div>
            <h1 className="text-xl font-semibold text-slate-800">Verificação em duas etapas</h1>
            <p className="text-sm text-slate-500 mt-1">Digite o código gerado pelo seu app autenticador.</p>
          </div>

          {carregando ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : (
            <form onSubmit={handleVerificar} className="space-y-4">
              <input
                className="input text-center text-lg tracking-widest"
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={codigo}
                onChange={e => setCodigo(e.target.value.replace(/\D/g, ''))}
                disabled={!challengeId}
                required
              />
              {erro && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" /> {erro}
                </div>
              )}
              <button type="submit" disabled={verificando || codigo.length < 6 || !challengeId} className="btn-primary w-full justify-center py-2.5">
                {verificando && <Loader2 size={16} className="animate-spin" />}
                Verificar
              </button>
            </form>
          )}

          <button onClick={sair} className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-600 mt-6">
            <LogOut size={14} /> Sair e entrar com outra conta
          </button>
        </div>
      </div>
    </div>
  )
}
