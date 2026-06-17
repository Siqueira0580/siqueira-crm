'use client'
import { useState, useRef, useEffect } from 'react'
import { Bell, Check, CheckCheck, Sun, Moon } from 'lucide-react'
import Link from 'next/link'
import { getInitials, formatDateTime } from '@/lib/utils'
import { useTheme } from '@/providers/ThemeProvider'
import GlobalSearch from './GlobalSearch'
import type { Notificacao } from '@/types'

interface HeaderProps {
  title: string
  userName?: string
  notifications?: Notificacao[]
  onMarkRead?: (id: string) => void
  onMarkAllRead?: () => void
}

export default function Header({
  title,
  userName = '',
  notifications = [],
  onMarkRead,
  onMarkAllRead,
}: HeaderProps) {
  const { theme, toggle: toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = notifications.filter(n => !n.lida).length

  const tipoIcon: Record<string, string> = {
    visita: '📅',
    cliente: '👤',
    imovel: '🏠',
    sistema: '⚙️',
  }

  return (
    <header className="h-16 border-b flex items-center justify-between px-6 sticky top-0 z-30 transition-colors duration-200"
      style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--border)' }}>

      <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h1>

      <div className="flex items-center gap-2">

        {/* Busca global */}
        <GlobalSearch />

        {/* Toggle dark/light */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          {theme === 'dark'
            ? <Sun size={18} className="text-amber-400" />
            : <Moon size={18} className="text-slate-500" />
          }
        </button>

        {/* Sino de notificações */}
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen(o => !o)}
            className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Bell size={20} className="text-slate-500 dark:text-slate-400" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-xl z-50 overflow-hidden border"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Notificações {unread > 0 && <span className="text-blue-500">({unread})</span>}
                </span>
                {unread > 0 && onMarkAllRead && (
                  <button
                    onClick={() => { onMarkAllRead(); setOpen(false) }}
                    className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                  >
                    <CheckCheck size={12} /> Marcar todas
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Nenhuma notificação</p>
                ) : (
                  notifications.slice(0, 20).map(n => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b transition-colors ${!n.lida ? 'bg-blue-50/60 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <span className="text-lg flex-shrink-0 mt-0.5">
                        {tipoIcon[n.tipo || ''] || '🔔'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.lida ? 'font-medium' : ''}`} style={{ color: 'var(--text-primary)' }}>
                          {n.titulo}
                        </p>
                        {n.mensagem && (
                          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{n.mensagem}</p>
                        )}
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{formatDateTime(n.created_at)}</p>
                      </div>
                      {!n.lida && onMarkRead && (
                        <button
                          onClick={() => onMarkRead(n.id)}
                          className="flex-shrink-0 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500 transition-colors"
                          title="Marcar como lida"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      {n.lida && <div className="w-5 flex-shrink-0" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar do usuário — clicável → /perfil */}
        <Link href="/perfil" className="flex items-center gap-2 pl-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 transition-colors" title="Meu Perfil">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{getInitials(userName || 'U')}</span>
          </div>
          <span className="text-sm font-medium hidden sm:block" style={{ color: 'var(--text-secondary)' }}>
            {userName || 'Usuário'}
          </span>
        </Link>
      </div>
    </header>
  )
}
