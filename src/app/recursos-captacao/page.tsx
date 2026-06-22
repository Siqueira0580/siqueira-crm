'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase'
import {
  Link2, Copy, CheckCheck, MessageCircle, Users, Inbox,
  RefreshCw, Loader2, ChevronRight, UserPlus, Trash2,
  Filter, Search, TrendingUp, Calendar, Phone, Mail,
  Home, Target, Banknote, Clock, AlertCircle, Check,
  ExternalLink, QrCode, Send, Eye, X, Bell
} from 'lucide-react'

const supabase = createClient()

/* ─── Types ─── */
interface LandingLead {
  id: string
  nome: string
  telefone: string
  email?: string
  cidade?: string
  tipo_imovel?: string
  objetivo?: string
  zona_interesse?: string
  bairro?: string
  orcamento_min?: number
  orcamento_max?: number
  quartos_desejados?: number
  perfil_comprador?: string
  urgencia?: string
  forma_pagamento?: string
  como_conheceu?: string
  mensagem?: string
  comodidades_desejadas?: string[]
  estado_civil?: string
  genero?: string
  profissao?: string
  renda_mensal?: number
  conjuge_nome?: string
  conjuge_profissao?: string
  conjuge_renda?: number
  filhos_quantidade?: number
  imovel_para_vender?: boolean
  aceite_termos: boolean
  aceite_termos_at?: string
  status: string
  created_at: string
  moradia_tipo?: string
  moradia_valor?: number
  moradia_cep?: string
  moradia_logradouro?: string
  moradia_numero?: string
  moradia_complemento?: string
  moradia_bairro?: string
  moradia_cidade?: string
  moradia_estado?: string
  corretor_id?: string | null
}

interface Corretor {
  id: string
  nome: string
}

/* ─── Helpers ─── */
function fmt(v?: number) {
  if (!v) return '—'
  return 'R$ ' + Number(v).toLocaleString('pt-BR')
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const STATUS_COLORS: Record<string, string> = {
  novo:          'bg-blue-100 text-blue-700',
  em_atendimento:'bg-amber-100 text-amber-700',
  convertido:    'bg-green-100 text-green-700',
  perdido:       'bg-red-100 text-red-700',
}
const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo', em_atendimento: 'Em atendimento', convertido: 'Convertido', perdido: 'Perdido'
}

/* ─── Botão converter ─── */
function ConvertBtn({ status, converting, onClick }: { status: string; converting: boolean; onClick: () => void }) {
  const done = status === 'convertido'
  return (
    <button
      onClick={onClick}
      disabled={done || converting}
      title={done ? 'Já convertido' : 'Converter em cliente'}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {converting && <Loader2 size={13} className="animate-spin" />}
      {!converting && done && <Check size={13} />}
      {!converting && !done && <UserPlus size={13} />}
      {converting ? 'Salvando…' : done ? 'Convertido' : 'Converter'}
    </button>
  )
}

/* ─── Badge de status ─── */
function StatusBadge({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-600'}`}
      >
        {STATUS_LABELS[status] || status}
        <ChevronRight size={10} className="rotate-90" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 bg-white rounded-xl shadow-lg border border-slate-100 p-1 min-w-[150px]">
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <button key={k} onClick={() => { onChange(k); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-50 ${status === k ? 'text-blue-600' : 'text-slate-700'}`}>
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Modal de detalhes ─── */
function LeadModal({ lead, onClose, onConvert, nomeCorretor }: { lead: LandingLead; onClose: () => void; onConvert: () => void; nomeCorretor?: string }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 p-4 sm:p-6 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800 truncate">{lead.nome}</h2>
            <p className="text-sm text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
              {fmtDate(lead.created_at)} · <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${STATUS_COLORS[lead.status]}`}>{STATUS_LABELS[lead.status]}</span>
              {nomeCorretor !== undefined && (
                <span className="text-indigo-600 font-medium">· {nomeCorretor || 'Sem corretor atribuído'}</span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg flex-shrink-0"><X size={18} /></button>
        </div>
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Section title="Contato">
            <Row label="Telefone" value={lead.telefone} icon={<Phone size={13} />} />
            <Row label="E-mail" value={lead.email} icon={<Mail size={13} />} />
            <Row label="Cidade" value={lead.cidade} icon={<Home size={13} />} />
          </Section>
          <Section title="Dados pessoais">
            <Row label="Gênero" value={lead.genero} />
            <Row label="Estado civil" value={lead.estado_civil} />
            <Row label="Profissão" value={lead.profissao} />
            <Row label="Renda" value={fmt(lead.renda_mensal)} icon={<Banknote size={13} />} />
            {lead.conjuge_nome && <Row label="Cônjuge" value={lead.conjuge_nome} />}
            {lead.conjuge_profissao && <Row label="Prof. cônjuge" value={lead.conjuge_profissao} />}
            {(lead.filhos_quantidade ?? 0) > 0 && <Row label="Filhos" value={String(lead.filhos_quantidade)} />}
          </Section>
          <Section title="Imóvel desejado">
            <Row label="Tipo" value={lead.tipo_imovel} icon={<Home size={13} />} />
            <Row label="Objetivo" value={lead.objetivo} icon={<Target size={13} />} />
            <Row label="Zona" value={lead.zona_interesse} />
            <Row label="Bairro" value={lead.bairro} />
            <Row label="Quartos" value={lead.quartos_desejados ? `${lead.quartos_desejados} qts` : undefined} />
            <Row label="Orçamento" value={lead.orcamento_min || lead.orcamento_max ? `${fmt(lead.orcamento_min)} – ${fmt(lead.orcamento_max)}` : undefined} />
          </Section>
          <Section title="Perfil comportamental">
            <Row label="Perfil" value={lead.perfil_comprador} />
            <Row label="Urgência" value={lead.urgencia} icon={<Clock size={13} />} />
            <Row label="Pagamento" value={lead.forma_pagamento} />
            <Row label="Tem imóvel p/ vender" value={lead.imovel_para_vender ? 'Sim' : 'Não'} />
            <Row label="Como conheceu" value={lead.como_conheceu} />
          </Section>
          {lead.comodidades_desejadas && lead.comodidades_desejadas.length > 0 && (
            <div className="col-span-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Comodidades desejadas</p>
              <div className="flex flex-wrap gap-2">
                {lead.comodidades_desejadas.map(c => (
                  <span key={c} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">{c}</span>
                ))}
              </div>
            </div>
          )}
          {lead.mensagem && (
            <div className="col-span-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Mensagem</p>
              <p className="text-slate-600 bg-slate-50 rounded-xl p-3 text-sm">{lead.mensagem}</p>
            </div>
          )}
        </div>
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col sm:flex-row gap-3">
          <a href={`https://wa.me/55${lead.telefone?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition-colors w-full sm:w-auto">
            <MessageCircle size={16} /> WhatsApp
          </a>
          {lead.email && (
            <a href={`mailto:${lead.email}`}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-colors w-full sm:w-auto">
              <Mail size={16} /> E-mail
            </a>
          )}
          <button onClick={onConvert}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition-colors w-full sm:w-auto sm:ml-auto">
            <UserPlus size={16} /> Converter em Cliente
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}
function Row({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  if (!value || value === '—') return null
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-slate-400 mt-0.5">{icon}</span>}
      <span className="text-slate-400 text-xs w-24 flex-shrink-0">{label}</span>
      <span className="text-slate-700 font-medium text-xs">{value}</span>
    </div>
  )
}

/* ══════════════════════════════════════════════════ */
export default function RecursosCaptacaoPage() {
  const router = useRouter()
  const [tab, setTab]           = useState<'link' | 'formulario'>('link')
  const [userId, setUserId]     = useState<string>('')
  const [userNome, setUserNome] = useState<string>('')
  const [baseUrl, setBaseUrl]   = useState('')
  const [copied, setCopied]     = useState(false)
  const [isAdmin, setIsAdmin]   = useState(false)
  const [corretores, setCorretores] = useState<Corretor[]>([])

  // Leads do formulário HTML (landing_leads)
  const [leads, setLeads]           = useState<LandingLead[]>([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [busca, setBusca]           = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroCorretor, setFiltroCorretor] = useState('todos')
  const [selectedLead, setSelectedLead] = useState<LandingLead | null>(null)
  const [converting, setConverting] = useState<string | null>(null)

  // Stats
  const [stats, setStats] = useState({ total: 0, novos: 0, convertidos: 0, mesAtual: 0 })

  // URL curta de captação — existe como rota própria (/captacao/[id]) que redireciona
  // para o formulário real; mais limpa para compartilhar do que o link direto ao .html.
  const captacaoUrl = `${baseUrl}/captacao/${userId}`

  // Notificação em tempo real
  const [toast, setToast] = useState<{ nome: string; telefone: string } | null>(null)

  /* ── Init ── */
  useEffect(() => {
    setBaseUrl(window.location.origin)
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
      const { data: profile } = await supabase.from('profiles').select('nome, role').eq('id', session.user.id).single()
      setUserNome(profile?.nome || 'Corretor')

      const admin = profile?.role === 'admin'
      setIsAdmin(admin)

      // Admin precisa da lista de corretores para filtrar e atribuir leads sem dono
      if (admin) {
        const { data: todosPerfis } = await supabase.from('profiles').select('id, nome').order('nome')
        setCorretores((todosPerfis || []) as Corretor[])
      }
    }
    init()
  }, [router])

  /* ── Load leads do formulário ── */
  // Admin vê os leads de todos os corretores (inclusive os ainda sem corretor atribuído);
  // corretor comum vê só os seus — a própria política de RLS no banco já garante isso,
  // este filtro aqui é só para não pedir linhas que o corretor nem teria acesso.
  const loadLeads = useCallback(async () => {
    if (!userId) return
    setLoadingLeads(true)
    let query = supabase.from('landing_leads').select('*').order('created_at', { ascending: false })
    if (!isAdmin) query = query.eq('corretor_id', userId)
    const { data } = await query
    setLeads((data || []) as LandingLead[])
    // Calcular stats
    const all = (data || []) as LandingLead[]
    const mesAtual = new Date(); mesAtual.setDate(1); mesAtual.setHours(0,0,0,0)
    setStats({
      total:      all.length,
      novos:      all.filter(l => l.status === 'novo').length,
      convertidos:all.filter(l => l.status === 'convertido').length,
      mesAtual:   all.filter(l => new Date(l.created_at) >= mesAtual).length,
    })
    setLoadingLeads(false)
  }, [userId, isAdmin])

  useEffect(() => { if (tab === 'formulario' && userId) loadLeads() }, [tab, userId, loadLeads])

  // Realtime: alerta ao receber novo lead (admin recebe de todos; corretor só do seu)
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('new-leads-' + userId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'landing_leads',
        ...(isAdmin ? {} : { filter: `corretor_id=eq.${userId}` }),
      }, (payload) => {
        const lead = payload.new as { nome: string; telefone: string }
        setToast({ nome: lead.nome, telefone: lead.telefone })
        setLeads(prev => [payload.new as any, ...prev])
        setStats(prev => ({ ...prev, total: prev.total + 1, novos: prev.novos + 1,
          mesAtual: prev.mesAtual + 1 }))
        setTimeout(() => setToast(null), 6000)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, isAdmin])

  /* ── Copiar link ── */
  const copyLink = () => {
    navigator.clipboard.writeText(captacaoUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  /* ── Compartilhar WhatsApp ── */
  const shareWhatsApp = () => {
    const msg = `Olá! Sou ${userNome} da Siqueira Inteligência Imobiliária.\n\nPreencha nosso formulário para encontrarmos o imóvel ideal para você:\n👇\n${captacaoUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  /* ── Admin: atribuir lead sem corretor a um corretor ── */
  const assignCorretor = async (leadId: string, corretorId: string) => {
    if (!corretorId) return
    await (supabase.from('landing_leads') as any).update({ corretor_id: corretorId }).eq('id', leadId)
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, corretor_id: corretorId } : l))
  }

  /* ── Atualizar status ── */
  const updateStatus = async (id: string, status: string) => {
    await (supabase.from('landing_leads') as any).update({ status }).eq('id', id)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    if (selectedLead?.id === id) setSelectedLead(prev => prev ? { ...prev, status } : prev)
  }

  /* ── Converter lead em cliente ── */
  const convertToClient = async (lead: LandingLead) => {
    if (!userId) return
    setConverting(lead.id)
    try {
      const { error } = await supabase.from('clientes').insert({
        user_id:           userId,
        nome:              lead.nome,
        telefone:          lead.telefone || null,
        email:             lead.email || null,
        cidade:            lead.cidade || null,
        tipo_imovel:       lead.tipo_imovel || null,
        objetivo:          lead.objetivo === 'comprar' ? 'morar' : (lead.objetivo as any) || null,
        zona_interesse:    lead.zona_interesse || null,
        orcamento_min:     lead.orcamento_min || null,
        orcamento_max:     lead.orcamento_max || null,
        quartos_desejados: lead.quartos_desejados || null,
        perfil_comprador:  lead.perfil_comprador || null,
        estado_civil:      lead.estado_civil || null,
        genero:            lead.genero || null,
        profissao:         lead.profissao || null,
        faixa_renda:       lead.renda_mensal || null,
        conjuge_profissao: lead.conjuge_profissao || null,
        conjuge_renda:     lead.conjuge_renda || null,
        filhos_quantidade: lead.filhos_quantidade || 0,
        aceite_termos:        lead.aceite_termos,
        aceite_termos_at:     lead.aceite_termos_at || null,
        notas:                lead.mensagem || null,
        etapa_funil:          'contato_iniciado',
        origem:               'Formulário Web',
        moradia_atual_tipo:   lead.moradia_tipo || null,
        moradia_atual_valor:  lead.moradia_valor || null,
        moradia_cep:          lead.moradia_cep || null,
        moradia_logradouro:   lead.moradia_logradouro || null,
        moradia_numero:       lead.moradia_numero || null,
        moradia_complemento:  lead.moradia_complemento || null,
        moradia_bairro:       lead.moradia_bairro || null,
        moradia_cidade:       lead.moradia_cidade || null,
        moradia_estado:       lead.moradia_estado || null,
        necessidades:      lead.comodidades_desejadas || [],
        historico: [
          { data: new Date().toISOString(), tipo: 'sistema', descricao: 'Convertido de lead do formulário de captação' },
          ...(lead.mensagem ? [{ data: new Date().toISOString(), tipo: 'nota', descricao: lead.mensagem }] : []),
        ],
      })
      if (error) throw error
      await updateStatus(lead.id, 'convertido')
      setSelectedLead(null)
      alert(`✅ ${lead.nome} foi adicionado à sua carteira de clientes!`)
    } catch (e: any) {
      alert('Erro ao converter: ' + (e.message || e))
    } finally {
      setConverting(null)
    }
  }

  /* ── Filtrar leads ── */
  const leadsFiltrados = leads.filter(l => {
    const okStatus = filtroStatus === 'todos' || l.status === filtroStatus
    const okCorretor = !isAdmin || filtroCorretor === 'todos'
      || (filtroCorretor === 'sem_corretor' ? !l.corretor_id : l.corretor_id === filtroCorretor)
    const q  = busca.toLowerCase()
    const match = !busca || l.nome.toLowerCase().includes(q) || (l.telefone || '').includes(q) || (l.email || '').toLowerCase().includes(q)
    return okStatus && okCorretor && match
  })

  const nomeCorretor = (id?: string | null) => corretores.find(c => c.id === id)?.nome || ''

  /* ══ RENDER ══ */
  return (
    <AppLayout title="Recursos de Captação">
      <div className="p-4 sm:p-6 max-w-6xl mx-auto overflow-x-hidden">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Send size={22} className="text-blue-600" /> Recursos para Captação
          </h1>
          <p className="text-slate-500 text-sm mt-1">Envie seu formulário, acompanhe os leads e converta-os em clientes.</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: isAdmin ? 'Total leads (todos)' : 'Total leads (formulário)', value: stats.total, Icon: Inbox, color: 'text-blue-600 bg-blue-50' },
            { label: 'Novos (aguardando)',        value: stats.novos,       Icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
            { label: 'Convertidos',               value: stats.convertidos, Icon: Check,       color: 'text-green-600 bg-green-50' },
            { label: 'Leads este mês',            value: stats.mesAtual,    Icon: Calendar,    color: 'text-purple-600 bg-purple-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                <s.Icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 max-w-full overflow-x-auto">
          {([
            { key: 'link',       labelShort: 'Meu Link', labelFull: 'Meu Link de Captação',           TabIcon: Link2 },
            { key: 'formulario', labelShort: isAdmin ? 'Leads' : 'Meus Leads', labelFull: isAdmin ? 'Todos os Leads' : 'Meus Leads', TabIcon: isAdmin ? Users : Inbox },
          ] as const).map(({ key, labelShort, labelFull, TabIcon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                tab === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <TabIcon size={15} />
              <span className="sm:hidden">{labelShort}</span>
              <span className="hidden sm:inline">{labelFull}</span>
            </button>
          ))}
        </div>

        {/* ──────── TAB: MEU LINK ──────── */}
        {tab === 'link' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Link box */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-1">
                <Link2 size={18} className="text-blue-600" />
                <h2 className="font-semibold text-slate-800">Seu link personalizado</h2>
              </div>
              <p className="text-sm text-slate-500 mb-4">Compartilhe este link com seus clientes para que preencham o formulário de captação.</p>

              {userId ? (
                <>
                  <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <div className="min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-700 font-mono break-all">
                      {captacaoUrl}
                    </div>
                    <button onClick={copyLink}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
                        copied ? 'bg-green-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
                      }`}>
                      {copied ? <><CheckCheck size={15} /> Copiado!</> : <><Copy size={15} /> Copiar</>}
                    </button>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <button onClick={shareWhatsApp}
                      className="flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors">
                      <MessageCircle size={16} className="flex-shrink-0" /> <span className="truncate">Compartilhar via WhatsApp</span>
                    </button>
                    <a href={captacaoUrl} target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full px-3 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors">
                      <ExternalLink size={14} className="flex-shrink-0" /> <span className="truncate">Visualizar formulário</span>
                    </a>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-24">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                </div>
              )}
            </div>

            {/* Instruções */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-purple-500" /> Como usar
              </h2>
              <ol className="space-y-4">
                {[
                  { n: '1', title: 'Copie seu link', desc: 'Cada corretor tem um link único com seu ID. Quando o cliente preenche, o lead já chega identificado como seu.' },
                  { n: '2', title: 'Compartilhe com o cliente', desc: 'Envie por WhatsApp, Instagram, e-mail ou cole no bio do Instagram.' },
                  { n: '3', title: 'Acompanhe aqui', desc: 'Os leads aparecem na aba "Meus Leads", com perfil comportamental completo, LGPD e tudo.' },
                  { n: '4', title: 'Converta em cliente', desc: 'Na aba "Meus Leads", clique em "Converter" para adicionar o lead diretamente à sua carteira de clientes.' },
                ].map(s => (
                  <li key={s.n} className="flex gap-3">
                    <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{s.n}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{s.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* ──────── TAB: LEADS DO FORMULÁRIO ──────── */}
        {tab === 'formulario' && (
          <div>
            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 min-w-[200px]">
                <Search size={15} className="text-slate-400" />
                <input value={busca} onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar por nome, telefone ou e-mail…"
                  className="flex-1 text-sm outline-none bg-transparent placeholder-slate-400" />
              </div>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700 outline-none">
                <option value="todos">Todos os status</option>
                <option value="novo">Novos</option>
                <option value="em_atendimento">Em atendimento</option>
                <option value="convertido">Convertidos</option>
                <option value="perdido">Perdidos</option>
              </select>
              {isAdmin && (
                <select value={filtroCorretor} onChange={e => setFiltroCorretor(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-700 outline-none">
                  <option value="todos">Todos os corretores</option>
                  <option value="sem_corretor">Sem corretor atribuído</option>
                  {corretores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              )}
              <button onClick={loadLeads} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-600 hover:bg-slate-50">
                <RefreshCw size={14} className={loadingLeads ? 'animate-spin' : ''} /> Atualizar
              </button>
            </div>

            {loadingLeads ? (
              <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
            ) : leadsFiltrados.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Inbox size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum lead encontrado</p>
                <p className="text-sm mt-1">Compartilhe o formulário de captação para receber leads.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leadsFiltrados.map(lead => (
                  <div key={lead.id}
                    className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:shadow-sm transition-shadow">

                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-700 font-bold text-sm">
                        {lead.nome[0]?.toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-800 text-sm">{lead.nome}</span>
                          <StatusBadge status={lead.status} onChange={s => updateStatus(lead.id, s)} />
                          {isAdmin && (
                            lead.corretor_id ? (
                              <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700">
                                {nomeCorretor(lead.corretor_id) || 'Corretor'}
                              </span>
                            ) : (
                              <select
                                defaultValue=""
                                onChange={e => assignCorretor(lead.id, e.target.value)}
                                className="px-2 py-0.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 outline-none max-w-[140px]"
                              >
                                <option value="" disabled>Atribuir a…</option>
                                {corretores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                              </select>
                            )
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                          {lead.telefone && <span className="flex items-center gap-1"><Phone size={11} /> {lead.telefone}</span>}
                          {lead.email && <span className="flex items-center gap-1 truncate max-w-[180px]"><Mail size={11} className="flex-shrink-0" /> {lead.email}</span>}
                          {lead.tipo_imovel && <span className="flex items-center gap-1"><Home size={11} /> {lead.tipo_imovel}</span>}
                          {(lead.orcamento_min || lead.orcamento_max) && (
                            <span className="flex items-center gap-1"><Banknote size={11} /> {fmt(lead.orcamento_min)} – {fmt(lead.orcamento_max)}</span>
                          )}
                          <span className="flex items-center gap-1"><Calendar size={11} /> {fmtDate(lead.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                      <button onClick={() => setSelectedLead(lead)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors" title="Ver detalhes">
                        <Eye size={16} />
                      </button>
                      <a href={`https://wa.me/55${lead.telefone?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                        className="p-2 hover:bg-green-50 rounded-lg text-slate-500 hover:text-green-600 transition-colors" title="WhatsApp">
                        <MessageCircle size={16} />
                      </a>
                      <ConvertBtn
                        status={lead.status}
                        converting={converting === lead.id}
                        onClick={() => convertToClient(lead)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal detalhes */}
      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onConvert={() => { const l = selectedLead; if (l) convertToClient(l) }}
          nomeCorretor={isAdmin ? nomeCorretor(selectedLead.corretor_id) : undefined}
        />
      )}
      {/* ── Toast: novo lead em tempo real ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#1e293b', color: '#fff', borderRadius: 16,
          padding: '16px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', gap: 14, maxWidth: 340,
          animation: 'slideIn .3s ease',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Bell size={18} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>Novo lead recebido! 🎉</p>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '2px 0 0', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {toast.nome} · {toast.telefone}
            </p>
          </div>
          <button onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', color: '#64748b',
              cursor: 'pointer', padding: 4, flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
      )}
      <style>{`@keyframes slideIn { from { transform: translateY(20px); opacity:0 } to { transform:none; opacity:1 } }`}</style>
    </AppLayout>
  )
}
