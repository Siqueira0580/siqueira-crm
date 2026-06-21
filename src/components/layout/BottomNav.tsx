'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Building2, TrendingUp, Menu } from 'lucide-react'

const ITEMS = [
  { href: '/dashboard', label: 'Início',   icon: LayoutDashboard },
  { href: '/clientes',  label: 'Clientes', icon: Users },
  { href: '/imoveis',   label: 'Imóveis',  icon: Building2 },
  { href: '/pipeline',  label: 'Pipeline', icon: TrendingUp },
]

interface BottomNavProps {
  onMenuClick: () => void
}

// Barra de acesso rápido só em mobile/tablet (escondida a partir de lg, onde o
// menu lateral já fica fixo na tela). Os 4 itens mais usados no dia a dia +
// "Mais", que abre o menu lateral completo com o restante das páginas.
export default function BottomNav({ onMenuClick }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {ITEMS.map(item => {
        const Icon = item.icon
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
              active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Icon size={20} />
            {item.label}
          </Link>
        )
      })}
      <button
        onClick={onMenuClick}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-slate-500 dark:text-slate-400"
      >
        <Menu size={20} />
        Mais
      </button>
    </nav>
  )
}
