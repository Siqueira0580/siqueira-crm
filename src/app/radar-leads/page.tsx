'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase'
import { calcularMatch, getMatchLabel } from '@/lib/matching'
import { formatCurrency, formatDateTime, ETAPAS_FUNIL } from '@/lib/utils'
import type { Cliente, Imovel } from '@/types'
import {
  RadarIcon, Flame, Thermometer, Snowflake, Brain, Zap,
  Building2, TrendingUp, Users, Loader2, RefreshCw, Sparkles,
  ChevronRight, AlertTriangle
} from 'lucide-react'

const supabase = createClient()

interface LeadComScore {
  cliente: Cliente
  ultimoScore: number | null
  ultimaTemperatura: string | null
  totalAnalises: number
  melhorImovel: { imovel: Imovel; score: number } | null
}

function TemperaturaIcon({ temp }: { temp: string | null }) {
  if (temp === 'Quente') return <Flame size={16} className="text-orange-500" />
  if (temp === 'Morno') return <Thermometer size={16} className="text-amber-500" />
  return <Snowflake size={16} className="text-blue-400" />
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-slate-300'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${score >= 70 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-slate-400'}`}>
        {score}
      </span>
    </div>
  )
}

export default function RadarLeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<LeadComScore[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todos' | 'quente' | 'morno' | 'frio' | 'sem_analise'>('todos')
  const [ordenar, setOrdenar] = useState<'score' | 'etapa' | 'nome'>('score')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const [{ data: clientesData }, { data: imoveisData }, { data: analisesData }] = await Promise.all([
      supabase.from('clientes').select('*').eq('user_id', session.user.id),
      supabase.from('imoveis').select('*').eq('user_id', session.user.id).eq('status', 'disponivel'),
      supabase
        .from('analises_comportamento')
        .select('cliente_id, score, temperatura, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false }),
    ])

    const clientes = (clientesData || []) as Cliente[]
    const imoveis = (imoveisData || []) as Imovel[]
    const analises = (analisesData || []) as any[]

    const result: LeadComScore[] = clientes.map(cliente => {
      // Latest analysis for this client
      const clienteAnalises = analises.filter(a => a.cliente_id === cliente.id)
      const ultima = clienteAnalises[0]

      // Best matching property
      let melhorImovel: { imovel: Imovel; score: number } | null = null
      if (imoveis.length > 0) {
        const matches = imoveis
          .map(imovel => ({ imovel, score: calcularMatch(cliente, imovel).score }))
          .sort((a, b) => b.score - a.score)
        if (matches[0] && matches[0].score > 0) melhorImovel = matches[0]
      }

      return {
        cliente,
        ultimoScore: ultima?.score ?? null,
        ultimaTemperatura: ultima?.temperatura ?? null,
        totalAnalises: clienteAnalises.length,
        melhorImovel,
      }
    })

    setLeads(result)
    setLoading(false)
  }

  const leadsFiltrados = leads
    .filter(l => {
      if (filtro === 'todos') return true
      if (filtro === 'sem_analise') return l.ultimoScore == null
      if (filtro === 'quente') return l.ultimaTemperatura === 'Quente'
      if (filtro === 'morno') return l.ultimaTemperatura === 'Morno'
      if (filtro === 'frio') return l.ultimaTemperatura === 'Frio'
      return true
    })
    .sort((a, b) => {
      if (ordenar === 'score') {
        const sa = a.ultimoScore ?? -1
        const sb = b.ultimoScore ?? -1
        return sb - sa
      }
      if (ordenar === 'nome') return a.cliente.nome.localeCompare(b.cliente.nome)
      // etapa
      const etapas = ['negociacao', 'proposta_enviada', 'visita_agendada', 'contato_iniciado', 'lead_novo', 'fechado', 'perdido']
      return etapas.indexOf(a.cliente.etapa_funil) - etapas.indexOf(b.cliente.etapa_funil)
    })

  const totalQuente = leads.filter(l => l.ultimaTemperatura === 'Quente').length
  const totalMorno = leads.filter(l => l.ultimaTemperatura === 'Morno').length
  const totalSemAnalise = leads.filter(l => l.ultimoScore == null).length

  return (
    <AppLayout title="Radar de Leads">
      <div className="max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow">
              <RadarIcon size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Radar de Leads</h1>
              <p className="text-sm text-slate-500">Todos os leads com score IA, temperatura e melhor imóvel recomendado</p>
            </div>
          </div>
          <button onClick={loadData} className="btn-secondary">
            <RefreshCw size={15} /> Atualizar
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total de Leads', value: leads.length, icon: <Users size={18} className="text-slate-500" />, color: 'bg-slate-50 border-slate-200' },
            { label: 'Quentes 🔥', value: totalQuente, icon: <Flame size={18} className="text-orange-500" />, color: 'bg-orange-50 border-orange-200' },
            { label: 'Mornos 🌡️', value: totalMorno, icon: <Thermometer size={18} className="text-amber-500" />, color: 'bg-amber-50 border-amber-200' },
            { label: 'Sem análise', value: totalSemAnalise, icon: <AlertTriangle size={18} className="text-slate-400" />, color: 'bg-slate-50 border-slate-200' },
          ].map(stat => (
            <div key={stat.label} className={`card border ${stat.color} !p-4`}>
              <div className="flex items-center justify-between mb-1">
                {stat.icon}
                <span className="text-2xl font-bold text-slate-800">{stat.value}</span>
              </div>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filtros + Ordenação */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl flex-wrap">
            {[
              { key: 'todos', label: 'Todos' },
              { key: 'quente', label: '🔥 Quentes' },
              { key: 'morno', label: '🌡️ Mornos' },
              { key: 'frio', label: '❄️ Frios' },
              { key: 'sem_analise', label: 'Sem análise' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key as any)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filtro === f.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            Ordenar por:
            <select
              value={ordenar}
              onChange={e => setOrdenar(e.target.value as any)}
              className="input !py-1.5 !px-3 text-sm w-auto"
            >
              <option value="score">Score IA</option>
              <option value="etapa">Etapa do Funil</option>
              <option value="nome">Nome</option>
            </select>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-16 text-slate-400 flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin" />
            <p>Carregando leads...</p>
          </div>
        ) : leadsFiltrados.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>Nenhum lead encontrado para este filtro.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leadsFiltrados.map(({ cliente, ultimoScore, ultimaTemperatura, totalAnalises, melhorImovel }, idx) => {
              const etapa = ETAPAS_FUNIL[cliente.etapa_funil]
              const match = melhorImovel ? getMatchLabel(melhorImovel.score) : null

              return (
                <div key={cliente.id}
                  className="card hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => router.push(`/clientes/${cliente.id}`)}
                >
                  <div className="flex items-center gap-4">

                    {/* Rank */}
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                      {idx + 1}
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {cliente.nome.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800">{cliente.nome}</p>
                        <span className={`badge text-xs text-white ${etapa?.color}`}>{etapa?.label}</span>
                        {ultimaTemperatura && (
                          <span className={`badge text-xs font-medium ${
                            ultimaTemperatura === 'Quente' ? 'bg-orange-100 text-orange-700'
                            : ultimaTemperatura === 'Morno' ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                          }`}>
                            <TemperaturaIcon temp={ultimaTemperatura} />
                            {ultimaTemperatura}
                          </span>
                        )}
                      </div>

                      {/* Score bar */}
                      <div className="mt-2 max-w-xs">
                        {ultimoScore != null
                          ? <ScoreBar score={ultimoScore} />
                          : <p className="text-xs text-slate-400 italic">Sem análise IA</p>}
                      </div>
                    </div>

                    {/* Best property */}
                    {melhorImovel && (
                      <div className="hidden sm:flex flex-col items-end min-w-0 max-w-[200px]">
                        <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                          <Zap size={11} className="text-amber-500" /> Melhor match
                        </p>
                        <p className="text-sm font-medium text-slate-700 truncate max-w-full">
                          {melhorImovel.imovel.titulo}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-blue-600 font-semibold">{formatCurrency(melhorImovel.imovel.valor)}</span>
                          <span className={`badge text-xs font-semibold ${match?.color}`}>{melhorImovel.score}%</span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {totalAnalises === 0 ? (
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/analise-comportamento?cliente_id=${cliente.id}&cliente_nome=${encodeURIComponent(cliente.nome)}`) }}
                          className="btn-primary text-xs !py-1.5"
                        >
                          <Sparkles size={13} /> Analisar
                        </button>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/analise-comportamento?cliente_id=${cliente.id}&cliente_nome=${encodeURIComponent(cliente.nome)}`) }}
                          className="btn-secondary text-xs !py-1.5"
                        >
                          <Brain size={13} />
                          {totalAnalises} análise{totalAnalises > 1 ? 's' : ''}
                        </button>
                      )}
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </div>
                  </div>

                  {/* Mobile: best property */}
                  {melhorImovel && (
                    <div className="sm:hidden mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-slate-500 text-xs">
                        <Building2 size={12} /> {melhorImovel.imovel.titulo}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-blue-600 font-semibold">{formatCurrency(melhorImovel.imovel.valor)}</span>
                        <span className={`badge text-xs ${match?.color}`}>{melhorImovel.score}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
