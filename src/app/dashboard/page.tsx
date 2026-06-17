'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { formatCurrency, ETAPAS_FUNIL } from '@/lib/utils'
import {
  Users, Building2, CalendarCheck, TrendingUp, UserCheck,
  ArrowUpRight, Link2, Copy, Check, UserPlus, PlusCircle,
  LayoutList, Flame, Thermometer, Snowflake
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, CartesianGrid,
} from 'recharts'
import type { EtapaFunil } from '@/types'

const supabase = createClient()

const TEMP_COLORS: Record<string, string> = {
  Quente: '#ef4444',
  Morno:  '#f59e0b',
  Frio:   '#64748b',
}

const ETAPA_ORDER: EtapaFunil[] = [
  'lead_novo','contato_iniciado','visita_agendada',
  'proposta_enviada','negociacao','fechado','perdido',
]

interface Stats {
  totalLeads: number
  clientesAtivos: number
  imoveisDisponiveis: number
  visitasAgendadas: number
  leadsPorEtapa: { etapa: string; label: string; count: number; color: string }[]
  temperaturaData: { name: string; value: number; color: string }[]
  origemData:  { name: string; value: number; color: string }[]
  evolucaoData: { label: string; novos: number; fechamentos: number }[]
  conversaoPorEtapa: { label: string; pct: number; count: number }[]
  imoveisPorStatus: { status: string; label: string; count: number; color: string }[]
  imoveisVisitados: { id: string; titulo: string; count: number; valor?: number; status?: string }[]
  recentClientes: any[]
  recentVisitas: any[]
}

const EMPTY: Stats = {
  totalLeads: 0, clientesAtivos: 0, imoveisDisponiveis: 0, visitasAgendadas: 0,
  leadsPorEtapa: [], temperaturaData: [], origemData: [],
  evolucaoData: [], conversaoPorEtapa: [],
  imoveisPorStatus: [], imoveisVisitados: [],
  recentClientes: [], recentVisitas: [],
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const uid = session.user.id
    setUserId(uid)

    const now = new Date()
    const d14 = new Date(now); d14.setDate(d14.getDate() - 14)
    const d14iso = d14.toISOString()

    const [
      { count: totalLeads },
      { count: clientesAtivos },
      { count: imoveisDisponiveis },
      { count: visitasAgendadas },
      { data: allClientes },
      { data: recentVisitas },
      { data: allImoveis },
      { data: visitasCounts },
      { data: recentCl },
    ] = await Promise.all([
      supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('user_id', uid).not('etapa_funil','in','(fechado,perdido)'),
      supabase.from('imoveis').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('status','disponivel'),
      supabase.from('visitas').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('status','agendado'),
      supabase.from('clientes').select('etapa_funil,score_potencial,origem,created_at').eq('user_id', uid),
      supabase.from('visitas').select('*, clientes(nome), imoveis(titulo)').eq('user_id', uid).eq('status','agendado').order('data_hora').limit(5),
      supabase.from('imoveis').select('id,titulo,valor,status').eq('user_id', uid),
      supabase.from('visitas').select('imovel_id').eq('user_id', uid),
      supabase.from('clientes').select('id,nome,etapa_funil,score_potencial,origem,created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(5),
    ])

    const clientes = (allClientes as any[]) || []

    // ── Funil ──
    const COLORS = ['#64748b','#3b82f6','#6366f1','#f59e0b','#f97316','#16a34a','#ef4444']
    const etapaCount: Record<string, number> = {}
    clientes.forEach(c => { etapaCount[c.etapa_funil] = (etapaCount[c.etapa_funil]||0)+1 })
    const leadsPorEtapa = ETAPA_ORDER.map((k,i) => ({
      etapa: k, label: ETAPAS_FUNIL[k].label, count: etapaCount[k]||0, color: COLORS[i]
    }))

    // ── Temperatura ──
    const tempCount: Record<string, number> = { Quente:0, Morno:0, Frio:0 }
    clientes.forEach(c => {
      if (c.etapa_funil === 'fechado' || c.etapa_funil === 'perdido') return
      const sc = c.score_potencial ?? 0
      const t = sc >= 70 ? 'Quente' : sc >= 40 ? 'Morno' : 'Frio'
      tempCount[t]++
    })
    const temperaturaData = Object.entries(tempCount)
      .filter(([,v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: TEMP_COLORS[name] }))

    // ── Origem ──
    const origemCount: Record<string, number> = {}
    clientes.forEach(c => {
      const o = c.origem || 'Direto'
      origemCount[o] = (origemCount[o]||0)+1
    })
    const ORIGEM_COLORS = ['#3b82f6','#6366f1','#f59e0b','#16a34a','#ef4444','#64748b']
    const origemData = Object.entries(origemCount).map(([name, value], i) => ({
      name, value, color: ORIGEM_COLORS[i % ORIGEM_COLORS.length]
    }))

    // ── Evolução 14 dias ──
    const dayMap: Record<string, { novos: number; fechamentos: number }> = {}
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })
      dayMap[key] = { novos: 0, fechamentos: 0 }
    }
    clientes.forEach(c => {
      const dt = new Date(c.created_at)
      if (dt >= d14) {
        const key = dt.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })
        if (dayMap[key]) dayMap[key].novos++
      }
      if (c.etapa_funil === 'fechado') {
        const dt2 = new Date(c.created_at)
        if (dt2 >= d14) {
          const key = dt2.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })
          if (dayMap[key]) dayMap[key].fechamentos++
        }
      }
    })
    const evolucaoData = Object.entries(dayMap).map(([label, v]) => ({ label, ...v }))

    // ── Conversão acumulada ──
    const total = clientes.length || 1
    const conversaoPorEtapa = ETAPA_ORDER.filter(k => k !== 'perdido').map(k => {
      const idx = ETAPA_ORDER.indexOf(k)
      // Quantos chegaram nessa etapa ou além (excluindo perdido)
      const reached = clientes.filter(c => {
        if (c.etapa_funil === 'perdido') return false
        return ETAPA_ORDER.indexOf(c.etapa_funil) >= idx
      }).length
      return { label: ETAPAS_FUNIL[k].label.replace(' ✓',''), pct: Math.round((reached/total)*100), count: reached }
    })

    // ── Imóveis por status ──
    const imoveis = (allImoveis as any[]) || []
    const statusCount: Record<string, number> = {}
    imoveis.forEach(i => { statusCount[i.status] = (statusCount[i.status]||0)+1 })
    const STATUS_MAP: Record<string, { label: string; color: string }> = {
      disponivel: { label: 'Disponível', color: '#16a34a' },
      reservado:  { label: 'Reservado',  color: '#f59e0b' },
      vendido:    { label: 'Vendido',    color: '#64748b' },
    }
    const imoveisPorStatus = Object.entries(statusCount).map(([status, count]) => ({
      status, count,
      label: STATUS_MAP[status]?.label || status,
      color: STATUS_MAP[status]?.color || '#3b82f6',
    }))

    // ── Imóveis mais visitados ──
    const visitas = (visitasCounts as any[]) || []
    const visitCount: Record<string, number> = {}
    visitas.forEach(v => {
      if (v.imovel_id) visitCount[v.imovel_id] = (visitCount[v.imovel_id]||0)+1
    })
    const imoveisVisitados = Object.entries(visitCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => {
        const im = imoveis.find(i => i.id === id)
        return { id, count, titulo: im?.titulo || 'Imóvel', valor: im?.valor, status: im?.status }
      })

    setStats({
      totalLeads: totalLeads||0,
      clientesAtivos: clientesAtivos||0,
      imoveisDisponiveis: imoveisDisponiveis||0,
      visitasAgendadas: visitasAgendadas||0,
      leadsPorEtapa,
      temperaturaData,
      origemData,
      evolucaoData,
      conversaoPorEtapa,
      imoveisPorStatus,
      imoveisVisitados,
      recentClientes: (recentCl as any[])||[],
      recentVisitas: (recentVisitas as any[])||[],
    })
    setLoading(false)
  }

  const statCards = [
    { label: 'Total de Leads',       value: stats.totalLeads,          icon: Users,         color: 'bg-blue-500' },
    { label: 'Clientes Ativos',      value: stats.clientesAtivos,      icon: UserCheck,     color: 'bg-indigo-500' },
    { label: 'Imóveis Disponíveis',  value: stats.imoveisDisponiveis,  icon: Building2,     color: 'bg-emerald-500' },
    { label: 'Visitas Agendadas',    value: stats.visitasAgendadas,    icon: CalendarCheck, color: 'bg-amber-500' },
  ]

  const CustomTooltipPie = ({ active, payload }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow text-sm">
          <p className="font-semibold text-slate-700">{payload[0].name}</p>
          <p className="text-slate-500">{payload[0].value} lead{payload[0].value !== 1 ? 's' : ''}</p>
        </div>
      )
    }
    return null
  }

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-5">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card flex items-center gap-4">
              <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon size={22} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">
                  {loading ? '—' : value}
                </p>
                <p className="text-sm text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Funil + Temperatura ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="card xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 dark:text-white">Funil de Vendas</h2>
              <TrendingUp size={17} className="text-slate-400" />
            </div>
            {loading
              ? <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Carregando...</div>
              : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.leadsPorEtapa} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip formatter={(v) => [v, 'Clientes']} contentStyle={{ fontSize:12, borderRadius:8 }} />
                    <Bar dataKey="count" radius={[6,6,0,0]}>
                      {stats.leadsPorEtapa.map((e,i) => <Cell key={i} fill={e.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )
            }
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 dark:text-white">Temperatura dos leads ativos</h2>
              <Flame size={17} className="text-orange-400" />
            </div>
            {loading
              ? <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Carregando...</div>
              : stats.temperaturaData.length === 0
                ? <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Sem leads ativos</div>
                : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={stats.temperaturaData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%" cy="50%"
                        outerRadius={80}
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {stats.temperaturaData.map((e,i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltipPie />} />
                      <Legend
                        formatter={(val) => <span className="text-xs text-slate-600">{val}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )
            }
          </div>
        </div>

        {/* ── Evolução 14 dias ── */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 dark:text-white">Evolução — últimos 14 dias</h2>
          </div>
          {loading
            ? <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Carregando...</div>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats.evolucaoData} margin={{ top:0, right:10, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={1} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize:12, borderRadius:8 }} />
                  <Legend formatter={(val) => <span className="text-xs text-slate-600 capitalize">{val === 'novos' ? 'Novos leads' : 'Fechamentos'}</span>} />
                  <Line type="monotone" dataKey="novos" stroke="#3b82f6" strokeWidth={2} dot={{ r:3 }} name="novos" />
                  <Line type="monotone" dataKey="fechamentos" stroke="#16a34a" strokeWidth={2} dot={{ r:3 }} name="fechamentos" />
                </LineChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* ── Conversão acumulada + Origem ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="card xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 dark:text-white">Conversão acumulada por etapa</h2>
            </div>
            {loading
              ? <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Carregando...</div>
              : (
                <div className="space-y-3">
                  {stats.conversaoPorEtapa.map(({ label, pct, count }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-32 text-right flex-shrink-0 truncate">{label}</span>
                      <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-5 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                          style={{ width: `${pct}%` }}
                        >
                          {pct > 10 && <span className="text-white text-[10px] font-semibold">{pct}%</span>}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 dark:text-white">Origem dos leads</h2>
            </div>
            {loading
              ? <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Carregando...</div>
              : stats.origemData.length === 0
                ? <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
                : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={stats.origemData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%" cy="50%"
                        outerRadius={70}
                        label={({ value }) => value}
                      >
                        {stats.origemData.map((e,i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltipPie />} />
                      <Legend formatter={(val) => <span className="text-xs text-slate-600">{val}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )
            }
          </div>
        </div>

        {/* ── Imóveis mais visitados + Imóveis por status + Atalhos ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          <div className="card xl:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 dark:text-white">Imóveis mais visitados</h2>
              <CalendarCheck size={17} className="text-slate-400" />
            </div>
            {loading
              ? <div className="text-slate-400 text-sm py-8 text-center">Carregando...</div>
              : stats.imoveisVisitados.length === 0
                ? <div className="text-slate-400 text-sm py-8 text-center">Nenhuma visita registrada</div>
                : (
                  <div className="space-y-3">
                    {stats.imoveisVisitados.map(im => (
                      <Link key={im.id} href={`/imoveis/${im.id}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors group"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-white truncate group-hover:text-blue-600">{im.titulo}</p>
                          {im.valor && <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(im.valor)}{im.status ? ` • ${im.status}` : ''}</p>}
                        </div>
                        <span className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center text-sm font-bold ml-2">
                          {im.count}
                        </span>
                      </Link>
                    ))}
                  </div>
                )
            }
          </div>

          <div className="card xl:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 dark:text-white">Imóveis por status</h2>
              <Building2 size={17} className="text-slate-400" />
            </div>
            {loading
              ? <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Carregando...</div>
              : stats.imoveisPorStatus.length === 0
                ? <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Sem imóveis cadastrados</div>
                : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stats.imoveisPorStatus} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(v) => [v, 'Imóveis']} contentStyle={{ fontSize:12, borderRadius:8 }} />
                      <Bar dataKey="count" radius={[6,6,0,0]}>
                        {stats.imoveisPorStatus.map((e,i) => <Cell key={i} fill={e.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )
            }
          </div>

          <div className="card xl:col-span-1">
            <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Atalhos</h2>
            <div className="space-y-3">
              {[
                { href: '/clientes/novo', icon: <UserPlus size={18} className="text-blue-600" />, title: 'Cadastrar novo cliente', sub: 'Comece a montar seu funil' },
                { href: '/imoveis/novo',  icon: <PlusCircle size={18} className="text-emerald-600" />, title: 'Adicionar imóvel', sub: 'Aumente seu catálogo' },
                { href: '/pipeline',      icon: <LayoutList size={18} className="text-indigo-600" />, title: 'Ver pipeline', sub: 'Avance leads no funil' },
                { href: '/relatorios',    icon: <TrendingUp size={18} className="text-amber-600" />, title: 'Relatórios', sub: 'Analise seu desempenho' },
              ].map(a => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                >
                  <div className="w-9 h-9 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    {a.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{a.title}</p>
                    <p className="text-xs text-slate-400">{a.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Link de captação ── */}
        {userId && (
          <div className="card bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border-indigo-100 dark:border-indigo-900">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Link2 size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-white text-sm">Seu link de captação de leads</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {typeof window !== 'undefined' ? `${window.location.origin}/captacao/${userId}` : `/captacao/${userId}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  const link = `${window.location.origin}/captacao/${userId}`
                  navigator.clipboard.writeText(link).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000) })
                }}
                className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all flex-shrink-0 ${copiado ? 'bg-green-100 text-green-700' : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'}`}
              >
                {copiado ? <><Check size={13} /> Copiado!</> : <><Copy size={13} /> Copiar link</>}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Compartilhe este link em redes sociais ou WhatsApp. Leads que preencherem o formulário entram automaticamente no seu CRM.
            </p>
          </div>
        )}

        {/* ── Leads Recentes ── */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 dark:text-white">Leads Recentes</h2>
            <Link href="/clientes" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              Ver todos <ArrowUpRight size={14} />
            </Link>
          </div>
          {stats.recentClientes.length === 0
            ? <div className="text-center py-8 text-slate-400 text-sm">Nenhum cliente cadastrado ainda</div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Objetivo</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Orçamento</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Etapa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentClientes.map((c: any) => (
                      <tr key={c.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-3 font-medium text-slate-800 dark:text-white">{c.nome}</td>
                        <td className="py-3 px-3 text-slate-500 hidden md:table-cell capitalize">{c.objetivo||'—'}</td>
                        <td className="py-3 px-3 text-slate-500 hidden lg:table-cell">
                          {c.orcamento_max ? formatCurrency(c.orcamento_max) : '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`badge text-white text-xs ${ETAPAS_FUNIL[c.etapa_funil as EtapaFunil]?.color||'bg-slate-500'}`}>
                            {ETAPAS_FUNIL[c.etapa_funil as EtapaFunil]?.label||c.etapa_funil}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      </div>
    </AppLayout>
  )
}
