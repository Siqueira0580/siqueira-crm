'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase'
import { ETAPAS_FUNIL, formatCurrency, whatsappLink } from '@/lib/utils'
import { atualizarPipelineCliente, ETAPA_ORDEM } from '@/lib/pipeline'
import type { Cliente, EtapaFunil } from '@/types'
import {
  MessageCircle, User, ChevronRight,
  CheckCircle2, XCircle, AlertTriangle, Zap, RefreshCw, Building2
} from 'lucide-react'

const ETAPAS_ORDER: EtapaFunil[] = [
  'lead_novo','contato_iniciado','visita_agendada',
  'proposta_enviada','negociacao','fechado','perdido'
]

const supabase = createClient()

// Acoes rapidas por etapa
const ACOES_RAPIDAS: Record<EtapaFunil, {
  etapa: EtapaFunil; label: string; color: string; descricao: string; confirmarPerda?: boolean
}[]> = {
  lead_novo: [
    { etapa: 'contato_iniciado', label: 'Iniciar Contato', color: 'text-blue-700 bg-blue-50 hover:bg-blue-100', descricao: 'Contato iniciado pelo corretor' },
    { etapa: 'perdido', label: 'Desqualificar', color: 'text-red-600 bg-red-50 hover:bg-red-100', descricao: 'Lead desqualificado', confirmarPerda: true },
  ],
  contato_iniciado: [
    { etapa: 'visita_agendada', label: 'Agendar Visita', color: 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100', descricao: 'Visita agendada com o cliente' },
    { etapa: 'perdido', label: 'Sem Resposta', color: 'text-red-600 bg-red-50 hover:bg-red-100', descricao: 'Cliente sem resposta', confirmarPerda: true },
  ],
  visita_agendada: [
    { etapa: 'proposta_enviada', label: 'Enviar Proposta', color: 'text-amber-700 bg-amber-50 hover:bg-amber-100', descricao: 'Proposta comercial enviada apos visita' },
    { etapa: 'contato_iniciado', label: 'Remarcar', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100', descricao: 'Visita remarcada - aguardando nova data' },
    { etapa: 'perdido', label: 'Nao Compareceu', color: 'text-red-600 bg-red-50 hover:bg-red-100', descricao: 'Cliente nao compareceu a visita', confirmarPerda: true },
  ],
  proposta_enviada: [
    { etapa: 'negociacao', label: 'Em Negociacao', color: 'text-orange-700 bg-orange-50 hover:bg-orange-100', descricao: 'Cliente entrou em negociacao apos proposta' },
    { etapa: 'perdido', label: 'Proposta Recusada', color: 'text-red-600 bg-red-50 hover:bg-red-100', descricao: 'Proposta recusada pelo cliente', confirmarPerda: true },
  ],
  negociacao: [
    { etapa: 'fechado', label: 'Fechar Negocio', color: 'text-green-700 bg-green-50 hover:bg-green-100', descricao: 'Negociacao concluida com sucesso - venda fechada' },
    { etapa: 'perdido', label: 'Negociacao Perdida', color: 'text-red-600 bg-red-50 hover:bg-red-100', descricao: 'Negociacao encerrada sem acordo', confirmarPerda: true },
  ],
  fechado: [],
  perdido: [
    { etapa: 'contato_iniciado', label: 'Reativar Lead', color: 'text-blue-700 bg-blue-50 hover:bg-blue-100', descricao: 'Lead reativado para nova tentativa de contato' },
  ],
}

const MOTIVOS_PERDA = [
  'Preco acima do orcamento',
  'Escolheu outro imovel',
  'Desistiu da compra',
  'Sem resposta / sumiu',
  'Problemas de credito',
  'Nao gostou das opcoes',
  'Nao compareceu a visita',
  'Outro',
]

interface Toast { id: string; message: string; type: 'success' | 'error' }
interface ConfirmPerda {
  cliente: Cliente
  acao: { etapa: EtapaFunil; label: string; descricao: string }
}
interface ConfirmRegressao {
  cliente: Cliente
  novaEtapa: EtapaFunil
}

export default function PipelinePage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  // mapa clienteId -> nome do imovel da ultima visita
  const [imovelPorCliente, setImovelPorCliente] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmPerda, setConfirmPerda] = useState<ConfirmPerda | null>(null)
  const [motivoPerda, setMotivoPerda] = useState('')
  const [motivoOutro, setMotivoOutro] = useState('')
  const [confirmRegressao, setConfirmRegressao] = useState<ConfirmRegressao | null>(null)
  const [motivoRegressao, setMotivoRegressao] = useState('')
  const [realtimeConectado, setRealtimeConectado] = useState(false)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    loadClientes()
    iniciarRealtime()
    return () => { channelRef.current?.unsubscribe() }
  }, [])

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const loadClientes = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    // Carrega clientes e visitas com imovel em paralelo
    const [{ data: clientesData }, { data: visitasData }] = await Promise.all([
      supabase
        .from('clientes')
        .select('id,nome,etapa_funil,orcamento_max,tipo_imovel,score_potencial,telefone,historico,updated_at')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false }),
      supabase
        .from('visitas')
        .select('cliente_id, imoveis(titulo), status, data_hora')
        .eq('user_id', session.user.id)
        .in('status', ['agendado', 'realizado'])
        .order('data_hora', { ascending: false }),
    ])

    setClientes((clientesData || []) as any)

    // Para cada cliente, pega o imovel da visita mais recente
    const mapa: Record<string, string> = {}
    for (const v of (visitasData || []) as any[]) {
      if (v.cliente_id && v.imoveis?.titulo && !mapa[v.cliente_id]) {
        mapa[v.cliente_id] = v.imoveis.titulo
      }
    }
    setImovelPorCliente(mapa)
    setLoading(false)
  }

  const iniciarRealtime = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const uid = session.user.id

    channelRef.current = supabase
      .channel('pipeline-clientes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clientes', filter: `user_id=eq.${uid}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Cliente
            setClientes(prev =>
              prev.map(c => c.id === updated.id
                ? { ...c, etapa_funil: updated.etapa_funil, historico: updated.historico, score_potencial: updated.score_potencial, updated_at: updated.updated_at }
                : c
              )
            )
          } else if (payload.eventType === 'INSERT') {
            setClientes(prev => [payload.new as Cliente, ...prev])
          } else if (payload.eventType === 'DELETE') {
            setClientes(prev => prev.filter(c => c.id !== (payload.old as any).id))
          }
        }
      )
      .subscribe((status) => setRealtimeConectado(status === 'SUBSCRIBED'))
  }

  const handleDragStart = (e: React.DragEvent, clienteId: string) => {
    e.dataTransfer.setData('clienteId', clienteId)
    setDragging(clienteId)
  }

  const handleDragEnd = () => setDragging(null)

  const handleDrop = async (e: React.DragEvent, novaEtapa: EtapaFunil) => {
    e.preventDefault()
    const clienteId = e.dataTransfer.getData('clienteId')
    if (!clienteId) return
    const cliente = clientes.find(c => c.id === clienteId)
    if (!cliente || cliente.etapa_funil === novaEtapa) { setDragging(null); return }

    if (novaEtapa === 'perdido') {
      setConfirmPerda({ cliente, acao: { etapa: novaEtapa, label: 'Perdido', descricao: 'Marcado como perdido via drag' } })
      setDragging(null)
      return
    }

    const ordemAtual = ETAPA_ORDEM[cliente.etapa_funil] ?? 0
    const ordemNova = ETAPA_ORDEM[novaEtapa] ?? 0
    if (ordemNova < ordemAtual) {
      setConfirmRegressao({ cliente, novaEtapa })
      setMotivoRegressao('')
      setDragging(null)
      return
    }

    await executarMoverEtapa(cliente, novaEtapa, 'Etapa alterada por arrastar')
    setDragging(null)
  }

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  const handleAdvance = async (
    cliente: Cliente,
    acao: { etapa: EtapaFunil; label: string; descricao: string; confirmarPerda?: boolean }
  ) => {
    if (advancing) return
    if (acao.confirmarPerda) {
      setConfirmPerda({ cliente, acao })
      setMotivoPerda('')
      setMotivoOutro('')
      return
    }

    const ordemAtual = ETAPA_ORDEM[cliente.etapa_funil] ?? 0
    const ordemNova = ETAPA_ORDEM[acao.etapa] ?? 0
    if (ordemNova < ordemAtual) {
      setConfirmRegressao({ cliente, novaEtapa: acao.etapa })
      setMotivoRegressao('')
      return
    }

    setAdvancing(cliente.id + acao.etapa)
    await executarMoverEtapa(cliente, acao.etapa, acao.descricao)
    setAdvancing(null)
  }

  const confirmarPerdaSubmit = async () => {
    if (!confirmPerda || !motivoPerda) return
    const motivo = motivoPerda === 'Outro' && motivoOutro.trim() ? motivoOutro.trim() : motivoPerda
    const descricao = `${confirmPerda.acao.descricao} - Motivo: ${motivo}`
    setAdvancing(confirmPerda.cliente.id + confirmPerda.acao.etapa)
    await executarMoverEtapa(confirmPerda.cliente, confirmPerda.acao.etapa, descricao, true)
    setAdvancing(null)
    setConfirmPerda(null)
    setMotivoPerda('')
    setMotivoOutro('')
  }

  const confirmarRegressaoSubmit = async () => {
    if (!confirmRegressao || !motivoRegressao.trim()) return
    const { cliente, novaEtapa } = confirmRegressao
    const descricao = `Regressao manual - Motivo: ${motivoRegressao.trim()}`
    setAdvancing(cliente.id + novaEtapa)
    await executarMoverEtapa(cliente, novaEtapa, descricao, true)
    setAdvancing(null)
    setConfirmRegressao(null)
    setMotivoRegressao('')
  }

  const executarMoverEtapa = async (
    cliente: Cliente,
    novaEtapa: EtapaFunil,
    motivo: string,
    forcado = false
  ) => {
    try {
      const etapaAnterior = ETAPAS_FUNIL[cliente.etapa_funil]?.label || cliente.etapa_funil
      const etapaNova = ETAPAS_FUNIL[novaEtapa]?.label || novaEtapa
      const novaEntrada = {
        data: new Date().toISOString(),
        tipo: 'sistema' as const,
        descricao: `${motivo} (${etapaAnterior} -> ${etapaNova})`,
      }
      // Garante que historico seja sempre um array
      const historicoExistente = Array.isArray(cliente.historico) ? cliente.historico : []
      const historicoAtualizado = [...historicoExistente, novaEntrada]
      setClientes(prev =>
        prev.map(c => c.id === cliente.id ? { ...c, etapa_funil: novaEtapa, historico: historicoAtualizado } : c)
      )
      const ordemAtual = ETAPA_ORDEM[cliente.etapa_funil] ?? 0
      const ordemNova = ETAPA_ORDEM[novaEtapa] ?? 0
      const ok = await atualizarPipelineCliente(cliente.id, novaEtapa, motivo, forcado || ordemNova < ordemAtual)
      if (!ok) {
        addToast(`Erro ao mover ${cliente.nome} — tente novamente`, 'error')
        setClientes(prev =>
          prev.map(c => c.id === cliente.id ? { ...c, etapa_funil: cliente.etapa_funil, historico: cliente.historico } : c)
        )
      } else {
        addToast(`${cliente.nome} movido para ${etapaNova}`)
      }
    } catch (err) {
      console.error('[pipeline] executarMoverEtapa:', err)
      addToast(`Erro inesperado ao mover ${cliente.nome}`, 'error')
      // Reverter estado otimista
      setClientes(prev =>
        prev.map(c => c.id === cliente.id ? { ...c, etapa_funil: cliente.etapa_funil, historico: cliente.historico } : c)
      )
    }
  }

  const clientesPorEtapa = (etapa: EtapaFunil) =>
    clientes.filter(c => c.etapa_funil === etapa)

  const sugestoesScore = clientes.filter(c =>
    (c.score_potencial ?? 0) >= 70 && (ETAPA_ORDEM[c.etapa_funil] ?? 0) < 2
  )

  return (
    <AppLayout title="Pipeline de Vendas">
      <div className="pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-slate-500">
            Arraste os cards ou use os botoes de acao rapida para atualizar o status.
          </p>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 text-xs ${realtimeConectado ? 'text-green-600' : 'text-slate-400'}`}>
              <span className={`w-2 h-2 rounded-full ${realtimeConectado ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
              {realtimeConectado ? 'Ao vivo' : 'Offline'}
            </span>
            <button onClick={loadClientes} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {sugestoesScore.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <Zap size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">
                {sugestoesScore.length} lead{sugestoesScore.length > 1 ? 's' : ''} com score alto aguardando avanco
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sugestoesScore.map(c => (
                  <a key={c.id} href={`/clientes/${c.id}`}
                    className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-full px-2 py-0.5 transition-colors">
                    {c.nome} ({c.score_potencial}%)
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-slate-400">Carregando pipeline...</div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '70vh' }}>
            {ETAPAS_ORDER.map(etapa => {
              const { label, color } = ETAPAS_FUNIL[etapa]
              const lista = clientesPorEtapa(etapa)
              const isNegociacao = etapa === 'negociacao'
              return (
                <div
                  key={etapa}
                  className="flex-shrink-0 w-64 flex flex-col"
                  onDrop={e => handleDrop(e, etapa)}
                  onDragOver={handleDragOver}
                >
                  <div className={`${color} rounded-t-lg px-3 py-2 flex items-center justify-between`}>
                    <span className="text-white text-xs font-semibold">{label}</span>
                    <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{lista.length}</span>
                  </div>

                  <div className="flex-1 bg-slate-100 rounded-b-lg p-2 space-y-2 min-h-[200px]">
                    {lista.map(cliente => {
                      const acoes = ACOES_RAPIDAS[cliente.etapa_funil] || []
                      const scoreAlto = (cliente.score_potencial ?? 0) >= 70
                      const imovelNome = imovelPorCliente[cliente.id]
                      return (
                        <div
                          key={cliente.id}
                          draggable
                          onDragStart={e => handleDragStart(e, cliente.id)}
                          onDragEnd={handleDragEnd}
                          className={`rounded-lg p-3 shadow-sm border transition-all cursor-grab active:cursor-grabbing
                            ${isNegociacao ? 'bg-gray-100' : 'bg-white'}
                            ${dragging === cliente.id ? 'opacity-50 scale-95' : 'hover:shadow-md'}
                            ${scoreAlto && ETAPA_ORDEM[cliente.etapa_funil] < 2 ? 'border-amber-300' : 'border-slate-200'}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <User size={14} className="text-blue-600" />
                            </div>
                            <p className="text-sm font-semibold text-slate-800 leading-tight flex-1">{cliente.nome}</p>
                            {scoreAlto && ETAPA_ORDEM[cliente.etapa_funil] < 2 && (
                              <Zap size={13} className="text-amber-500 flex-shrink-0" />
                            )}
                          </div>

                          {/* Imovel da ultima visita */}
                          {imovelNome && (
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Building2 size={11} className="text-indigo-400 flex-shrink-0" />
                              <p className="text-xs text-indigo-600 font-medium truncate">{imovelNome}</p>
                            </div>
                          )}

                          {cliente.orcamento_max && (
                            <p className="text-xs text-slate-500 mb-1">ate {formatCurrency(cliente.orcamento_max)}</p>
                          )}
                          {cliente.tipo_imovel && !imovelNome && (
                            <p className="text-xs text-slate-400 capitalize mb-2">{cliente.tipo_imovel}</p>
                          )}

                          {cliente.score_potencial !== undefined && (
                            <div className="flex items-center gap-1 mb-2">
                              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${scoreAlto ? 'bg-amber-400' : 'bg-blue-500'}`}
                                  style={{ width: `${cliente.score_potencial}%` }}
                                />
                              </div>
                              <span className={`text-xs ${scoreAlto ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}>
                                {cliente.score_potencial}%
                              </span>
                            </div>
                          )}

                          {acoes.length > 0 && (
                            <div className="mt-2 space-y-1 border-t border-slate-200 pt-2">
                              {acoes.map(acao => (
                                <button
                                  key={acao.etapa}
                                  onClick={() => handleAdvance(cliente, acao)}
                                  disabled={!!advancing}
                                  className={`w-full flex items-center justify-between gap-1 text-xs font-medium rounded px-2 py-1.5 transition-colors disabled:opacity-60 ${acao.color}`}
                                >
                                  <span>{acao.label}</span>
                                  <ChevronRight size={11} />
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-1 mt-2">
                            {cliente.telefone && (
                              <a
                                href={whatsappLink(cliente.telefone, `Ola ${cliente.nome}, tudo bem?`)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-1 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded px-2 py-1 transition-colors"
                              >
                                <MessageCircle size={11} /> WhatsApp
                              </a>
                            )}
                            <a
                              href={`/clientes/${cliente.id}`}
                              className="flex-1 flex items-center justify-center gap-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded px-2 py-1 transition-colors"
                            >
                              <User size={11} /> Detalhes
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal: confirmar perda */}
      <Modal
        isOpen={!!confirmPerda}
        onClose={() => { setConfirmPerda(null); setMotivoPerda(''); setMotivoOutro('') }}
        title="Confirmar perda do lead"
      >
        {confirmPerda && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
              <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">
                  Marcar <span className="underline">{confirmPerda.cliente.nome}</span> como perdido?
                </p>
                <p className="text-xs text-red-600 mt-0.5">Esta acao pode ser revertida depois se necessario.</p>
              </div>
            </div>
            <div>
              <label className="label">Motivo da perda *</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {MOTIVOS_PERDA.map(m => (
                  <button key={m} type="button" onClick={() => setMotivoPerda(m)}
                    className={`text-xs text-left px-3 py-2 rounded-lg border transition-colors
                      ${motivoPerda === m ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200 hover:border-red-300'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            {motivoPerda === 'Outro' && (
              <div>
                <label className="label">Descreva o motivo</label>
                <input className="input" value={motivoOutro} onChange={e => setMotivoOutro(e.target.value)} placeholder="Ex: cliente mudou de cidade..." />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setConfirmPerda(null); setMotivoPerda(''); setMotivoOutro('') }} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button type="button" onClick={confirmarPerdaSubmit}
                disabled={!motivoPerda || (motivoPerda === 'Outro' && !motivoOutro.trim()) || !!advancing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                Confirmar Perda
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: justificar regressao */}
      <Modal
        isOpen={!!confirmRegressao}
        onClose={() => { setConfirmRegressao(null); setMotivoRegressao('') }}
        title="Justificar retrocesso de etapa"
      >
        {confirmRegressao && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Movendo <span className="underline">{confirmRegressao.cliente.nome}</span> para etapa anterior
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {ETAPAS_FUNIL[confirmRegressao.cliente.etapa_funil]?.label} &rarr; {ETAPAS_FUNIL[confirmRegressao.novaEtapa]?.label}
                </p>
              </div>
            </div>
            <div>
              <label className="label">Justificativa *</label>
              <textarea
                className="input min-h-[100px] resize-none"
                value={motivoRegressao}
                onChange={e => setMotivoRegressao(e.target.value)}
                placeholder="Descreva o motivo do retrocesso desta etapa..."
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-1">Campo obrigatorio. Sera registrado no historico do cliente.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setConfirmRegressao(null); setMotivoRegressao('') }} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button type="button" onClick={confirmarRegressaoSubmit}
                disabled={!motivoRegressao.trim() || !!advancing}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors">
                Confirmar Retrocesso
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white pointer-events-auto
              ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {toast.message}
          </div>
        ))}
      </div>
    </AppLayout>
  )
}
