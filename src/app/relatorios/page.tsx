'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase'
import { formatCurrency, ETAPAS_FUNIL } from '@/lib/utils'
import type { Cliente, Imovel, Visita } from '@/types'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Users, Home, CalendarCheck, TrendingUp,
  Download, FileText, Loader2
} from 'lucide-react'

const supabase = createClient()

type Periodo = '30' | '90' | 'todos'

const FUNIL_CORES: Record<string, string> = {
  lead_novo: '#94a3b8',
  contato_iniciado: '#60a5fa',
  visita_agendada: '#a78bfa',
  proposta_enviada: '#f59e0b',
  negociacao: '#fb923c',
  fechado: '#22c55e',
  perdido: '#ef4444',
}

const IMOVEL_CORES: Record<string, string> = {
  disponivel: '#22c55e',
  reservado: '#f59e0b',
  vendido: '#3b82f6',
}

export default function RelatoriosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<Periodo>('30')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const [{ data: c }, { data: i }, { data: v }] = await Promise.all([
      supabase.from('clientes').select('*').eq('user_id', session.user.id),
      supabase.from('imoveis').select('*').eq('user_id', session.user.id),
      supabase.from('visitas').select('*').eq('user_id', session.user.id),
    ])

    setClientes((c || []) as any)
    setImoveis((i || []) as any)
    setVisitas((v || []) as any)
    setLoading(false)
  }

  const filtrarPorPeriodo = <T extends { created_at: string }>(items: T[]): T[] => {
    if (periodo === 'todos') return items
    const dias = parseInt(periodo)
    const corte = new Date()
    corte.setDate(corte.getDate() - dias)
    return items.filter(i => new Date(i.created_at) >= corte)
  }

  const clientesFiltrados = filtrarPorPeriodo(clientes)
  const visitasFiltradas = filtrarPorPeriodo(visitas)

  const totalClientes = clientesFiltrados.length
  const ativos = clientesFiltrados.filter(c => !['fechado', 'perdido'].includes(c.etapa_funil)).length
  const fechados = clientesFiltrados.filter(c => c.etapa_funil === 'fechado').length
  const perdidos = clientesFiltrados.filter(c => c.etapa_funil === 'perdido').length
  const taxaConversao = totalClientes > 0 ? Math.round((fechados / totalClientes) * 100) : 0
  const imoveisDisponiveis = imoveis.filter(i => i.status === 'disponivel').length
  const visitasTotal = visitasFiltradas.length
  const visitasRealizadas = visitasFiltradas.filter(v => v.status === 'realizado').length

  const dadosFunil = Object.entries(ETAPAS_FUNIL).map(([key, val]) => ({
    name: val.label,
    quantidade: clientesFiltrados.filter(c => c.etapa_funil === key).length,
    fill: FUNIL_CORES[key] || '#94a3b8',
  })).filter(d => d.quantidade > 0)

  const dadosImoveis = [
    { name: 'Disponível', value: imoveis.filter(i => i.status === 'disponivel').length, fill: IMOVEL_CORES.disponivel },
    { name: 'Reservado', value: imoveis.filter(i => i.status === 'reservado').length, fill: IMOVEL_CORES.reservado },
    { name: 'Vendido', value: imoveis.filter(i => i.status === 'vendido').length, fill: IMOVEL_CORES.vendido },
  ].filter(d => d.value > 0)

  const exportarCSV = () => {
    const linhas = [
      ['Nome', 'Email', 'Telefone', 'Etapa', 'Objetivo', 'Orçamento Máx', 'Score', 'Cadastrado em'],
      ...clientesFiltrados.map(c => [
        c.nome,
        c.email || '',
        c.telefone || '',
        ETAPAS_FUNIL[c.etapa_funil]?.label || c.etapa_funil,
        c.objetivo || '',
        c.orcamento_max ? String(c.orcamento_max) : '',
        c.score_potencial !== undefined ? String(c.score_potencial) + '%' : '',
        new Date(c.created_at).toLocaleDateString('pt-BR'),
      ])
    ]
    const csv = '﻿' + linhas.map(l => l.map(v => `"${v.replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-clientes-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportarPDF = () => {
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório Siqueira Inteligência Imobiliária</title>
<style>
  body { font-family: Arial, sans-serif; margin: 32px; color: #1e293b; }
  h1 { color: #1d4ed8; margin-bottom: 4px; }
  .sub { color: #64748b; margin-bottom: 24px; font-size: 14px; }
  .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 28px; }
  .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
  .stat-num { font-size: 28px; font-weight: bold; color: #1d4ed8; }
  .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #1d4ed8; color: white; text-align: left; padding: 8px 12px; }
  td { padding: 7px 12px; border-bottom: 1px solid #f1f5f9; }
  tr:nth-child(even) td { background: #f8fafc; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; background: #dbeafe; color: #1d4ed8; }
</style>
</head>
<body>
<h1>Siqueira Inteligência Imobiliária</h1>
<p class="sub">Relatório de CRM — ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })} • Período: ${periodo === 'todos' ? 'Todos os registros' : `Últimos ${periodo} dias`}</p>
<div class="stats">
  <div class="stat"><div class="stat-num">${totalClientes}</div><div class="stat-label">Total Clientes</div></div>
  <div class="stat"><div class="stat-num">${ativos}</div><div class="stat-label">Clientes Ativos</div></div>
  <div class="stat"><div class="stat-num">${fechados}</div><div class="stat-label">Fechamentos</div></div>
  <div class="stat"><div class="stat-num">${taxaConversao}%</div><div class="stat-label">Taxa de Conversão</div></div>
  <div class="stat"><div class="stat-num">${imoveisDisponiveis}</div><div class="stat-label">Imóveis Disponíveis</div></div>
  <div class="stat"><div class="stat-num">${visitasTotal}</div><div class="stat-label">Total de Visitas</div></div>
  <div class="stat"><div class="stat-num">${visitasRealizadas}</div><div class="stat-label">Visitas Realizadas</div></div>
  <div class="stat"><div class="stat-num">${visitasTotal > 0 ? Math.round((visitasRealizadas/visitasTotal)*100) : 0}%</div><div class="stat-label">Taxa de Realização</div></div>
</div>
<h2 style="margin-bottom:12px; color:#1e293b; font-size:16px;">Clientes</h2>
<table>
  <thead><tr>
    <th>Nome</th><th>Telefone</th><th>Etapa</th><th>Objetivo</th><th>Orçamento Máx</th><th>Score</th>
  </tr></thead>
  <tbody>
    ${clientesFiltrados.map(c => `<tr>
      <td>${c.nome}</td>
      <td>${c.telefone || '—'}</td>
      <td><span class="badge">${ETAPAS_FUNIL[c.etapa_funil]?.label || c.etapa_funil}</span></td>
      <td>${c.objetivo || '—'}</td>
      <td>${c.orcamento_max ? formatCurrency(c.orcamento_max) : '—'}</td>
      <td>${c.score_potencial !== undefined ? c.score_potencial + '%' : '—'}</td>
    </tr>`).join('')}
  </tbody>
</table>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 600)
  }

  const StatCard = ({ label, value, icon: Icon, color = 'blue' }: { label: string; value: string | number; icon: any; color?: string }) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      amber: 'bg-amber-50 text-amber-600',
      red: 'bg-red-50 text-red-600',
      purple: 'bg-purple-50 text-purple-600',
      slate: 'bg-slate-100 text-slate-600',
    }
    return (
      <div className="card flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
          <Icon size={22} />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{label}</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout title="Relatórios">
      <div className="space-y-6 max-w-7xl">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex gap-2">
            {(['30', '90', 'todos'] as Periodo[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${periodo === p ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {p === 'todos' ? 'Todos os tempos' : `Últimos ${p} dias`}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={exportarCSV} className="btn-secondary text-sm">
              <Download size={15} /> Exportar CSV
            </button>
            <button onClick={exportarPDF} className="btn-primary text-sm">
              <FileText size={15} /> Exportar PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 gap-2 text-slate-400">
            <Loader2 size={20} className="animate-spin" /> Carregando dados...
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total de clientes" value={totalClientes} icon={Users} color="blue" />
              <StatCard label="Clientes ativos" value={ativos} icon={TrendingUp} color="green" />
              <StatCard label="Fechamentos" value={fechados} icon={TrendingUp} color="purple" />
              <StatCard label="Taxa de conversão" value={`${taxaConversao}%`} icon={TrendingUp} color="amber" />
              <StatCard label="Imóveis disponíveis" value={imoveisDisponiveis} icon={Home} color="slate" />
              <StatCard label="Total de visitas" value={visitasTotal} icon={CalendarCheck} color="blue" />
              <StatCard label="Visitas realizadas" value={visitasRealizadas} icon={CalendarCheck} color="green" />
              <StatCard
                label="Taxa de realização"
                value={`${visitasTotal > 0 ? Math.round((visitasRealizadas / visitasTotal) * 100) : 0}%`}
                icon={CalendarCheck}
                color="amber"
              />
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Funil */}
              <div className="card">
                <h3 className="font-semibold text-slate-700 mb-4">Funil de Vendas</h3>
                {dadosFunil.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">Sem dados no período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={dadosFunil} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
                      <Tooltip />
                      <Bar dataKey="quantidade" radius={[0, 6, 6, 0]}>
                        {dadosFunil.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Imóveis por status */}
              <div className="card">
                <h3 className="font-semibold text-slate-700 mb-4">Imóveis por Status</h3>
                {dadosImoveis.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">Nenhum imóvel cadastrado</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={dadosImoveis}
                        cx="50%"
                        cy="50%"
                        outerRadius={95}
                        dataKey="value"
                        label={({ name, value }) => `${name} (${value})`}
                        labelLine
                      >
                        {dadosImoveis.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Tabela de clientes */}
            <div className="card overflow-hidden p-0">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-700">Clientes ({clientesFiltrados.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-5 py-3 text-slate-500 font-medium">Nome</th>
                      <th className="text-left px-5 py-3 text-slate-500 font-medium">Telefone</th>
                      <th className="text-left px-5 py-3 text-slate-500 font-medium">Etapa</th>
                      <th className="text-left px-5 py-3 text-slate-500 font-medium">Objetivo</th>
                      <th className="text-left px-5 py-3 text-slate-500 font-medium">Orçamento Máx</th>
                      <th className="text-left px-5 py-3 text-slate-500 font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center text-slate-400 py-10">
                          Nenhum cliente no período selecionado.
                        </td>
                      </tr>
                    ) : clientesFiltrados.map(c => {
                      const etapa = ETAPAS_FUNIL[c.etapa_funil]
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                          <td className="px-5 py-3">
                            <a href={`/clientes/${c.id}`} className="font-medium text-slate-800 hover:text-blue-600 hover:underline">
                              {c.nome}
                            </a>
                          </td>
                          <td className="px-5 py-3 text-slate-500">{c.telefone || '—'}</td>
                          <td className="px-5 py-3">
                            <span className={`badge text-xs text-white ${etapa?.color}`}>{etapa?.label}</span>
                          </td>
                          <td className="px-5 py-3 text-slate-500 capitalize">{c.objetivo || '—'}</td>
                          <td className="px-5 py-3 text-slate-700">
                            {c.orcamento_max ? formatCurrency(c.orcamento_max) : '—'}
                          </td>
                          <td className="px-5 py-3">
                            {c.score_potencial !== undefined ? (
                              <span className="text-green-700 font-medium">{c.score_potencial}%</span>
                            ) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
