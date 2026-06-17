'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Search, Users, Building2, CalendarCheck, Loader2, X } from 'lucide-react'

const supabase = createClient()

interface Result {
  id: string
  tipo: 'cliente' | 'imovel' | 'visita'
  titulo: string
  subtitulo: string
  href: string
}

const TIPO_ICON = {
  cliente: Users,
  imovel:  Building2,
  visita:  CalendarCheck,
}

const TIPO_LABEL = {
  cliente: 'Cliente',
  imovel:  'Imóvel',
  visita:  'Visita',
}

const TIPO_COLOR = {
  cliente: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
  imovel:  'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30',
  visita:  'text-amber-500 bg-amber-50 dark:bg-amber-900/30',
}

export default function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Atalho Ctrl+K / Cmd+K para abrir busca
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setLoading(false); return }
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setLoading(false); return }
    const uid = session.user.id
    const term = `%${q.trim()}%`

    const [{ data: clientes }, { data: imoveis }, { data: visitas }] = await Promise.all([
      supabase.from('clientes').select('id, nome, telefone, etapa_funil').eq('user_id', uid)
        .or(`nome.ilike.${term},telefone.ilike.${term},email.ilike.${term}`).limit(4),
      supabase.from('imoveis').select('id, titulo, bairro, valor, status').eq('user_id', uid)
        .or(`titulo.ilike.${term},bairro.ilike.${term},logradouro.ilike.${term}`).limit(4),
      supabase.from('visitas').select('id, data_hora, clientes(nome), imoveis(titulo)')
        .eq('user_id', uid)
        .limit(3),
    ])

    const found: Result[] = [
      ...(clientes || []).map((c: any) => ({
        id: c.id, tipo: 'cliente' as const,
        titulo: c.nome,
        subtitulo: c.telefone || c.etapa_funil || 'Cliente',
        href: `/clientes/${c.id}`,
      })),
      ...(imoveis || []).map((i: any) => ({
        id: i.id, tipo: 'imovel' as const,
        titulo: i.titulo,
        subtitulo: i.bairro ? `${i.bairro} • ${i.valor ? `R$ ${Number(i.valor).toLocaleString('pt-BR')}` : ''}` : '',
        href: `/imoveis/${i.id}`,
      })),
      ...(visitas || [])
        .filter((v: any) =>
          (v.clientes?.nome || '').toLowerCase().includes(q.toLowerCase()) ||
          (v.imoveis?.titulo || '').toLowerCase().includes(q.toLowerCase())
        )
        .map((v: any) => ({
          id: v.id, tipo: 'visita' as const,
          titulo: v.clientes?.nome || 'Visita',
          subtitulo: `${v.imoveis?.titulo || ''} • ${new Date(v.data_hora).toLocaleDateString('pt-BR')}`,
          href: `/visitas`,
        })),
    ]

    setResults(found)
    setHighlighted(-1)
    setLoading(false)
  }, [])

  // Debounce 300ms
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (query.trim().length < 2) { setResults([]); setLoading(false); return }
    setLoading(true)
    timerRef.current = setTimeout(() => search(query), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, search])

  const navigate = (href: string) => {
    router.push(href)
    setOpen(false)
    setQuery('')
    setResults([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)) }
    if (e.key === 'Enter' && highlighted >= 0) navigate(results[highlighted].href)
  }

  return (
    <div ref={containerRef} className="relative w-72">
      {/* Input */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar… (Ctrl+K)"
          className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600
                     bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100
                     placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                     transition-colors"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false) }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (query.length >= 2) && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-slate-200 dark:border-slate-700
                        bg-white dark:bg-slate-800 shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-400">
              <Loader2 size={16} className="animate-spin" /> Buscando...
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Nenhum resultado para "{query}"</p>
          ) : (
            <>
              {['cliente', 'imovel', 'visita'].map(tipo => {
                const grupo = results.filter(r => r.tipo === tipo)
                if (grupo.length === 0) return null
                const Icon = TIPO_ICON[tipo as keyof typeof TIPO_ICON]
                return (
                  <div key={tipo}>
                    <p className="px-4 py-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide bg-slate-50 dark:bg-slate-800/50">
                      {TIPO_LABEL[tipo as keyof typeof TIPO_LABEL]}s
                    </p>
                    {grupo.map((r, idx) => {
                      const globalIdx = results.indexOf(r)
                      const isHl = globalIdx === highlighted
                      return (
                        <button
                          key={r.id}
                          onClick={() => navigate(r.href)}
                          onMouseEnter={() => setHighlighted(globalIdx)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isHl ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${TIPO_COLOR[r.tipo]}`}>
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{r.titulo}</p>
                            {r.subtitulo && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{r.subtitulo}</p>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
