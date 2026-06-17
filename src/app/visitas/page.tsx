'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import CalendarioVisitas from '@/components/visitas/CalendarioVisitas'
import { createClient } from '@/lib/supabase'
import { formatDateTime, STATUS_VISITA } from '@/lib/utils'
import { atualizarPipelineCliente } from '@/lib/pipeline'
import type { Visita, Cliente, Imovel, EtapaFunil } from '@/types'
import {
  Plus, CalendarCheck, Edit2, Trash2, Loader2,
  User, Building2, Clock, MessageSquare,
  List, Calendar
} from 'lucide-react'

interface VisitaComRelacoes extends Visita {
  clientes?: { nome: string; telefone?: string }
  imoveis?: { titulo: string; valor: number }
}

const supabase = createClient()

export default function VisitasPage() {
  const [visitas, setVisitas] = useState<VisitaComRelacoes[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Visita | null>(null)
  const [reagendando, setReagendando] = useState<Visita | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('lista')
  const [diaModal, setDiaModal] = useState<{ date: Date; visitas: VisitaComRelacoes[] } | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const [{ data: visitasData }, { data: clientesData }, { data: imoveisData }] = await Promise.all([
      supabase.from('visitas')
        .select('*, clientes(nome, telefone), imoveis(titulo, valor)')
        .eq('user_id', session.user.id)
        .order('data_hora'),
      supabase.from('clientes').select('id, nome').eq('user_id', session.user.id),
      supabase.from('imoveis').select('id, titulo').eq('user_id', session.user.id),
    ])
    setVisitas((visitasData || []) as any)
    setClientes((clientesData || []) as any)
    setImoveis((imoveisData || []) as any)
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta visita?')) return
    await supabase.from('visitas').delete().eq('id', id)
    setVisitas(prev => prev.filter(v => v.id !== id))
  }

  // Chamado quando o status da visita muda (Realizada / Cancelar)
  const handleStatusChange = async (visita: VisitaComRelacoes, novoStatus: string) => {
    await supabase.from('visitas').update({ status: novoStatus }).eq('id', visita.id)

    if (novoStatus === 'realizado') {
      // Visita realizada -> avanca para Proposta Enviada
      await atualizarPipelineCliente(
        visita.cliente_id,
        'proposta_enviada',
        'Visita realizada - aguardando proposta'
      )
    } else if (novoStatus === 'cancelado') {
      // Visita cancelada -> volta para Contato Iniciado (so se estava em visita_agendada)
      await atualizarPipelineCliente(
        visita.cliente_id,
        'contato_iniciado',
        'Visita cancelada - retomando contato',
        true
      )
    }

    loadData()
  }

  const filtered = filterStatus ? visitas.filter(v => v.status === filterStatus) : visitas

  const upcoming = filtered.filter(v => {
    if (v.status !== 'agendado') return false
    return new Date(v.data_hora) >= new Date()
  })
  const past = filtered.filter(v =>
    v.status !== 'agendado' || new Date(v.data_hora) < new Date()
  )

  return (
    <AppLayout title="Visitas">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex rounded-xl overflow-hidden border border-slate-200">
            <button
              onClick={() => setViewMode('lista')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === 'lista' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <List size={15} /> Lista
            </button>
            <button
              onClick={() => setViewMode('calendario')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === 'calendario' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <Calendar size={15} /> Calendario
            </button>
          </div>
          {viewMode === 'lista' && (
            <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos status</option>
              <option value="agendado">Agendado</option>
              <option value="realizado">Realizado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          )}
          <button onClick={() => { setEditing(null); setModalOpen(true) }} className="btn-primary ml-auto">
            <Plus size={16} /> Agendar visita
          </button>
        </div>

        {viewMode === 'calendario' && !loading && (
          <CalendarioVisitas
            visitas={visitas}
            onDayClick={(date, dvs) => setDiaModal({ date, visitas: dvs as VisitaComRelacoes[] })}
            onNovaVisita={(date) => { setEditing(null); setModalOpen(true) }}
          />
        )}

        {viewMode === 'lista' && loading && (
          <div className="text-center py-16 text-slate-400">Carregando visitas...</div>
        )}

        {viewMode === 'lista' && !loading && filtered.length === 0 && (
          <EmptyState
            icon={CalendarCheck}
            title="Nenhuma visita encontrada"
            description="Agende visitas vinculando clientes a imoveis disponiveis."
            action={<button onClick={() => setModalOpen(true)} className="btn-primary"><Plus size={16} /> Agendar visita</button>}
          />
        )}

        {viewMode === 'lista' && !loading && filtered.length > 0 && (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Proximas ({upcoming.length})
                </h2>
                <div className="space-y-3">
                  {upcoming.map(v => (
                    <VisitaCard key={v.id} visita={v}
                      onEdit={() => { setEditing(v); setModalOpen(true) }}
                      onDelete={() => handleDelete(v.id)}
                      onStatusChange={(status) => handleStatusChange(v, status)}
                      onReagendar={() => setReagendando(v)}
                    />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Historico ({past.length})
                </h2>
                <div className="space-y-3">
                  {past.map(v => (
                    <VisitaCard key={v.id} visita={v}
                      onEdit={() => { setEditing(v); setModalOpen(true) }}
                      onDelete={() => handleDelete(v.id)}
                      onStatusChange={(status) => handleStatusChange(v, status)}
                      onReagendar={() => setReagendando(v)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={!!reagendando} onClose={() => setReagendando(null)} title="Reagendar Visita">
        {reagendando && (
          <ReagendarForm
            visita={reagendando}
            onSuccess={async (novaDataHora) => {
              await supabase
                .from('visitas')
                .update({ data_hora: novaDataHora, status: 'agendado' })
                .eq('id', reagendando.id)
              // Registra no historico do cliente
              await atualizarPipelineCliente(
                reagendando.cliente_id,
                'visita_agendada',
                'Visita reagendada pelo corretor'
              )
              setReagendando(null)
              loadData()
            }}
            onCancel={() => setReagendando(null)}
          />
        )}
      </Modal>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Visita' : 'Agendar Visita'}>
        <VisitaForm
          visita={editing}
          clientes={clientes}
          imoveis={imoveis}
          onSuccess={() => { setModalOpen(false); loadData() }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      {/* Modal do dia no calendario */}
      <Modal
        isOpen={!!diaModal}
        onClose={() => setDiaModal(null)}
        title={diaModal ? `Visitas - ${diaModal.date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}` : ''}
      >
        {diaModal && (
          <div className="space-y-3">
            {diaModal.visitas.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-slate-400 text-sm mb-3">Nenhuma visita neste dia.</p>
                <button onClick={() => { setDiaModal(null); setEditing(null); setModalOpen(true) }} className="btn-primary">
                  <Plus size={16} /> Agendar visita
                </button>
              </div>
            ) : (
              <>
                {diaModal.visitas.map(v => (
                  <VisitaCard key={v.id} visita={v}
                    onEdit={() => { setDiaModal(null); setEditing(v); setModalOpen(true) }}
                    onDelete={() => { handleDelete(v.id); setDiaModal(null) }}
                    onStatusChange={(status) => { handleStatusChange(v, status); setDiaModal(null) }}
                    onReagendar={() => { setDiaModal(null); setReagendando(v) }}
                  />
                ))}
                <button onClick={() => { setDiaModal(null); setEditing(null); setModalOpen(true) }} className="btn-secondary w-full justify-center">
                  <Plus size={16} /> Agendar outra visita neste dia
                </button>
              </>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}

function VisitaCard({ visita, onEdit, onDelete, onStatusChange, onReagendar }: {
  visita: VisitaComRelacoes
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: string) => void
  onReagendar: () => void
}) {
  const status = STATUS_VISITA[visita.status]
  const isPast = new Date(visita.data_hora) < new Date()

  return (
    <div className={`card hover:shadow-md transition-shadow ${isPast && visita.status === 'agendado' ? 'border-amber-200' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            visita.status === 'realizado' ? 'bg-green-100' :
            visita.status === 'cancelado' ? 'bg-red-100' : 'bg-blue-100'
          }`}>
            <CalendarCheck size={18} className={
              visita.status === 'realizado' ? 'text-green-600' :
              visita.status === 'cancelado' ? 'text-red-500' : 'text-blue-600'
            } />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`badge text-xs ${status.color}`}>{status.label}</span>
              {isPast && visita.status === 'agendado' && (
                <span className="badge bg-amber-100 text-amber-700 text-xs">Vencida</span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <User size={14} className="text-slate-400" />
                <a href={`/clientes/${visita.cliente_id}`} className="hover:text-blue-600 hover:underline">
                  {visita.clientes?.nome || 'Cliente'}
                </a>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Building2 size={14} className="text-slate-400" />
                <a href={`/imoveis/${visita.imovel_id}`} className="hover:text-blue-600 hover:underline">
                  {visita.imoveis?.titulo || 'Imovel'}
                </a>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Clock size={14} className="text-slate-400" />
                {formatDateTime(visita.data_hora)}
              </div>
              {visita.observacoes && (
                <div className="flex items-start gap-2 text-slate-500 md:col-span-2">
                  <MessageSquare size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs">{visita.observacoes}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {visita.status === 'agendado' && (
            <>
              <button onClick={() => onStatusChange('realizado')}
                className="text-xs px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap">
                Realizada
              </button>
              <button onClick={() => onStatusChange('cancelado')}
                className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 whitespace-nowrap">
                Cancelar
              </button>
              <button onClick={onReagendar}
                className="text-xs px-2 py-1 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 whitespace-nowrap">
                Reagendar
              </button>
            </>
          )}
          <button onClick={onEdit} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">
            <Edit2 size={12} />
          </button>
          <button onClick={onDelete} className="text-xs px-2 py-1 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

function VisitaForm({ visita, clientes, imoveis, onSuccess, onCancel }: {
  visita: Visita | null
  clientes: Cliente[]
  imoveis: Imovel[]
  onSuccess: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    cliente_id: visita?.cliente_id || '',
    imovel_id: visita?.imovel_id || '',
    data_hora: visita?.data_hora
      ? new Date(visita.data_hora).toISOString().slice(0, 16)
      : '',
    status: visita?.status || 'agendado',
    observacoes: visita?.observacoes || '',
  })
  const [saving, setSaving] = useState(false)
  const sb = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.cliente_id || !form.imovel_id || !form.data_hora) return
    setSaving(true)
    try {
      const { data: { session } } = await sb.auth.getSession()
      if (!session?.user) return

      const payload = {
        cliente_id: form.cliente_id,
        imovel_id: form.imovel_id,
        data_hora: new Date(form.data_hora).toISOString(),
        status: form.status as Visita['status'],
        observacoes: form.observacoes || null,
        user_id: session.user.id,
      }

      if (visita?.id) {
        await sb.from('visitas').update(payload).eq('id', visita.id)
      } else {
        await sb.from('visitas').insert(payload)
      }

      // Automacao de pipeline ao agendar visita
      if (form.status === 'agendado') {
        await atualizarPipelineCliente(
          form.cliente_id,
          'visita_agendada',
          'Visita agendada pelo corretor'
        )
      } else if (form.status === 'realizado') {
        await atualizarPipelineCliente(
          form.cliente_id,
          'proposta_enviada',
          'Visita registrada como realizada'
        )
      }

      onSuccess()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Cliente *</label>
        <select className="input" value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))} required>
          <option value="">Selecione o cliente</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Imovel *</label>
        <select className="input" value={form.imovel_id} onChange={e => setForm(f => ({ ...f, imovel_id: e.target.value }))} required>
          <option value="">Selecione o imovel</option>
          {imoveis.map(i => <option key={i.id} value={i.id}>{i.titulo}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Data e Hora *</label>
        <input type="datetime-local" className="input" value={form.data_hora} onChange={e => setForm(f => ({ ...f, data_hora: e.target.value }))} required />
      </div>
      <div>
        <label className="label">Status</label>
        <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Visita['status'] }))}>
          {Object.entries(STATUS_VISITA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Notas</label>
        <textarea className="input" rows={3} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Observacoes sobre a visita..." />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'Salvando...' : 'Confirmar Reagendamento'}
        </button>
      </div>
    </form>
  )
}

function ReagendarForm({ visita, onSuccess, onCancel }: {
  visita: Visita
  onSuccess: (novaDataHora: string) => Promise<void>
  onCancel: () => void
}) {
  const [dataHora, setDataHora] = useState(
    visita.data_hora ? new Date(visita.data_hora).toISOString().slice(0, 16) : ''
  )
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dataHora) return
    setSaving(true)
    await onSuccess(new Date(dataHora).toISOString())
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-sm text-indigo-700">
        Escolha a nova data e hora para a visita. O status voltara para <strong>Agendado</strong> automaticamente.
      </div>
      <div>
        <label className="label">Nova Data e Hora *</label>
        <input
          type="datetime-local"
          className="input"
          value={dataHora}
          onChange={e => setDataHora(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          required
          autoFocus
        />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={saving || !dataHora} className="btn-primary">
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'Salvando...' : 'Confirmar Reagendamento'}
        </button>
      </div>
    </form>
  )
}
