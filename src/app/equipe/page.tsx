'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts'
import {
  Users, Trophy, TrendingUp, CalendarCheck,
  AlertCircle, Crown, Target
} from 'lucide-react'

const supabase = createClient()

interface CorretorStats {
  user_id: string
  nome: string
  email: string
  role: string
  created_at: string
  total_clientes: number
  clientes_ativos: number
  fechamentos: number
  perdidos: number
  total_visitas: number
  visitas_realizadas: number
  taxa_conversao: number
}

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4']

export default function EquipePage() {
  const [stats, setStats] = useState<CorretorStats[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    const { data, error } = await supabase.rpc('get_equipe_stats')
    if (error) {
      setErro(
        error.message.includes('Acesso negado')
          ? 'Acesso restrito. Somente administradores podem visualizar a equipe.'
          : 'Erro ao carregar dados. Verifique se o SQL do módulo Equipe foi aplicado no Supabase.'
      )
    } else {
      setStats(((data as any[]) || []).map((d: any) => ({
        ...d,
        total_clientes: Number(d.total_clientes),
        clientes_ativos: Number(d.clientes_ativos),
        fechamentos: Number(d.fechamentos),
        perdidos: Number(d.perdidos),
        total_visitas: Number(d.total_visitas),
        visitas_realizadas: Number(d.visitas_realizadas),
        taxa_conversao: Number(d.taxa_conversao),
      })))
    }
    setLoading(false)
  }

  const melhorFechamento = stats.reduce<CorretorStats | null>(
    (best, c) => (!best || c.fechamentos > best.fechamentos) ? c : best, null
  )

  const dadosGrafico = stats.map(c => ({
    name: c.nome?.split(' ')[0] || c.email?.split('@')[0] || '?',
    'Clientes': c.total_clientes,
    'Fechamentos': c.fechamentos,
    'Visitas': c.total_visitas,
  }))

  return (
    <AppLayout title="Equipe">
      <div className="space-y-6 max-w-7xl">

        {loading ? (
          <div className="text-center py-24 text-slate-400">Carregando equipe...</div>
        ) : erro ? (
          <div className="card flex items-start gap-3 border-red-200 bg-red-50">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700">{erro}</p>
              <p className="text-sm text-red-600 mt-1">
                Para habilitar, aplique o arquivo <code className="bg-red-100 px-1 rounded">supabase/admin-equipe.sql</code> no SQL Editor do Supabase,
                e depois execute <code className="bg-red-100 px-1 rounded">UPDATE profiles SET role = 'admin' WHERE email = 'seu@email.com';</code>
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Destaque top corretor */}
            {melhorFechamento && melhorFechamento.fechamentos > 0 && (
              <div className="card bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-amber-400 rounded-2xl flex items-center justify-center">
                    <Crown size={26} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Top Corretor do Período</p>
                    <p className="text-xl font-bold text-slate-800">{melhorFechamento.nome}</p>
                    <p className="text-sm text-slate-600">{melhorFechamento.fechamentos} fechamentos · Taxa {melhorFechamento.taxa_conversao}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* Totais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card text-center">
                <Users size={22} className="text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-800">{stats.length}</p>
                <p className="text-xs text-slate-500">Corretores</p>
              </div>
              <div className="card text-center">
                <TrendingUp size={22} className="text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-800">
                  {stats.reduce((s, c) => s + c.total_clientes, 0)}
                </p>
                <p className="text-xs text-slate-500">Total Clientes</p>
              </div>
              <div className="card text-center">
                <Trophy size={22} className="text-amber-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-800">
                  {stats.reduce((s, c) => s + c.fechamentos, 0)}
                </p>
                <p className="text-xs text-slate-500">Fechamentos</p>
              </div>
              <div className="card text-center">
                <CalendarCheck size={22} className="text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-800">
                  {stats.reduce((s, c) => s + c.total_visitas, 0)}
                </p>
                <p className="text-xs text-slate-500">Total Visitas</p>
              </div>
            </div>

            {/* Gráfico comparativo */}
            {stats.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-slate-700 mb-4">Performance Comparativa</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dadosGrafico} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Clientes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Fechamentos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Visitas" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Tabela detalhada */}
            <div className="card overflow-hidden p-0">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-700">Corretores da Equipe</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-5 py-3 text-slate-500 font-medium">Corretor</th>
                      <th className="text-center px-4 py-3 text-slate-500 font-medium">Clientes</th>
                      <th className="text-center px-4 py-3 text-slate-500 font-medium">Ativos</th>
                      <th className="text-center px-4 py-3 text-slate-500 font-medium">Fechamentos</th>
                      <th className="text-center px-4 py-3 text-slate-500 font-medium">Perdidos</th>
                      <th className="text-center px-4 py-3 text-slate-500 font-medium">Visitas</th>
                      <th className="text-center px-4 py-3 text-slate-500 font-medium">Conversão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((c, idx) => (
                      <tr key={c.user_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}>
                              {(c.nome || c.email || '?').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{c.nome || '(sem nome)'}</p>
                              <p className="text-xs text-slate-400">{c.email}</p>
                            </div>
                            {c === melhorFechamento && c.fechamentos > 0 && (
                              <Crown size={14} className="text-amber-400 ml-1" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-700">{c.total_clientes}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="badge bg-blue-50 text-blue-700">{c.clientes_ativos}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="badge bg-green-50 text-green-700 font-semibold">{c.fechamentos}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="badge bg-red-50 text-red-600">{c.perdidos}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">{c.total_visitas}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${c.taxa_conversao}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-green-700">{c.taxa_conversao}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
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
