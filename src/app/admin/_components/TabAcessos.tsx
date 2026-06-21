'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { History, Loader2, AlertCircle, X, ShieldAlert, Monitor, XCircle, CheckCircle2 } from 'lucide-react'

const supabase = createClient()

interface LogAcesso {
  id: string
  user_id: string | null
  email: string
  nome: string | null
  ip: string | null
  user_agent: string | null
  metodo: string
  sucesso: boolean
  created_at: string
}

interface LogAuditoria {
  id: string
  admin_email: string
  acao: string
  alvo_user_id: string | null
  alvo_email: string | null
  detalhes: Record<string, any>
  created_at: string
}

const ACAO_LABEL: Record<string, string> = {
  criar_usuario: 'Criou usuário',
  editar_usuario: 'Editou usuário',
  excluir_usuario: 'Excluiu usuário',
  bloquear_usuario: 'Bloqueou usuário',
  desbloquear_usuario: 'Desbloqueou usuário',
  resetar_senha: 'Enviou redefinição de senha',
  restaurar_tabela: 'Restaurou tabela a partir de backup',
}

async function apiHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` }
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function dispositivoResumido(ua: string | null) {
  if (!ua) return '—'
  if (/iphone|ipad/i.test(ua)) return 'iOS'
  if (/android/i.test(ua)) return 'Android'
  if (/windows/i.test(ua)) return 'Windows'
  if (/mac os/i.test(ua)) return 'macOS'
  if (/linux/i.test(ua)) return 'Linux'
  return 'Outro'
}

export default function TabAcessos({ filtroUsuario }: { filtroUsuario?: { id: string; nome: string } | null }) {
  const [logs, setLogs] = useState<LogAcesso[]>([])
  const [auditoria, setAuditoria] = useState<LogAuditoria[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [periodo, setPeriodo] = useState('30')
  const [somenteFalhas, setSomenteFalhas] = useState(false)
  const [mostrarAuditoria, setMostrarAuditoria] = useState(false)
  const [userId, setUserId] = useState<string | null>(filtroUsuario?.id || null)
  const [nomeFiltro, setNomeFiltro] = useState<string | null>(filtroUsuario?.nome || null)

  useEffect(() => {
    setUserId(filtroUsuario?.id || null)
    setNomeFiltro(filtroUsuario?.nome || null)
  }, [filtroUsuario])

  useEffect(() => { loadLogs() }, [periodo, userId, somenteFalhas])
  useEffect(() => { if (mostrarAuditoria) loadAuditoria() }, [mostrarAuditoria])

  const loadLogs = async () => {
    setLoading(true)
    setErro('')
    try {
      const headers = await apiHeaders()
      const params = new URLSearchParams()
      if (userId) params.set('user_id', userId)
      if (somenteFalhas) params.set('somente_falhas', '1')
      if (periodo !== 'todos') {
        const desde = new Date()
        desde.setDate(desde.getDate() - parseInt(periodo, 10))
        params.set('desde', desde.toISOString())
      }
      const res = await fetch(`/api/admin/logs-acesso?${params.toString()}`, { headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLogs(data.logs || [])
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar acessos')
    } finally {
      setLoading(false)
    }
  }

  const loadAuditoria = async () => {
    try {
      const headers = await apiHeaders()
      const res = await fetch('/api/admin/auditoria', { headers })
      const data = await res.json()
      if (res.ok) setAuditoria(data.logs || [])
    } catch { /* silencioso */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <History size={18} className="text-indigo-600" />
            Histórico de Acessos
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Data, hora, IP e dispositivo de cada login no CRM.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer whitespace-nowrap">
            <input type="checkbox" checked={somenteFalhas} onChange={e => setSomenteFalhas(e.target.checked)} />
            Somente falhas
          </label>
          <select className="input !py-2 text-sm" value={periodo} onChange={e => setPeriodo(e.target.value)}>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="todos">Todos</option>
          </select>
        </div>
      </div>

      {nomeFiltro && (
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm rounded-xl px-4 py-2.5 w-fit">
          Filtrando por: <span className="font-medium">{nomeFiltro}</span>
          <button onClick={() => { setUserId(null); setNomeFiltro(null) }} className="ml-2 hover:bg-indigo-100 rounded-full p-0.5">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 size={20} className="animate-spin" /> Carregando...
          </div>
        ) : erro ? (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {erro}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Status', 'Nome', 'E-mail', 'Data e hora', 'Método', 'Dispositivo', 'IP'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className={`border-b border-slate-50 hover:bg-slate-50 ${!l.sucesso ? 'bg-red-50/40' : ''}`}>
                    <td className="py-3 px-4">
                      {l.sucesso ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                          <CheckCircle2 size={13} /> Sucesso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                          <XCircle size={13} /> Falha
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{l.nome || '—'}</td>
                    <td className="py-3 px-4 text-slate-600">{l.email}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{formatarData(l.created_at)}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs capitalize">{l.metodo}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs flex items-center gap-1.5">
                      <Monitor size={12} /> {dispositivoResumido(l.user_agent)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{l.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <History size={36} className="mx-auto mb-3 opacity-40" />
                <p>Nenhum acesso registrado no período</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <button
          onClick={() => setMostrarAuditoria(v => !v)}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800"
        >
          <ShieldAlert size={16} />
          {mostrarAuditoria ? 'Ocultar' : 'Ver'} auditoria de ações administrativas
        </button>

        {mostrarAuditoria && (
          <div className="card mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Quando', 'Admin', 'Ação', 'Alvo'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditoria.map(a => (
                    <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-500 text-xs">{formatarData(a.created_at)}</td>
                      <td className="py-3 px-4 text-slate-600">{a.admin_email}</td>
                      <td className="py-3 px-4 text-slate-800 font-medium">{ACAO_LABEL[a.acao] || a.acao}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {a.alvo_email
                          || (a.acao === 'restaurar_tabela' && a.detalhes?.tabela
                              ? `${a.detalhes.tabela} (${a.detalhes.registros} registros)`
                              : '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {auditoria.length === 0 && (
                <p className="text-center py-10 text-slate-400 text-sm">Nenhuma ação registrada ainda</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
