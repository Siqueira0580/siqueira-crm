'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Database, Download, Loader2, AlertCircle, ShieldCheck, Info } from 'lucide-react'

const supabase = createClient()

const NOME_TABELA: Record<string, string> = {
  profiles: 'Usuários (perfis)',
  clientes: 'Clientes',
  imoveis: 'Imóveis',
  fotos_imoveis: 'Fotos de imóveis',
  visitas: 'Visitas',
  matching: 'Matching',
  notificacoes: 'Notificações',
  landing_leads: 'Leads do site',
  analises_comportamento: 'Análises de IA',
  banners_home: 'Imagens da home',
  logs_acesso: 'Histórico de acessos',
  admin_audit_log: 'Auditoria administrativa',
}

async function apiHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` }
}

export default function TabSistema() {
  const [contagens, setContagens] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [baixando, setBaixando] = useState(false)
  const [erroBackup, setErroBackup] = useState('')

  useEffect(() => { loadResumo() }, [])

  const loadResumo = async () => {
    setLoading(true)
    setErro('')
    try {
      const headers = await apiHeaders()
      const res = await fetch('/api/admin/backup/resumo', { headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setContagens(data.contagens || {})
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar resumo do banco')
    } finally {
      setLoading(false)
    }
  }

  const baixarBackup = async () => {
    setBaixando(true)
    setErroBackup('')
    try {
      const headers = await apiHeaders()
      const res = await fetch('/api/admin/backup', { headers })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao gerar backup')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dataHora = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      a.href = url
      a.download = `backup-siqueira-crm-${dataHora}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setErroBackup(err.message || 'Erro ao baixar backup')
    } finally {
      setBaixando(false)
    }
  }

  const totalRegistros = Object.values(contagens).reduce((acc: number, v) => acc + (v || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Database size={18} className="text-indigo-600" />
          Gerenciador de Sistema
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">Visão geral do banco de dados e backup manual de todas as informações.</p>
      </div>

      {/* Resumo do banco */}
      <div className="card">
        <h3 className="font-medium text-slate-700 mb-4">Resumo do banco de dados</h3>
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-3 text-slate-400">
            <Loader2 size={20} className="animate-spin" /> Carregando...
          </div>
        ) : erro ? (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {erro}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(contagens).map(([tabela, count]) => (
              <div key={tabela} className="border border-slate-100 rounded-xl px-4 py-3">
                <p className="text-2xl font-bold text-slate-800">{count ?? '—'}</p>
                <p className="text-xs text-slate-500 mt-0.5">{NOME_TABELA[tabela] || tabela}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Backup */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-medium text-slate-700">Backup manual</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-lg">
              Gera um arquivo .json com todos os dados do sistema ({totalRegistros} registros no total).
              Guarde em local seguro — o arquivo não deve ser compartilhado, pois contém dados pessoais de clientes.
            </p>
          </div>
          <button onClick={baixarBackup} disabled={baixando} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            {baixando ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {baixando ? 'Gerando...' : 'Baixar backup'}
          </button>
        </div>
        {erroBackup && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mt-4">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {erroBackup}
          </div>
        )}
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 text-amber-700 text-xs rounded-xl px-4 py-3 mt-4">
          <Info size={14} className="mt-0.5 flex-shrink-0" />
          Este backup é só para download — não existe restauração automática pelo painel, para evitar sobrescrever
          dados reais por engano. Se precisar restaurar algo, peça apoio técnico usando este arquivo.
        </div>
      </div>

      {/* Segurança */}
      <div className="card">
        <h3 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
          <ShieldCheck size={16} className="text-indigo-600" /> Segurança da conta
        </h3>
        <ul className="text-sm text-slate-600 space-y-2">
          <li>• Apenas <span className="font-medium">duda.siqueira2@gmail.com</span> tem acesso de administrador completo.</li>
          <li>• Bloquear um usuário impede login imediatamente; sessões já abertas expiram em até 1 hora.</li>
          <li>• Toda ação administrativa (criar, editar, excluir, bloquear) fica registrada na aba Acessos.</li>
        </ul>
      </div>
    </div>
  )
}
