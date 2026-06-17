'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase'
import {
  User, Mail, Shield, Key, Eye, EyeOff,
  CheckCircle2, AlertTriangle, Loader2, Lock
} from 'lucide-react'

const supabase = createClient()

interface UserInfo {
  id: string
  nome: string
  email: string
  role: string
  provider: string   // 'email' | 'google' | etc.
  avatar_url?: string
  telefone?: string
}

export default function PerfilPage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // Troca de senha
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [showSenhaAtual, setShowSenhaAtual] = useState(false)
  const [showNovaSenha, setShowNovaSenha] = useState(false)
  const [showConfirma, setShowConfirma] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [senhaOk, setSenhaOk] = useState(false)
  const [senhaErro, setSenhaErro] = useState('')

  // Edição de perfil
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)
  const [perfilOk, setPerfilOk] = useState(false)
  const [perfilErro, setPerfilErro] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      const provider = session.user.app_metadata?.provider || 'email'

      const info: UserInfo = {
        id: session.user.id,
        nome: (profile as any)?.nome || session.user.email?.split('@')[0] || '',
        email: session.user.email || '',
        role: (profile as any)?.role || 'corretor',
        provider,
        avatar_url: (profile as any)?.avatar_url,
        telefone: (profile as any)?.telefone || '',
      }
      setUser(info)
      setNome(info.nome)
      setTelefone(info.telefone || '')
      setLoading(false)
    }
    load()
  }, [])

  const isGoogleUser = user?.provider === 'google'

  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoPerfil(true)
    setPerfilOk(false)
    setPerfilErro('')

    const { error } = await supabase
      .from('profiles')
      .update({ nome: nome.trim(), telefone: telefone.trim() || null })
      .eq('id', user!.id)

    setSalvandoPerfil(false)
    if (error) {
      setPerfilErro('Erro ao salvar. Tente novamente.')
    } else {
      setPerfilOk(true)
      setUser(u => u ? { ...u, nome: nome.trim(), telefone: telefone.trim() } : u)
      setTimeout(() => setPerfilOk(false), 3000)
    }
  }

  const handleTrocarSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    setSenhaErro('')
    setSenhaOk(false)

    if (novaSenha.length < 6) {
      setSenhaErro('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (novaSenha !== confirmaSenha) {
      setSenhaErro('As senhas não coincidem.')
      return
    }

    setSalvando(true)

    // Reautentica com a senha atual para verificar
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: user!.email,
      password: senhaAtual,
    })

    if (authErr) {
      setSenhaErro('Senha atual incorreta.')
      setSalvando(false)
      return
    }

    // Atualiza para nova senha
    const { error: updateErr } = await supabase.auth.updateUser({ password: novaSenha })
    setSalvando(false)

    if (updateErr) {
      setSenhaErro('Erro ao atualizar senha. Tente novamente.')
    } else {
      setSenhaOk(true)
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmaSenha('')
      setTimeout(() => setSenhaOk(false), 4000)
    }
  }

  const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    admin:    { label: 'Administrador', color: 'bg-amber-100 text-amber-800' },
    corretor: { label: 'Corretor',      color: 'bg-blue-100 text-blue-800' },
  }

  const roleInfo = ROLE_LABELS[user?.role || 'corretor'] || ROLE_LABELS.corretor

  return (
    <AppLayout title="Meu Perfil">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={28} className="animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6">

          {/* ── Cabeçalho do perfil ── */}
          <div className="card flex items-center gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0 text-white text-2xl font-bold shadow">
              {user?.nome?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white truncate">{user?.nome}</h2>
              <p className="text-slate-500 text-sm truncate">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleInfo.color}`}>
                  <Shield size={11} className="inline mr-1" />
                  {roleInfo.label}
                </span>
                {isGoogleUser && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Conta Google
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Dados do perfil ── */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
              <User size={17} className="text-blue-500" /> Dados pessoais
            </h3>
            <form onSubmit={handleSalvarPerfil} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nome completo
                </label>
                <input
                  type="text"
                  className="input"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  <Mail size={13} className="inline mr-1" /> E-mail
                </label>
                <input
                  type="email"
                  className="input bg-slate-50 dark:bg-slate-800 cursor-not-allowed"
                  value={user?.email}
                  disabled
                  title="O e-mail não pode ser alterado aqui"
                />
                <p className="text-xs text-slate-400 mt-1">O e-mail não pode ser alterado.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  className="input"
                  placeholder="(00) 00000-0000"
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
                />
              </div>

              {perfilErro && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                  <AlertTriangle size={14} /> {perfilErro}
                </div>
              )}
              {perfilOk && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                  <CheckCircle2 size={14} /> Perfil atualizado com sucesso!
                </div>
              )}

              <button
                type="submit"
                disabled={salvandoPerfil}
                className="btn-primary"
              >
                {salvandoPerfil && <Loader2 size={15} className="animate-spin" />}
                Salvar alterações
              </button>
            </form>
          </div>

          {/* ── Troca de senha ── */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
              <Key size={17} className="text-blue-500" /> Trocar senha
            </h3>

            {isGoogleUser ? (
              <div className="mt-4 flex items-start gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <Lock size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Conta gerenciada pelo Google</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Sua conta usa o Google como método de autenticação. Para alterar sua senha,
                    acesse as configurações da sua conta Google em{' '}
                    <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:underline">
                      myaccount.google.com
                    </a>.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-5">
                  Escolha uma senha forte com pelo menos 6 caracteres.
                </p>
                <form onSubmit={handleTrocarSenha} className="space-y-4">
                  {/* Senha atual */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Senha atual
                    </label>
                    <div className="relative">
                      <input
                        type={showSenhaAtual ? 'text' : 'password'}
                        className="input pr-10"
                        placeholder="••••••••"
                        value={senhaAtual}
                        onChange={e => setSenhaAtual(e.target.value)}
                        required
                      />
                      <button type="button" onClick={() => setShowSenhaAtual(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showSenhaAtual ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Nova senha */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Nova senha
                    </label>
                    <div className="relative">
                      <input
                        type={showNovaSenha ? 'text' : 'password'}
                        className="input pr-10"
                        placeholder="Mínimo 6 caracteres"
                        value={novaSenha}
                        onChange={e => setNovaSenha(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button type="button" onClick={() => setShowNovaSenha(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showNovaSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {/* Indicador de força */}
                    {novaSenha && (
                      <div className="flex gap-1 mt-2">
                        {[
                          novaSenha.length >= 6,
                          /[A-Z]/.test(novaSenha),
                          /[0-9]/.test(novaSenha),
                          /[^A-Za-z0-9]/.test(novaSenha),
                        ].map((ok, i) => (
                          <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${ok ? 'bg-green-500' : 'bg-slate-200'}`} />
                        ))}
                      </div>
                    )}
                    {novaSenha && (
                      <p className="text-xs text-slate-400 mt-1">
                        Força: {
                          [/[A-Z]/.test(novaSenha), /[0-9]/.test(novaSenha), /[^A-Za-z0-9]/.test(novaSenha)].filter(Boolean).length === 0 ? 'Fraca' :
                          [/[A-Z]/.test(novaSenha), /[0-9]/.test(novaSenha), /[^A-Za-z0-9]/.test(novaSenha)].filter(Boolean).length === 1 ? 'Regular' :
                          [/[A-Z]/.test(novaSenha), /[0-9]/.test(novaSenha), /[^A-Za-z0-9]/.test(novaSenha)].filter(Boolean).length === 2 ? 'Boa' : 'Forte'
                        }
                      </p>
                    )}
                  </div>

                  {/* Confirmar senha */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Confirmar nova senha
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirma ? 'text' : 'password'}
                        className={`input pr-10 ${confirmaSenha && confirmaSenha !== novaSenha ? 'border-red-300 focus:ring-red-500' : ''}`}
                        placeholder="Repita a nova senha"
                        value={confirmaSenha}
                        onChange={e => setConfirmaSenha(e.target.value)}
                        required
                      />
                      <button type="button" onClick={() => setShowConfirma(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showConfirma ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {confirmaSenha && confirmaSenha !== novaSenha && (
                      <p className="text-xs text-red-500 mt-1">As senhas não coincidem.</p>
                    )}
                  </div>

                  {senhaErro && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                      <AlertTriangle size={14} /> {senhaErro}
                    </div>
                  )}
                  {senhaOk && (
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                      <CheckCircle2 size={14} /> Senha alterada com sucesso!
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={salvando || !senhaAtual || !novaSenha || !confirmaSenha}
                    className="btn-primary"
                  >
                    {salvando && <Loader2 size={15} className="animate-spin" />}
                    Alterar senha
                  </button>
                </form>
              </>
            )}
          </div>

        </div>
      )}
    </AppLayout>
  )
}
