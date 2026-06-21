'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'
import InactivityGuard from './InactivityGuard'
import { createClient } from '@/lib/supabase'
import type { Profile, Notificacao } from '@/types'

interface AppLayoutProps {
  children: React.ReactNode
  title: string
}

const supabase = createClient()

export default function AppLayout({ children, title }: AppLayoutProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [notifications, setNotifications] = useState<Notificacao[]>([])
  const [authChecked, setAuthChecked] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push('/login')
        return
      }

      // Verifica se o usuário foi bloqueado pelo administrador. O ban do Supabase Auth
      // impede novos logins/refresh, mas não invalida um access token já emitido — esta
      // checagem fecha essa janela, encerrando a sessão na próxima navegação.
      try {
        const statusRes = await fetch('/api/auth/status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const statusData = await statusRes.json()
        if (statusData?.bloqueado) {
          await supabase.auth.signOut({ scope: 'global' })
          router.push('/login?error=bloqueado')
          return
        }
      } catch {
        // Falha na checagem não deve impedir o uso normal do sistema
      }

      // Se o usuário tem verificação em duas etapas (2FA) ativada e ainda não a
      // completou nesta sessão, manda para a tela de verificação antes de qualquer página interna.
      try {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel) {
          router.push('/verificar-2fa')
          return
        }
      } catch {
        // Falha na checagem de 2FA não deve travar o usuário sem 2FA ativado
      }

      setUserEmail(session.user.email || '')

      const [{ data: profileData }, { data: notifData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase
          .from('notificacoes')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(30),
      ])

      if (profileData) setProfile(profileData as any)
      setNotifications((notifData || []) as any)
      setAuthChecked(true)
    }

    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const markRead = async (id: string) => {
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
  }

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.lida).map(n => n.id)
    if (unreadIds.length === 0) return
    await supabase.from('notificacoes').update({ lida: true }).in('id', unreadIds)
    setNotifications(prev => prev.map(n => ({ ...n, lida: true })))
  }

  const notifCount = notifications.filter(n => !n.lida).length

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <InactivityGuard />

      {/* Overlay escuro atrás do menu — só em mobile/tablet, fecha ao tocar fora */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        notifCount={notifCount}
        role={profile?.role}
        email={userEmail}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="lg:ml-64">
        <Header
          title={title}
          userName={profile?.nome || ''}
          notifications={notifications}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="p-3 sm:p-6 pb-20 lg:pb-6">{children}</main>
      </div>

      <BottomNav onMenuClick={() => setSidebarOpen(true)} />
    </div>
  )
}
