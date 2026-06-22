'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Modal from '@/components/ui/Modal'
import ClienteForm from '@/components/clientes/ClienteForm'
import SimuladorCompra from '@/components/clientes/SimuladorCompra'
import { createClient } from '@/lib/supabase'
import { calcularMatch, getMatchLabel } from '@/lib/matching'
import { atualizarPipelineCliente } from '@/lib/pipeline'
import {
  formatCurrency, formatDateTime,
  ETAPAS_FUNIL, CLASSE_LABELS, PERFIL_LABELS, STATUS_IMOVEL
} from '@/lib/utils'
import type { Cliente, Imovel, Visita, Matching } from '@/types'
import WhatsAppButton from '@/components/whatsapp/WhatsAppButton'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import {
  ArrowLeft, Edit2, Phone, Mail, MapPin,
  Building2, CalendarCheck, Brain, Plus, Zap, Home, Target, ArrowRightLeft, Sparkles,
  User, Heart, Baby, BedDouble, CreditCard, Calculator
} from 'lucide-react'

const supabase = createClient()

interface AnaliseItem {
  id: string
  score: number | null
  temperatura: string | null
  modo: string
  created_at: string
}

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [matchings, setMatchings] = useState<Matching[]>([])
  const [imoveisDisponiveis, setImoveisDisponiveis] = useState<Imovel[]>([])
  const [analises, setAnalises] = useState<AnaliseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [simuladorOpen, setSimuladorOpen] = useState(false)
  const [nota, setNota] = useState('')
  const [tipoNota, setTipoNota] = useState<'nota' | 'ligacao' | 'email' | 'proposta'>('nota')
  const [addingNota, setAddingNota] = useState(false)

  useEffect(() => { if (id) loadData() }, [id])

  const loadData = async () => {
    const [{ data: clienteData }, { data: visitasData }, { data: imoveisData }, { data: analisesData }] = await Promise.all([
      supabase.from('clientes').select('*').eq('id', id).single(),
      supabase.from('visitas').select('*, imoveis(titulo, valor, tipo, status)').eq('cliente_id', id).order('data_hora'),
      supabase.from('imoveis').select('*').eq('status', 'disponivel').limit(20),
      supabase.from('analises_comportamento').select('id, score, temperatura, modo, created_at').eq('cliente_id', id).order('created_at'),
    ])

    if (clienteData) {
      setCliente(clienteData as any)
      if (imoveisData) {
        setImoveisDisponiveis(imoveisData as any)
        const results = imoveisData
          .map((imovel: any) => ({ ...calcularMatch(clienteData as any, imovel), imovel_id: imovel.id, imovel, cliente_id: id, id: imovel.id, created_at: '' }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 6)
        setMatchings(results as any)
      }
    }

    setVisitas(visitasData || [])
    setAnalises((analisesData || []) as AnaliseItem[])
    setLoading(false)
  }

  const adicionarNota = async () => {
    if (!nota.trim() || !cliente) return
    setAddingNota(true)

    // Mapeamento tipo -> etapa do pipeline
    const avancoAutomatico: Record<string, { etapa: any; descricao: string } | null> = {
      ligacao: { etapa: 'contato_iniciado', descricao: 'Ligacao registrada pelo corretor' },
      email:   { etapa: 'contato_iniciado', descricao: 'Email registrado pelo corretor' },
      proposta:{ etapa: 'proposta_enviada',  descricao: 'Proposta registrada pelo corretor' },
      nota: null,
    }

    const newHistorico = [
      ...(cliente.historico || []),
      { data: new Date().toISOString(), tipo: tipoNota as any, descricao: nota }
    ]
    await supabase.from('clientes').update({ historico: newHistorico }).eq('id', id)
    setCliente(prev => prev ? { ...prev, historico: newHistorico as any } : prev)

    // Avanco automatico de pipeline
    const avanco = avancoAutomatico[tipoNota]
    if (avanco) {
      const ok = await atualizarPipelineCliente(id, avanco.etapa, avanco.descricao)
      if (ok) {
        // Atualiza etapa local
        setCliente(prev => prev ? { ...prev, etapa_funil: avanco.etapa } : prev)
      }
    }

    setNota('')
    setTipoNota('nota')
    setAddingNota(false)
  }

  if (loading) return <AppLayout title="Cliente"><div className="text-center py-16 text-slate-400">Carregando...</div></AppLayout>
  if (!cliente) return <AppLayout title="Cliente"><div className="text-center py-16 text-slate-400">Cliente não encontrado.</div></AppLayout>

  const etapa = ETAPAS_FUNIL[cliente.etapa_funil]

  return (
    <AppLayout title={cliente.nome}>
      <div className="space-y-6 max-w-6xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="btn-secondary p-2">
              <ArrowLeft size={18} />
            </button>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
              {cliente.nome.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{cliente.nome}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`badge text-white text-xs ${etapa?.color}`}>{etapa?.label}</span>
                {cliente.score_potencial !== undefined && (
                  <span className="badge bg-green-50 text-green-700 text-xs">Score {cliente.score_potencial}%</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {cliente.telefone && (
              <WhatsAppButton cliente={cliente} />
            )}
            <button
              onClick={() => router.push(`/analise-comportamento?cliente_id=${id}&cliente_nome=${encodeURIComponent(cliente.nome)}`)}
              className="btn-primary"
            >
              <Sparkles size={16} /> Análise IA
            </button>
            <button onClick={() => setSimuladorOpen(true)} className="btn-secondary">
              <Calculator size={16} /> Simular compra
            </button>
            <button onClick={() => setEditOpen(true)} className="btn-secondary">
              <Edit2 size={16} /> Editar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Col 1: Info */}
          <div className="xl:col-span-1 space-y-5">

            {/* Contato */}
            <div className="card">
              <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Phone size={16} /> Contato
              </h3>
              <div className="space-y-2 text-sm">
                {cliente.telefone && <div className="flex items-center gap-2 text-slate-600"><Phone size={14} />{cliente.telefone}</div>}
                {cliente.email && <div className="flex items-center gap-2 text-slate-600"><Mail size={14} />{cliente.email}</div>}
                {/* Endereço completo */}
                {(cliente.logradouro || cliente.cidade) && (
                  <div className="flex items-start gap-2 text-slate-600">
                    <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      {/* Badge de tipo de endereço */}
                      {cliente.endereco_tipo && cliente.endereco_tipo !== 'residencial_atual' && (
                        <span className="inline-block text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 mb-1">
                          {cliente.endereco_tipo === 'veraneio' ? '🏖️ Veraneio' : '📍 Outro'}
                        </span>
                      )}
                      {cliente.logradouro && (
                        <p>{cliente.logradouro}{cliente.numero ? `, ${cliente.numero}` : ''}{cliente.complemento ? ` — ${cliente.complemento}` : ''}</p>
                      )}
                      {cliente.bairro && <p className="text-slate-500">{cliente.bairro}</p>}
                      {(cliente.cidade || cliente.estado) && (
                        <p>{[cliente.cidade, cliente.estado].filter(Boolean).join(' — ')}{cliente.cep ? ` · ${cliente.cep}` : ''}</p>
                      )}
                      {/* Situação da moradia */}
                      {cliente.moradia_atual_tipo && (
                        <p className="text-slate-400 text-xs mt-0.5">
                          {cliente.moradia_atual_tipo === 'alugado' ? `Alugado${cliente.moradia_atual_valor ? ` · R$ ${cliente.moradia_atual_valor}/mês` : ''}`
                            : cliente.moradia_atual_tipo === 'proprio' ? 'Próprio (quitado)'
                            : cliente.moradia_atual_tipo === 'financiado' ? 'Financiado'
                            : cliente.moradia_atual_tipo === 'familiar' ? 'Casa de familiar'
                            : 'Outro'}
                          {cliente.possui_outros_imoveis && ' · Possui outros imóveis'}
                        </p>
                      )}
                      {/* Cômodos e características */}
                      {(cliente.moradia_quartos || cliente.moradia_suites || cliente.moradia_banheiros || cliente.moradia_salas || cliente.moradia_cozinhas || cliente.moradia_varandas || cliente.moradia_vagas_garagem || cliente.moradia_quintal || cliente.moradia_area_servico || cliente.moradia_home_office || cliente.moradia_piscina || cliente.moradia_area_gourmet) ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {!!cliente.moradia_quartos      && <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">🛏️ {cliente.moradia_quartos}</span>}
                          {!!cliente.moradia_suites       && <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 rounded-full px-2 py-0.5">🛁 {cliente.moradia_suites} suíte{cliente.moradia_suites > 1 ? 's' : ''}</span>}
                          {!!cliente.moradia_banheiros    && <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">🚿 {cliente.moradia_banheiros}</span>}
                          {!!cliente.moradia_salas        && <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">🛋️ {cliente.moradia_salas}</span>}
                          {!!cliente.moradia_cozinhas     && <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">🍳 {cliente.moradia_cozinhas}</span>}
                          {!!cliente.moradia_varandas     && <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">🌿 {cliente.moradia_varandas}</span>}
                          {!!cliente.moradia_vagas_garagem && <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">🚗 {cliente.moradia_vagas_garagem}</span>}
                          {cliente.moradia_quintal      && <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 rounded-full px-2 py-0.5">🌳 Quintal</span>}
                          {cliente.moradia_area_servico && <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">🧺 Área serviço</span>}
                          {cliente.moradia_home_office  && <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5">💻 Home office</span>}
                          {cliente.moradia_piscina      && <span className="inline-flex items-center gap-1 text-xs bg-cyan-50 text-cyan-700 rounded-full px-2 py-0.5">🏊 Piscina</span>}
                          {cliente.moradia_area_gourmet && <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 rounded-full px-2 py-0.5">🍖 Área gourmet</span>}
                        </div>
                      ) : null}
                      {cliente.moradia_observacao && <p className="text-slate-400 text-xs">{cliente.moradia_observacao}</p>}
                      {cliente.zona_interesse && <p className="text-slate-400 text-xs">Zona {cliente.zona_interesse}</p>}
                    </div>
                  </div>
                )}
                {!cliente.logradouro && !cliente.cidade && cliente.zona_interesse && (
                  <div className="flex items-center gap-2 text-slate-600"><MapPin size={14} />Zona {cliente.zona_interesse}</div>
                )}
                {(cliente.cpf || cliente.rg) && (
                  <div className="pt-2 mt-2 border-t border-slate-100 space-y-1.5">
                    {cliente.cpf && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-500"><CreditCard size={14} />CPF</span>
                        <span className="font-mono text-slate-700 text-xs tracking-wide">{cliente.cpf}</span>
                      </div>
                    )}
                    {cliente.rg && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-500"><CreditCard size={14} />RG</span>
                        <span className="font-mono text-slate-700 text-xs tracking-wide">{cliente.rg}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Perfil Inteligente */}
            <div className="card">
              <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Brain size={16} /> Perfil Inteligente
              </h3>
              <div className="space-y-2">
                {cliente.classe_economica && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Classe</span>
                    <span className={`badge ${CLASSE_LABELS[cliente.classe_economica]?.color}`}>
                      {CLASSE_LABELS[cliente.classe_economica]?.label}
                    </span>
                  </div>
                )}
                {cliente.perfil_comprador && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Perfil</span>
                    <span className="badge bg-indigo-50 text-indigo-700">
                      {PERFIL_LABELS[cliente.perfil_comprador]?.icon} {PERFIL_LABELS[cliente.perfil_comprador]?.label}
                    </span>
                  </div>
                )}
                {cliente.faixa_renda && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Renda</span>
                    <span className="font-medium">{formatCurrency(cliente.faixa_renda)}/mês</span>
                  </div>
                )}
                {cliente.score_potencial !== undefined && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-500">Score Potencial</span>
                      <span className="font-semibold text-green-600">{cliente.score_potencial}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${cliente.score_potencial}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dados Pessoais */}
            {(cliente.estado_civil || cliente.data_nascimento || cliente.cidade_nascimento || (cliente.filhos_quantidade && cliente.filhos_quantidade > 0)) && (
              <div className="card">
                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <User size={16} /> Dados Pessoais
                </h3>
                <div className="space-y-2 text-sm">
                  {cliente.estado_civil && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 flex items-center gap-1"><Heart size={12} /> Estado civil</span>
                      <span className="font-medium capitalize">
                        {cliente.estado_civil === 'uniao_estavel' ? 'União Estável'
                          : cliente.estado_civil === 'viuvo' ? 'Viúvo(a)'
                          : cliente.estado_civil.charAt(0).toUpperCase() + cliente.estado_civil.slice(1)}
                      </span>
                    </div>
                  )}
                  {cliente.data_nascimento && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nascimento</span>
                      <span>{new Date(cliente.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                        {cliente.cidade_nascimento && ` · ${cliente.cidade_nascimento}${cliente.estado_nascimento ? `/${cliente.estado_nascimento}` : ''}`}
                      </span>
                    </div>
                  )}
                  {(cliente.conjuge_nome || cliente.conjuge_profissao) && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cônjuge</span>
                      <span className="text-right">
                        {cliente.conjuge_nome}{cliente.conjuge_profissao && ` · ${cliente.conjuge_profissao}`}
                        {cliente.conjuge_renda && <span className="block text-xs text-slate-400">{formatCurrency(cliente.conjuge_renda)}/mês</span>}
                      </span>
                    </div>
                  )}
                  {cliente.filhos_quantidade != null && cliente.filhos_quantidade > 0 && (
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-500 flex items-center gap-1"><Baby size={12} /> Filhos</span>
                        <span>{cliente.filhos_quantidade}</span>
                      </div>
                      {cliente.filhos_detalhes && cliente.filhos_detalhes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {cliente.filhos_detalhes.map((f, i) => (
                            <span key={i} className="badge bg-pink-50 text-pink-700 text-xs">
                              {f.genero === 'menina' ? '👧' : f.genero === 'menino' ? '👦' : '🧒'}
                              {f.nome ? ` ${f.nome}` : ` Filho ${i + 1}`}
                              {f.idade != null ? `, ${f.idade}a` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Score IA */}
            {analises.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-500" /> Evolução do Lead Score IA
                </h3>
                {analises.filter(a => a.score != null).length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-2xl font-bold text-slate-800">
                          {analises.filter(a => a.score != null).slice(-1)[0]?.score}
                          <span className="text-sm font-normal text-slate-400 ml-1">/ 100</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          {analises.filter(a => a.score != null).slice(-1)[0]?.temperatura} — {analises.length} análise{analises.length > 1 ? 's' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => router.push(`/analise-comportamento?cliente_id=${id}&cliente_nome=${encodeURIComponent(cliente!.nome)}`)}
                        className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <Sparkles size={11} /> Nova análise
                      </button>
                    </div>
                    <ResponsiveContainer width="100%" height={80}>
                      <LineChart data={analises.filter(a => a.score != null).map(a => ({
                        data: new Date(a.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                        score: a.score,
                      }))}>
                        <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} hide />
                        <Tooltip
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                          formatter={(v: any) => [`${v} pts`, 'Score']}
                        />
                        <ReferenceLine y={70} stroke="#22c55e" strokeDasharray="3 3" />
                        <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-slate-400 mt-1">— Verde: Quente (70+) · — Amarelo: Morno (40+)</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">Score ainda não calculado nas análises.</p>
                )}
              </div>
            )}

            {/* Preferências */}
            <div className="card">
              <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Target size={16} /> Preferências
              </h3>
              <div className="space-y-2 text-sm">
                {cliente.tipo_imovel && <div className="flex justify-between"><span className="text-slate-500">Tipo</span><span className="capitalize">{cliente.tipo_imovel}</span></div>}
                {cliente.objetivo && <div className="flex justify-between"><span className="text-slate-500">Objetivo</span><span className="capitalize">{cliente.objetivo}</span></div>}
                {cliente.quartos_desejados && <div className="flex justify-between"><span className="text-slate-500">Quartos</span><span>{cliente.quartos_desejados}+</span></div>}
                {(cliente.orcamento_min || cliente.orcamento_max) && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Orçamento</span>
                    <span className="text-right">
                      {cliente.orcamento_min ? formatCurrency(cliente.orcamento_min) : 'Sem min'}
                      {' — '}
                      {cliente.orcamento_max ? formatCurrency(cliente.orcamento_max) : 'Sem max'}
                    </span>
                  </div>
                )}
                {cliente.necessidades && cliente.necessidades.length > 0 && (
                  <div>
                    <span className="text-slate-500">Necessidades</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {cliente.necessidades.map(n => (
                        <span key={n} className="badge bg-slate-100 text-slate-600 text-xs">{n}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Col 2+3 */}
          <div className="xl:col-span-2 space-y-5">

            {/* Imóveis Recomendados */}
            <div className="card">
              <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Zap size={16} className="text-amber-500" /> Imóveis Recomendados
              </h3>
              {matchings.length === 0 ? (
                <p className="text-sm text-slate-400">Cadastre imóveis disponíveis para ver recomendações.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {matchings.map(m => {
                    const match = getMatchLabel(m.score)
                    return (
                      <a key={m.id} href={`/imoveis/${m.imovel_id}`}
                        className="border border-slate-200 rounded-xl p-3 hover:border-blue-300 hover:bg-blue-50 transition-all block">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{(m as any).imovel?.titulo}</p>
                            <p className="text-xs text-slate-500">{(m as any).imovel?.tipo} • {(m as any).imovel?.quartos} qtos</p>
                            <p className="text-sm font-semibold text-blue-600 mt-1">{formatCurrency((m as any).imovel?.valor)}</p>
                          </div>
                          <div className={`badge text-xs font-semibold whitespace-nowrap ${match.color}`}>
                            {m.score}% — {match.label}
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${m.score}%` }} />
                        </div>
                      </a>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Visitas */}
            <div className="card">
              <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <CalendarCheck size={16} /> Visitas ({visitas.length})
              </h3>
              {visitas.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma visita registrada.</p>
              ) : (
                <div className="space-y-2">
                  {visitas.map((v: any) => (
                    <div key={v.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg text-sm">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${v.status === 'realizado' ? 'bg-green-500' : v.status === 'cancelado' ? 'bg-red-400' : 'bg-blue-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-700 truncate">{v.imoveis?.titulo}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(v.data_hora)}</p>
                      </div>
                      <span className={`badge text-xs ${v.status === 'realizado' ? 'bg-green-100 text-green-700' : v.status === 'cancelado' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {v.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Histórico / Notas */}
            <div className="card">
              <h3 className="font-semibold text-slate-700 mb-3">Histórico de Interações</h3>
              <div className="space-y-2 mb-4">
                <div className="flex gap-1">
                  {(['nota','ligacao','email','proposta'] as const).map(t => {
                    const labels: Record<string, string> = { nota: 'Nota', ligacao: 'Ligacao', email: 'Email', proposta: 'Proposta' }
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipoNota(t)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${tipoNota === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
                      >
                        {labels[t]}
                      </button>
                    )
                  })}
                </div>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder={tipoNota === 'ligacao' ? 'Resumo da ligacao...' : tipoNota === 'email' ? 'Assunto ou resumo do email...' : tipoNota === 'proposta' ? 'Detalhes da proposta...' : 'Adicionar nota...'}
                    value={nota}
                    onChange={e => setNota(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && adicionarNota()}
                  />
                  <button onClick={adicionarNota} disabled={addingNota} className="btn-primary">
                    <Plus size={16} />
                  </button>
                </div>
                {(tipoNota === 'ligacao' || tipoNota === 'email' || tipoNota === 'proposta') && (
                  <p className="text-xs text-blue-600">Pipeline sera atualizado automaticamente ao salvar</p>
                )}
              </div>
              {(!cliente.historico || cliente.historico.length === 0) ? (
                <p className="text-sm text-slate-400">Nenhuma interação registrada.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {[...cliente.historico].reverse().map((h, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      {h.tipo === 'sistema' ? (
                        <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <ArrowRightLeft size={10} className="text-amber-600" />
                        </div>
                      ) : (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {h.tipo !== 'sistema' && h.tipo !== 'nota' && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium
                              ${h.tipo === 'ligacao' ? 'bg-green-100 text-green-700' : ''}
                              ${h.tipo === 'email' ? 'bg-blue-100 text-blue-700' : ''}
                              ${h.tipo === 'proposta' ? 'bg-amber-100 text-amber-700' : ''}
                              ${h.tipo === 'visita' ? 'bg-indigo-100 text-indigo-700' : ''}
                            `}>{h.tipo}</span>
                          )}
                        </div>
                        <p className={h.tipo === 'sistema' ? 'text-slate-500 italic' : 'text-slate-700'}>{h.descricao}</p>
                        <p className="text-xs text-slate-400">{formatDateTime(h.data)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {cliente.notas && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-1">Notas gerais</p>
                  <p className="text-sm text-slate-600">{cliente.notas}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Editar Cliente" size="xl">
        <ClienteForm
          cliente={cliente}
          onSuccess={() => { setEditOpen(false); loadData() }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      <Modal isOpen={simuladorOpen} onClose={() => setSimuladorOpen(false)} title="Simulador de Compra" size="lg">
        <SimuladorCompra
          cliente={cliente}
          imoveis={imoveisDisponiveis}
          onClose={() => setSimuladorOpen(false)}
          onPropostaCriada={loadData}
        />
      </Modal>
    </AppLayout>
  )
}
