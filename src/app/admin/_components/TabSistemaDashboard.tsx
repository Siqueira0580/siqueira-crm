'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Users, ShieldOff, LogIn, AlertTriangle, Database, Crown, Loader2,
} from 'lucide-react'
import { NOME_TABELA } from '@/lib/backup-tabelas'

const supabase = createClient()

async function apiHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` }
}

const ACAO_LABEL: Record<string, string> = {
  criar_usuario: 'Criar usuário',
  editar_usuario: 'Editar usuário',
  excluir_usuario: 'Excluir usuário',
  bloquear_usuario: 'Bloquear usuário',
  desbloquear_usuario: 'Desbloquear usuário',
  resetar_senha: 'Resetar senha',
  restaurar_tabela: 'Restaurar tabela',
  bloqueio_automatico: 'Bloqueio automático',
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: 'blue' | 'red' | 'green' | 'amber' | 'indigo' }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  }
  return (
    <div className="card flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function diaCurto(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

interface Props {
  contagens: Record<string, number | null>
}

export default function TabSistemaDashboard({ contagens }: Props) {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const [usuarios, setUsuarios] = useState<{ role: string; bloqueado: boolean }[]>([])
  const [acessos, setAcessos] = useState<{ created_at: string; sucesso: boolean }[]>([])
  const [auditoria, setAuditoria] = useState<{ acao: string }[]>([])

  useEffect(() => { carregar() }, [])

  const carregar = async () => {
    setLoading(true)
    setErro('')
    try {
      const headers = await apiHeaders()
      const desde30 = new Date()
      desde30.setDate(desde30.getDate() - 30)

      const [resUsers, resAcessos, resAuditoria] = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch(`/api/admin/logs-acesso?desde=${desde30.toISOString()}&limit=1000`, { headers }),
        fetch('/api/admin/auditoria?limit=200', { headers }),
      ])
      const [dataUsers, dataAcessos, dataAuditoria] = await Promise.all([
        resUsers.json(), resAcessos.json(), resAuditoria.json(),
      ])
      if (!resUsers.ok) throw new Error(dataUsers.error)
      if (!resAcessos.ok) throw new Error(dataAcessos.error)
      if (!resAuditoria.ok) throw new Error(dataAuditoria.error)

      setUsuarios(dataUsers.users || [])
      setAcessos(dataAcessos.logs || [])
      setAuditoria(dataAuditoria.logs || [])
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-16 gap-3 text-slate-400">
        <Loader2 size={20} className="animate-spin" /> Carregando dashboard...
      </div>
    )
  }
  if (erro) {
    return (
      <div className="card flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" /> {erro}
      </div>
    )
  }

  // ── KPIs ──
  const totalUsuarios = usuarios.length
  const usuariosBloqueados = usuarios.filter(u => u.bloqueado).length
  const acessosUltimos7 = acessos.filter(a => {
    const d = new Date(a.created_at)
    const corte = new Date(); corte.setDate(corte.getDate() - 7)
    return d >= corte
  })
  const loginsSucesso7 = acessosUltimos7.filter(a => a.sucesso).length
  const loginsFalha7 = acessosUltimos7.filter(a => !a.sucesso).length
  const taxaFalha = acessosUltimos7.length > 0 ? Math.round((loginsFalha7 / acessosUltimos7.length) * 100) : 0
  const totalRegistros = Object.values(contagens).reduce((acc: number, v) => acc + (v || 0), 0)
  const [tabelaMaior] = Object.entries(contagens).sort((a, b) => (b[1] || 0) - (a[1] || 0))

  // ── Registros por tabela ──
  const dadosTabelas = Object.entries(contagens)
    .map(([t, v]) => ({ name: NOME_TABELA[t] || t, quantidade: v || 0 }))
    .filter(d => d.quantidade > 0)
    .sort((a, b) => b.quantidade - a.quantidade)

  // ── Acessos por dia (últimos 14 dias) ──
  const dias: { dataIso: string; nome: string; sucesso: number; falha: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    dias.push({ dataIso: iso, nome: diaCurto(iso), sucesso: 0, falha: 0 })
  }
  acessos.forEach(a => {
    const iso = a.created_at.slice(0, 10)
    const bucket = dias.find(d => d.dataIso === iso)
    if (bucket) {
      if (a.sucesso) bucket.sucesso++
      else bucket.falha++
    }
  })

  // ── Usuários por perfil ──
  const dadosPerfil = [
    { name: 'Corretor', value: usuarios.filter(u => u.role !== 'admin').length, fill: '#60a5fa' },
    { name: 'Admin', value: usuarios.filter(u => u.role === 'admin').length, fill: '#a78bfa' },
  ].filter(d => d.value > 0)

  // ── Ações administrativas por tipo ──
  const contagemAcoes: Record<string, number> = {}
  auditoria.forEach(a => { contagemAcoes[a.acao] = (contagemAcoes[a.acao] || 0) + 1 })
  const dadosAcoes = Object.entries(contagemAcoes)
    .map(([acao, quantidade]) => ({ name: ACAO_LABEL[acao] || acao, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Usuários" value={totalUsuarios} icon={Users} color="blue" />
        <StatCard label="Bloqueados" value={usuariosBloqueados} icon={ShieldOff} color="red" />
        <StatCard label="Logins (7 dias)" value={loginsSucesso7} icon={LogIn} color="green" />
        <StatCard label="Falhas de login (7d)" value={`${loginsFalha7} (${taxaFalha}%)`} icon={AlertTriangle} color="amber" />
        <StatCard label="Registros no banco" value={totalRegistros} icon={Database} color="indigo" />
        <StatCard label="Maior tabela" value={tabelaMaior ? (NOME_TABELA[tabelaMaior[0]] || tabelaMaior[0]) : '—'} icon={Crown} color="indigo" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Registros por tabela */}
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-4">Registros por tabela</h3>
          {dadosTabelas.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, dadosTabelas.length * 28)}>
              <BarChart data={dadosTabelas} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#6366f1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Acessos por dia */}
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-4">Acessos por dia (14 dias)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dias} margin={{ left: -10, right: 10 }}>
              <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="sucesso" name="Sucesso" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="falha" name="Falha" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Usuários por perfil */}
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-4">Usuários por perfil</h3>
          {dadosPerfil.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Sem usuários cadastrados</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={dadosPerfil} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {dadosPerfil.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Ações administrativas */}
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-4">Ações administrativas (até 200 mais recentes)</h3>
          {dadosAcoes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Nenhuma ação registrada ainda</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, dadosAcoes.length * 32)}>
              <BarChart data={dadosAcoes} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
