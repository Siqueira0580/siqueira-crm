'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase'
import { ShieldCheck, AlertCircle, Users, History, Image as ImageIcon, Database } from 'lucide-react'
import TabUsuarios from './_components/TabUsuarios'
import TabAcessos from './_components/TabAcessos'
import TabPerfilHome from './_components/TabPerfilHome'
import TabSistema from './_components/TabSistema'

const supabase = createClient()
const FIXED_ADMIN = 'duda.siqueira2@gmail.com'

const TABS = [
  { id: 'usuarios', label: 'Usuários', icon: Users },
  { id: 'acessos', label: 'Acessos', icon: History },
  { id: 'home', label: 'Perfil da Home', icon: ImageIcon },
  { id: 'sistema', label: 'Sistema', icon: Database },
] as const

type TabId = typeof TABS[number]['id']

function AdminContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [filtroUsuario, setFiltroUsuario] = useState<{ id: string; nome: string } | null>(null)

  const tabParam = searchParams.get('tab') as TabId | null
  const tab: TabId = TABS.some(t => t.id === tabParam) ? (tabParam as TabId) : 'usuarios'

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setAllowed(!!session?.user && session.user.email === FIXED_ADMIN)
    }
    check()
  }, [])

  const irPara = (novaTab: TabId) => {
    router.push(`/admin?tab=${novaTab}`)
  }

  const verAcessosDoUsuario = (userId: string, nome: string) => {
    setFiltroUsuario({ id: userId, nome })
    irPara('acessos')
  }

  if (allowed === false) {
    return (
      <AppLayout title="Acesso Negado">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <AlertCircle size={48} className="text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700">Acesso restrito</h2>
          <p className="text-slate-500 mt-2">Apenas o administrador pode acessar esta página.</p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary mt-6">
            Voltar ao Dashboard
          </button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Administração">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck size={22} className="text-indigo-600" />
            Administração do Sistema
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Usuários, acessos, conteúdo da home e backup de dados.</p>
        </div>

        <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => irPara(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={15} />
                {t.label}
              </button>
            )
          })}
        </div>

        {allowed === null ? (
          <div className="flex items-center justify-center py-24 text-slate-400">Carregando...</div>
        ) : (
          <>
            {tab === 'usuarios' && <TabUsuarios onVerAcessos={verAcessosDoUsuario} />}
            {tab === 'acessos' && <TabAcessos filtroUsuario={filtroUsuario} />}
            {tab === 'home' && <TabPerfilHome />}
            {tab === 'sistema' && <TabSistema />}
          </>
        )}
      </div>
    </AppLayout>
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AdminContent />
    </Suspense>
  )
}
