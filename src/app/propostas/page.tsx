'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase'
import { gerarPdfProposta, arrayBufferToBase64 } from '@/lib/gerar-pdf-proposta'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Proposta, Cliente, Imovel } from '@/types'
import {
  FileText, Search, Filter, Download, MessageCircle, Mail,
  Trash2, Loader2, CheckCircle2, AlertCircle, User, Building2,
  Calendar, Send, Clock, RefreshCw, X,
  XCircle, Maximize2, Minimize2,
} from 'lucide-react'

const supabase = createClient()

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────
interface PropostaCompleta extends Proposta {
  cliente: Pick<Cliente, 'id' | 'nome' | 'email' | 'telefone'> | null
  imovel:  Pick<Imovel,  'id' | 'titulo' | 'valor' | 'bairro' | 'cidade'> | null
  corretor: { id: string; nome: string } | null
}

type FiltroPeriodo = '7' | '30' | '90' | 'todos'
type FiltroEnvio   = 'todos' | 'whatsapp' | 'email' | 'nenhum'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function statusEnvio(p: PropostaCompleta) {
  const wpp   = !!p.enviado_whatsapp_em
  const email = !!p.enviado_email_em
  if (wpp && email) return 'ambos'
  if (wpp)          return 'whatsapp'
  if (email)        return 'email'
  return 'nenhum'
}

function BadgeEnvio({ proposta }: { proposta: PropostaCompleta }) {
  const s = statusEnvio(proposta)
  if (s === 'ambos')
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
        <CheckCircle2 size={11} /> WPP + E-mail
      </span>
    )
  if (s === 'whatsapp')
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
        <MessageCircle size={11} /> WhatsApp
      </span>
    )
  if (s === 'email')
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
        <Mail size={11} /> E-mail
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-500 border border-slate-200 rounded-full px-2 py-0.5">
      <Clock size={11} /> Não enviada
    </span>
  )
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
export default function PropostasPage() {
  const [propostas, setPropostas]           = useState<PropostaCompleta[]>([])
  const [loading, setLoading]               = useState(true)
  const [erro, setErro]                     = useState<string | null>(null)

  // Filtros
  const [busca, setBusca]                   = useState('')
  const [periodo, setPeriodo]               = useState<FiltroPeriodo>('30')
  const [filtroEnvio, setFiltroEnvio]       = useState<FiltroEnvio>('todos')

  // Modal de detalhe
  const [detalhe, setDetalhe]               = useState<PropostaCompleta | null>(null)
  const [fullscreen, setFullscreen]         = useState(false)

  // Modal de confirmação de exclusão
  const [excluindo, setExcluindo]           = useState<PropostaCompleta | null>(null)
  const [loadingExcluir, setLoadingExcluir] = useState(false)

  // Ações inline
  const [acaoId, setAcaoId]                 = useState<string | null>(null)
  const [acaoTipo, setAcaoTipo]             = useState<'wpp' | 'email' | 'pdf' | null>(null)
  const [toast, setToast]                   = useState<{ msg: string; tipo: 'ok' | 'err' } | null>(null)

  // ── carrega dados ──────────────────────────
  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setErro('Sessão expirada.'); setLoading(false); return }

      const res = await fetch('/api/propostas', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar')
      setPropostas(json.propostas || [])
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // ── filtros ────────────────────────────────
  const propostasFiltradas = useMemo(() => {
    const agora = Date.now()
    const diasMs: Record<FiltroPeriodo, number> = { '7': 7, '30': 30, '90': 90, todos: 0 }

    return propostas.filter(p => {
      // Período
      if (periodo !== 'todos') {
        const diff = agora - new Date(p.created_at).getTime()
        if (diff > diasMs[periodo] * 86400000) return false
      }

      // Status de envio
      if (filtroEnvio !== 'todos') {
        const s = statusEnvio(p)
        if (filtroEnvio === 'whatsapp' && s !== 'whatsapp' && s !== 'ambos') return false
        if (filtroEnvio === 'email'    && s !== 'email'    && s !== 'ambos') return false
        if (filtroEnvio === 'nenhum'   && s !== 'nenhum')                    return false
      }

      // Busca
      if (busca.trim()) {
        const q = busca.toLowerCase()
        const nomeCli  = p.cliente?.nome?.toLowerCase()  || ''
        const nomeImo  = p.imovel?.titulo?.toLowerCase() || ''
        const corretor = p.corretor?.nome?.toLowerCase() || ''
        if (!nomeCli.includes(q) && !nomeImo.includes(q) && !corretor.includes(q)) return false
      }

      return true
    })
  }, [propostas, periodo, filtroEnvio, busca])

  // ── KPIs ──────────────────────────────────
  const kpis = useMemo(() => {
    const mes = propostas.filter(p => {
      const diff = Date.now() - new Date(p.created_at).getTime()
      return diff <= 30 * 86400000
    })
    return {
      total:    mes.length,
      wpp:      mes.filter(p => !!p.enviado_whatsapp_em).length,
      email:    mes.filter(p => !!p.enviado_email_em).length,
      nenhum:   mes.filter(p => !p.enviado_whatsapp_em && !p.enviado_email_em).length,
    }
  }, [propostas])

  // ── mostrar toast ──────────────────────────
  const exibirToast = (msg: string, tipo: 'ok' | 'err') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  // ── download PDF ───────────────────────────
  const downloadPdf = async (p: PropostaCompleta) => {
    if (!p.imovel || !p.cliente) return
    setAcaoId(p.id); setAcaoTipo('pdf')
    try {
      // Reconstrói resultado a partir dos dados salvos
      const sim = p.dados_simulacao
      const resultado = sim?.resultado ?? null
      if (!resultado) throw new Error('Dados de simulação incompletos')

      const buffer = gerarPdfProposta({
        cliente: { ...p.cliente } as any,
        imovel:  { ...p.imovel  } as any,
        resultado,
      })
      const blob = new Blob([buffer], { type: 'application/pdf' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `proposta-${p.imovel.titulo.replace(/\s+/g, '-').toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      exibirToast('Erro ao gerar PDF: ' + e.message, 'err')
    } finally {
      setAcaoId(null); setAcaoTipo(null)
    }
  }

  // ── reenviar WhatsApp ──────────────────────
  const reenviarWhatsapp = async (p: PropostaCompleta) => {
    if (!p.cliente?.telefone || !p.imovel) return
    setAcaoId(p.id); setAcaoTipo('wpp')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')

      const sim = p.dados_simulacao
      const resultado = sim?.resultado ?? null
      if (!resultado) throw new Error('Dados de simulação incompletos')

      const buffer = gerarPdfProposta({
        cliente: { ...p.cliente } as any,
        imovel:  { ...p.imovel  } as any,
        resultado,
      })
      const blob = new Blob([buffer], { type: 'application/pdf' })
      const path = `${p.id}.pdf`
      const { error: upErr } = await supabase.storage
        .from('propostas')
        .upload(path, blob, { contentType: 'application/pdf', upsert: true })
      if (upErr) throw upErr

      const { data: urlData } = supabase.storage.from('propostas').getPublicUrl(path)
      const pdfUrl = urlData.publicUrl

      const numero  = p.cliente.telefone.replace(/\D/g, '')
      const primeiroNome = p.cliente.nome.split(' ')[0]
      const msg = `Olá ${primeiroNome}! Segue a simulação de compra do imóvel "${p.imovel.titulo}". Veja o PDF: ${pdfUrl}`
      window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(msg)}`, '_blank')

      // Atualiza timestamp localmente
      setPropostas(prev =>
        prev.map(x => x.id === p.id ? { ...x, enviado_whatsapp_em: new Date().toISOString() } : x)
      )
      if (detalhe?.id === p.id) setDetalhe(d => d ? { ...d, enviado_whatsapp_em: new Date().toISOString() } : d)
    } catch (e: any) {
      exibirToast('Erro ao enviar por WhatsApp: ' + e.message, 'err')
    } finally {
      setAcaoId(null); setAcaoTipo(null)
    }
  }

  // ── reenviar e-mail ────────────────────────
  const reenviarEmail = async (p: PropostaCompleta) => {
    if (!p.cliente?.email || !p.imovel) return
    setAcaoId(p.id); setAcaoTipo('email')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')

      const sim = p.dados_simulacao
      const resultado = sim?.resultado ?? null
      if (!resultado) throw new Error('Dados de simulação incompletos')

      const buffer  = gerarPdfProposta({
        cliente: { ...p.cliente } as any,
        imovel:  { ...p.imovel  } as any,
        resultado,
      })
      const base64 = arrayBufferToBase64(buffer)

      const res = await fetch('/api/propostas/enviar-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          propostaId: p.id,
          pdfBase64: base64,
          filename: `proposta-${p.imovel.titulo.replace(/\s+/g, '-').toLowerCase()}.pdf`,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Falha ao enviar e-mail')

      setPropostas(prev =>
        prev.map(x => x.id === p.id ? { ...x, enviado_email_em: new Date().toISOString() } : x)
      )
      if (detalhe?.id === p.id) setDetalhe(d => d ? { ...d, enviado_email_em: new Date().toISOString() } : d)
      exibirToast('E-mail enviado com sucesso!', 'ok')
    } catch (e: any) {
      exibirToast('Erro ao enviar e-mail: ' + e.message, 'err')
    } finally {
      setAcaoId(null); setAcaoTipo(null)
    }
  }

  // ── excluir ────────────────────────────────
  const confirmarExclusao = async () => {
    if (!excluindo) return
    setLoadingExcluir(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')

      const res = await fetch(`/api/propostas?id=${excluindo.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao excluir')

      setPropostas(prev => prev.filter(p => p.id !== excluindo.id))
      if (detalhe?.id === excluindo.id) setDetalhe(null)
      exibirToast('Proposta excluída.', 'ok')
      setExcluindo(null)
    } catch (e: any) {
      exibirToast('Erro: ' + e.message, 'err')
    } finally {
      setLoadingExcluir(false)
    }
  }

  const carregandoAcao = (p: PropostaCompleta, tipo: typeof acaoTipo) =>
    acaoId === p.id && acaoTipo === tipo

  // ── render ─────────────────────────────────
  return (
    <AppLayout title="Propostas">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.tipo === 'ok'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toast.tipo === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Propostas</h1>
            <p className="text-sm text-slate-500 mt-0.5">Simulações geradas e enviadas aos clientes</p>
          </div>
          <button
            onClick={carregar}
            className="btn-secondary flex items-center gap-1.5 text-sm"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Propostas no mês"
            valor={kpis.total}
            icon={<FileText size={20} className="text-blue-600" />}
            cor="blue"
          />
          <KpiCard
            label="Enviadas por WhatsApp"
            valor={kpis.wpp}
            icon={<MessageCircle size={20} className="text-green-600" />}
            cor="green"
          />
          <KpiCard
            label="Enviadas por e-mail"
            valor={kpis.email}
            icon={<Send size={20} className="text-indigo-600" />}
            cor="indigo"
          />
          <KpiCard
            label="Sem envio"
            valor={kpis.nenhum}
            icon={<Clock size={20} className="text-amber-600" />}
            cor="amber"
          />
        </div>

        {/* Filtros */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-3 items-center">
          {/* Busca */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente, imóvel ou corretor..."
              className="input pl-9 text-sm"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>

          {/* Período */}
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1">
            {([['7','7d'],['30','30d'],['90','90d'],['todos','Todos']] as [FiltroPeriodo, string][]).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setPeriodo(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  periodo === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Status de envio */}
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400" />
            <select
              className="input text-sm py-1.5 pr-8"
              value={filtroEnvio}
              onChange={e => setFiltroEnvio(e.target.value as FiltroEnvio)}
            >
              <option value="todos">Todos os status</option>
              <option value="whatsapp">Enviadas por WhatsApp</option>
              <option value="email">Enviadas por e-mail</option>
              <option value="nenhum">Não enviadas</option>
            </select>
          </div>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-blue-500" />
          </div>
        ) : erro ? (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertCircle size={18} />
            <span className="text-sm">{erro}</span>
          </div>
        ) : propostasFiltradas.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl py-16 flex flex-col items-center gap-3">
            <FileText size={40} className="text-slate-300" />
            <p className="text-slate-500 font-medium">Nenhuma proposta encontrada</p>
            <p className="text-slate-400 text-sm">Gere simulações no perfil de um cliente para ver aqui.</p>
          </div>
        ) : (
          <>
            {/* Tabela desktop */}
            <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Imóvel</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Parcela</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Envio</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {propostasFiltradas.map(p => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setDetalhe(p)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User size={13} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{p.cliente?.nome || '—'}</p>
                            {p.corretor && (
                              <p className="text-xs text-slate-400">via {p.corretor.nome}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 size={13} className="text-slate-400 flex-shrink-0" />
                          <div>
                            <p className="text-slate-700 line-clamp-1">{p.imovel?.titulo || '—'}</p>
                            {(p.imovel?.bairro || p.imovel?.cidade) && (
                              <p className="text-xs text-slate-400">
                                {[p.imovel.bairro, p.imovel.cidade].filter(Boolean).join(' — ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-medium text-slate-800">
                          {p.valor_imovel ? formatCurrency(p.valor_imovel) : '—'}
                        </p>
                        {p.valor_entrada && (
                          <p className="text-xs text-slate-400">
                            Ent. {formatCurrency(p.valor_entrada)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-medium text-slate-800">
                          {p.parcela_inicial ? formatCurrency(p.parcela_inicial) + '/mês' : '—'}
                        </p>
                        {p.dados_simulacao?.inputs?.prazoMeses && (
                          <p className="text-xs text-slate-400">
                            {p.dados_simulacao.inputs.prazoMeses / 12} anos · {p.dados_simulacao.inputs.sistema}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BadgeEnvio proposta={p} />
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-400">
                        <div className="flex items-center justify-center gap-1">
                          <Calendar size={11} />
                          {formatDateTime(p.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          {/* Download PDF */}
                          <BotaoAcao
                            title="Baixar PDF"
                            loading={carregandoAcao(p, 'pdf')}
                            onClick={() => downloadPdf(p)}
                            disabled={!p.imovel || !p.cliente}
                          >
                            <Download size={14} />
                          </BotaoAcao>
                          {/* WhatsApp */}
                          <BotaoAcao
                            title={p.enviado_whatsapp_em ? 'Reenviar por WhatsApp' : 'Enviar por WhatsApp'}
                            loading={carregandoAcao(p, 'wpp')}
                            onClick={() => reenviarWhatsapp(p)}
                            disabled={!p.cliente?.telefone || !p.imovel}
                            verde={!!p.enviado_whatsapp_em}
                          >
                            <MessageCircle size={14} />
                          </BotaoAcao>
                          {/* E-mail */}
                          <BotaoAcao
                            title={p.enviado_email_em ? 'Reenviar por e-mail' : 'Enviar por e-mail'}
                            loading={carregandoAcao(p, 'email')}
                            onClick={() => reenviarEmail(p)}
                            disabled={!p.cliente?.email || !p.imovel}
                            azul={!!p.enviado_email_em}
                          >
                            <Mail size={14} />
                          </BotaoAcao>
                          {/* Excluir */}
                          <BotaoAcao
                            title="Excluir proposta"
                            onClick={() => setExcluindo(p)}
                            vermelho
                          >
                            <Trash2 size={14} />
                          </BotaoAcao>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">
                {propostasFiltradas.length} proposta{propostasFiltradas.length !== 1 ? 's' : ''} exibida{propostasFiltradas.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Cards mobile */}
            <div className="md:hidden space-y-3">
              {propostasFiltradas.map(p => (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3"
                  onClick={() => setDetalhe(p)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">{p.cliente?.nome || '—'}</p>
                      <p className="text-xs text-slate-400">{p.imovel?.titulo || '—'}</p>
                    </div>
                    <BadgeEnvio proposta={p} />
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Valor</p>
                      <p className="font-medium text-slate-700">{p.valor_imovel ? formatCurrency(p.valor_imovel) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Parcela</p>
                      <p className="font-medium text-slate-700">{p.parcela_inicial ? formatCurrency(p.parcela_inicial) : '—'}</p>
                    </div>
                    <div className="ml-auto text-xs text-slate-400">{formatDateTime(p.created_at)}</div>
                  </div>
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      className="flex-1 btn-secondary text-xs py-1.5 justify-center"
                      onClick={() => downloadPdf(p)}
                      disabled={!p.imovel || !p.cliente || carregandoAcao(p, 'pdf')}
                    >
                      {carregandoAcao(p, 'pdf') ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                      PDF
                    </button>
                    <button
                      className="flex-1 btn-secondary text-xs py-1.5 justify-center"
                      onClick={() => reenviarWhatsapp(p)}
                      disabled={!p.cliente?.telefone || !p.imovel || carregandoAcao(p, 'wpp')}
                    >
                      {carregandoAcao(p, 'wpp') ? <Loader2 size={13} className="animate-spin" /> : <MessageCircle size={13} />}
                      WPP
                    </button>
                    <button
                      className="flex-1 btn-secondary text-xs py-1.5 justify-center"
                      onClick={() => reenviarEmail(p)}
                      disabled={!p.cliente?.email || !p.imovel || carregandoAcao(p, 'email')}
                    >
                      {carregandoAcao(p, 'email') ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                      Email
                    </button>
                    <button
                      className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600"
                      onClick={() => setExcluindo(p)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Modal de detalhe ─────────────────── */}
      {/* Modal normal */}
      {detalhe && !fullscreen && (
        <Modal
          isOpen={!!detalhe}
          onClose={() => { setDetalhe(null); setFullscreen(false) }}
          title={detalhe.cliente?.nome ? `Proposta — ${detalhe.cliente.nome}` : 'Detalhe da Proposta'}
          size="lg"
        >
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setFullscreen(true)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-300 rounded-lg px-2.5 py-1.5 transition-colors"
              title="Expandir para tela cheia"
            >
              <Maximize2 size={13} /> Expandir
            </button>
          </div>
          <DetalheModal
            proposta={detalhe}
            onDownload={downloadPdf}
            onWpp={reenviarWhatsapp}
            onEmail={reenviarEmail}
            onExcluir={() => { setExcluindo(detalhe); setDetalhe(null) }}
            acaoId={acaoId}
            acaoTipo={acaoTipo}
          />
        </Modal>
      )}

      {/* Fullscreen */}
      {detalhe && fullscreen && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          {/* Barra superior */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                {detalhe.cliente?.nome ? `Proposta — ${detalhe.cliente.nome}` : 'Detalhe da Proposta'}
              </h2>
              {detalhe.imovel?.titulo && (
                <p className="text-xs text-slate-500">{detalhe.imovel.titulo}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFullscreen(false)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-300 rounded-lg px-2.5 py-1.5 transition-colors"
                title="Reduzir"
              >
                <Minimize2 size={13} /> Reduzir
              </button>
              <button
                onClick={() => { setDetalhe(null); setFullscreen(false) }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Conteúdo expandido */}
          <div className="max-w-5xl mx-auto px-6 py-8">
            <DetalheModal
              proposta={detalhe}
              onDownload={downloadPdf}
              onWpp={reenviarWhatsapp}
              onEmail={reenviarEmail}
              onExcluir={() => { setExcluindo(detalhe); setDetalhe(null); setFullscreen(false) }}
              acaoId={acaoId}
              acaoTipo={acaoTipo}
              fullscreen
            />
          </div>
        </div>
      )}

      {/* ── Modal de confirmação de exclusão ─── */}
      <Modal
        isOpen={!!excluindo}
        onClose={() => setExcluindo(null)}
        title="Excluir proposta"
        size="sm"
      >
        {excluindo && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Tem certeza que deseja excluir a proposta de{' '}
              <strong>{excluindo.cliente?.nome}</strong>
              {excluindo.imovel ? ` para "${excluindo.imovel.titulo}"` : ''}?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setExcluindo(null)} disabled={loadingExcluir}>
                Cancelar
              </button>
              <button
                className="btn-primary bg-red-600 hover:bg-red-700 border-red-600"
                onClick={confirmarExclusao}
                disabled={loadingExcluir}
              >
                {loadingExcluir ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Excluir
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}

// ─────────────────────────────────────────────
// KpiCard
// ─────────────────────────────────────────────
function KpiCard({
  label, valor, icon, cor,
}: {
  label: string
  valor: number
  icon: React.ReactNode
  cor: 'blue' | 'green' | 'indigo' | 'amber'
}) {
  const bg: Record<string, string> = {
    blue: 'bg-blue-50', green: 'bg-green-50', indigo: 'bg-indigo-50', amber: 'bg-amber-50',
  }
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-11 h-11 ${bg[cor]} rounded-xl flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{valor}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// BotaoAcao
// ─────────────────────────────────────────────
function BotaoAcao({
  children, onClick, title, loading = false, disabled = false,
  verde = false, azul = false, vermelho = false,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  loading?: boolean
  disabled?: boolean
  verde?: boolean
  azul?: boolean
  vermelho?: boolean
}) {
  const cor = vermelho
    ? 'text-red-400 hover:bg-red-50 hover:text-red-600'
    : verde
    ? 'text-green-600 hover:bg-green-50'
    : azul
    ? 'text-blue-600 hover:bg-blue-50'
    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'

  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled || loading}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${cor}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin text-slate-400" /> : children}
    </button>
  )
}

// ─────────────────────────────────────────────
// DetalheModal
// ─────────────────────────────────────────────
function DetalheModal({
  proposta, onDownload, onWpp, onEmail, onExcluir, acaoId, acaoTipo, fullscreen = false,
}: {
  proposta: PropostaCompleta
  onDownload: (p: PropostaCompleta) => void
  onWpp:      (p: PropostaCompleta) => void
  onEmail:    (p: PropostaCompleta) => void
  onExcluir:  () => void
  acaoId:     string | null
  acaoTipo:   'wpp' | 'email' | 'pdf' | null
  fullscreen?: boolean
}) {
  const sim = proposta.dados_simulacao
  const res = sim?.resultado || null

  const loading = (tipo: typeof acaoTipo) => acaoId === proposta.id && acaoTipo === tipo

  const txt  = fullscreen ? 'text-sm'  : 'text-xs'
  const txt2 = fullscreen ? 'text-base' : 'text-sm'

  return (
    <div className="space-y-6">

      {/* ── Cabeçalho cliente / imóvel ── */}
      <div className={`grid gap-4 ${fullscreen ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
        <InfoBloco titulo="Cliente" icon={<User size={14} className="text-blue-500" />} fullscreen={fullscreen}>
          <p className={`font-semibold text-slate-800 ${fullscreen ? 'text-lg' : ''}`}>{proposta.cliente?.nome || '—'}</p>
          {proposta.cliente?.email    && <p className={`${txt} text-slate-500 mt-0.5`}>{proposta.cliente.email}</p>}
          {proposta.cliente?.telefone && <p className={`${txt} text-slate-500`}>{proposta.cliente.telefone}</p>}
        </InfoBloco>

        <InfoBloco titulo="Imóvel" icon={<Building2 size={14} className="text-blue-500" />} fullscreen={fullscreen}>
          <p className={`font-semibold text-slate-800 ${fullscreen ? 'text-lg' : ''}`}>{proposta.imovel?.titulo || '—'}</p>
          {(proposta.imovel?.bairro || proposta.imovel?.cidade) && (
            <p className={`${txt} text-slate-500 mt-0.5`}>
              {[proposta.imovel.bairro, proposta.imovel.cidade].filter(Boolean).join(' — ')}
            </p>
          )}
          {proposta.imovel?.valor && (
            <p className={`${txt} text-slate-500 font-medium`}>{formatCurrency(proposta.imovel.valor)}</p>
          )}
        </InfoBloco>

        {fullscreen && (
          <InfoBloco titulo="Envios" icon={<Send size={14} className="text-blue-500" />} fullscreen={fullscreen}>
            <div className="space-y-1.5 mt-1">
              <EnvioLinha label="WhatsApp" data={proposta.enviado_whatsapp_em} icon={<MessageCircle size={13} />} cor="green" />
              <EnvioLinha label="E-mail"   data={proposta.enviado_email_em}    icon={<Mail size={13} />}          cor="blue"  />
            </div>
            <p className={`${txt} text-slate-400 flex items-center gap-1 mt-2`}>
              <Calendar size={11} /> {formatDateTime(proposta.created_at)}
            </p>
          </InfoBloco>
        )}
      </div>

      {/* ── Simulação financeira ── */}
      {res ? (
        <div className={`bg-slate-50 border border-slate-200 rounded-xl p-5 ${fullscreen ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-2'}`}>
          {/* Coluna 1 — Custos */}
          <div className="space-y-2">
            <p className={`${txt} font-semibold text-slate-500 uppercase tracking-wide mb-3`}>Custos no fechamento</p>
            <LinhaDetalhe label="Preço do imóvel"          valor={formatCurrency(res.valorImovel)}        fullscreen={fullscreen} />
            <LinhaDetalhe label="Entrada"                  valor={formatCurrency(res.valorEntrada)}       fullscreen={fullscreen} />
            <LinhaDetalhe label="ITBI"                     valor={res.itbiIsento ? 'Isento' : formatCurrency(res.itbiValor)} fullscreen={fullscreen} />
            <LinhaDetalhe label={`Cartório (${res.cartorioPercentual}%)`} valor={formatCurrency(res.cartorioValor)} fullscreen={fullscreen} />
            <LinhaDetalhe label="Total no fechamento"      valor={formatCurrency(res.custoTotalFechamento)} destaque fullscreen={fullscreen} />
            {res.itbiMotivo && (
              <p className={`${txt} text-slate-400 italic`}>{res.itbiMotivo}</p>
            )}
          </div>

          {/* Coluna 2 — Financiamento */}
          <div className="space-y-2">
            <p className={`${txt} font-semibold text-slate-500 uppercase tracking-wide mb-3`}>Financiamento</p>
            <LinhaDetalhe label="Valor financiado"  valor={formatCurrency(res.valorFinanciado)} fullscreen={fullscreen} />
            <LinhaDetalhe label="Sistema"           valor={res.sistema === 'SAC' ? 'SAC (parcela decrescente)' : 'PRICE (parcela fixa)'} fullscreen={fullscreen} />
            <LinhaDetalhe label="Prazo"             valor={`${res.prazoMeses} meses (${res.prazoMeses / 12} anos)`} fullscreen={fullscreen} />
            <LinhaDetalhe label="Taxa de juros"     valor={`${res.taxaJurosAnual}% a.a.`} fullscreen={fullscreen} />
            <LinhaDetalhe label={res.sistema === 'SAC' ? 'Parcela inicial' : 'Parcela'} valor={formatCurrency(res.parcelaInicial)} destaque fullscreen={fullscreen} />
            {res.sistema === 'SAC' && (
              <LinhaDetalhe label="Parcela final" valor={formatCurrency(res.parcelaFinal)} fullscreen={fullscreen} />
            )}

            {res.rendaComprometidaPercentual != null && (
              <div className={`flex items-center gap-2 ${txt} rounded-lg px-3 py-2 mt-2 ${
                res.alertaRendaComprometida ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
              }`}>
                {res.alertaRendaComprometida ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
                Comprometimento de renda: {(res.rendaComprometidaPercentual * 100).toFixed(1)}%
                {res.alertaRendaComprometida ? ' — acima de 30%' : ' — dentro do limite'}
              </div>
            )}
            {res.dentroDoOrcamento != null && (
              <div className={`flex items-center gap-2 ${txt} rounded-lg px-3 py-2 ${
                res.dentroDoOrcamento ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {res.dentroDoOrcamento ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                {res.dentroDoOrcamento ? 'Dentro do orçamento do cliente' : 'Acima do orçamento máximo'}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className={`${txt2} text-slate-400 italic`}>Dados da simulação não disponíveis.</p>
      )}

      {/* ── Histórico de envios (só no modal normal) ── */}
      {!fullscreen && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Histórico de envios</p>
          <div className="space-y-1.5">
            <EnvioLinha label="WhatsApp" data={proposta.enviado_whatsapp_em} icon={<MessageCircle size={13} />} cor="green" />
            <EnvioLinha label="E-mail"   data={proposta.enviado_email_em}    icon={<Mail size={13} />}          cor="blue"  />
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
              <Calendar size={11} />
              Proposta criada em {formatDateTime(proposta.created_at)}
            </div>
          </div>
        </div>
      )}

      {/* ── Ações ── */}
      <div className={`flex flex-wrap gap-2 pt-3 border-t border-slate-100 ${fullscreen ? 'sticky bottom-0 bg-white pb-2' : ''}`}>
        <button
          className={`btn-secondary flex items-center gap-1.5 ${txt2}`}
          onClick={() => onDownload(proposta)}
          disabled={!proposta.imovel || !proposta.cliente || loading('pdf')}
        >
          {loading('pdf') ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Baixar PDF
        </button>

        <button
          className={`btn-secondary flex items-center gap-1.5 ${txt2} text-green-700 border-green-200 hover:bg-green-50 disabled:opacity-50`}
          onClick={() => onWpp(proposta)}
          disabled={!proposta.cliente?.telefone || !proposta.imovel || loading('wpp')}
          title={!proposta.cliente?.telefone ? 'Cliente sem telefone' : undefined}
        >
          {loading('wpp') ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
          {proposta.enviado_whatsapp_em ? 'Reenviar WPP' : 'Enviar WPP'}
        </button>

        <button
          className={`btn-secondary flex items-center gap-1.5 ${txt2} disabled:opacity-50`}
          onClick={() => onEmail(proposta)}
          disabled={!proposta.cliente?.email || !proposta.imovel || loading('email')}
          title={!proposta.cliente?.email ? 'Cliente sem e-mail' : undefined}
        >
          {loading('email') ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
          {proposta.enviado_email_em ? 'Reenviar e-mail' : 'Enviar e-mail'}
        </button>

        <button
          className={`ml-auto btn-secondary text-red-500 border-red-200 hover:bg-red-50 flex items-center gap-1.5 ${txt2}`}
          onClick={onExcluir}
        >
          <Trash2 size={14} />
          Excluir
        </button>
      </div>
    </div>
  )
}

// ── Blocos auxiliares ──────────────────────────
function InfoBloco({ titulo, icon, children, fullscreen = false }: { titulo: string; icon: React.ReactNode; children: React.ReactNode; fullscreen?: boolean }) {
  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-xl ${fullscreen ? 'p-5' : 'p-3'}`}>
      <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {icon} {titulo}
      </div>
      {children}
    </div>
  )
}

function LinhaDetalhe({ label, valor, destaque = false, fullscreen = false }: { label: string; valor: string; destaque?: boolean; fullscreen?: boolean }) {
  const size = fullscreen ? 'text-base' : 'text-sm'
  return (
    <div className={`flex items-center justify-between ${size} ${destaque ? 'font-semibold text-slate-800 border-t border-slate-200 pt-2 mt-1' : ''}`}>
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium ${destaque ? 'text-slate-900 text-lg' : 'text-slate-700'}`}>{valor}</span>
    </div>
  )
}

function EnvioLinha({ label, data, icon, cor }: { label: string; data?: string | null; icon: React.ReactNode; cor: string }) {
  const cores: Record<string, string> = {
    green: 'text-green-700 bg-green-50',
    blue:  'text-blue-700 bg-blue-50',
  }
  return (
    <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${data ? cores[cor] : 'text-slate-400 bg-slate-50'}`}>
      {icon}
      <span className="font-medium">{label}:</span>
      <span>{data ? formatDateTime(data) : 'Não enviado'}</span>
      {data ? <CheckCircle2 size={11} className="ml-auto" /> : <XCircle size={11} className="ml-auto opacity-40" />}
    </div>
  )
}
