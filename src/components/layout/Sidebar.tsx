'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, Users, Building2, CalendarCheck,
  TrendingUp, LogOut, ChevronRight, FileText, UserCog, ShieldCheck, CircleUser, Brain, Radar, Send, X
} from 'lucide-react'

const FIXED_ADMIN = 'duda.siqueira2@gmail.com'

const navItems = [
  { href: '/dashboard',        label: 'Dashboard',    icon: LayoutDashboard, adminOnly: false, fixedAdminOnly: false },
  { href: '/clientes',         label: 'Clientes',     icon: Users,           adminOnly: false, fixedAdminOnly: false },
  { href: '/imoveis',          label: 'Imóveis',      icon: Building2,       adminOnly: false, fixedAdminOnly: false },
  { href: '/visitas',          label: 'Visitas',      icon: CalendarCheck,   adminOnly: false, fixedAdminOnly: false },
  { href: '/pipeline',         label: 'Pipeline',     icon: TrendingUp,      adminOnly: false, fixedAdminOnly: false },
  { href: '/relatorios',       label: 'Relatórios',   icon: FileText,        adminOnly: false, fixedAdminOnly: false },
  { href: '/analise-comportamento', label: 'Análise IA',  icon: Brain,           adminOnly: false, fixedAdminOnly: false },
  { href: '/radar-leads',           label: 'Radar',       icon: Radar,           adminOnly: false, fixedAdminOnly: false },
  { href: '/recursos-captacao',     label: 'Captação',    icon: Send,            adminOnly: false, fixedAdminOnly: false },
  { href: '/equipe',           label: 'Equipe',       icon: UserCog,         adminOnly: true,  fixedAdminOnly: false },
  { href: '/admin',            label: 'Administração', icon: ShieldCheck,    adminOnly: false, fixedAdminOnly: true  },
  { href: '/perfil',           label: 'Meu Perfil',   icon: CircleUser,      adminOnly: false, fixedAdminOnly: false },
]

interface SidebarProps {
  notifCount?: number
  role?: string
  email?: string
  mobileOpen?: boolean
  onClose?: () => void
}

const supabase = createClient()

export default function Sidebar({ notifCount = 0, role, email, mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    // scope: 'global' invalida a sessão no servidor (todas as abas/dispositivos)
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/')
    router.refresh()
  }

  const isFixedAdmin = email === FIXED_ADMIN

  const visibleItems = navItems.filter(item => {
    if (item.fixedAdminOnly) return isFixedAdmin
    if (item.adminOnly) return role === 'admin' || isFixedAdmin
    return true
  })

  return (
    <aside className={`fixed left-0 top-0 h-screen w-64 bg-slate-900 flex flex-col z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
      mobileOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>

      {/* Logo */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white/10 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Siqueira Logo"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Siqueira CRM</p>
            <p className="text-slate-400 text-xs">Imobiliária</p>
          </div>
        </div>
        {/* Fechar — só aparece no drawer mobile */}
        <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        {visibleItems.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                active
                  ? 'bg-blue-600 text-white font-medium shadow'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon size={18} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight size={14} />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 pb-4 border-t border-white/10 pt-3">
        {isFixedAdmin && (
          <div className="mb-2 px-3 py-1.5 bg-amber-500/20 rounded-lg">
            <p className="text-amber-400 text-xs font-medium flex items-center gap-1.5">
              <ShieldCheck size={12} /> Administrador
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  )
}
