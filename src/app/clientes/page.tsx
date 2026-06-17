'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Modal from '@/components/ui/Modal'
import ClienteForm from '@/components/clientes/ClienteForm'
import EmptyState from '@/components/ui/EmptyState'
import { createClient } from '@/lib/supabase'
import {
  formatCurrency, ETAPAS_FUNIL, CLASSE_LABELS, PERFIL_LABELS
} from '@/lib/utils'
import type { Cliente, EtapaFunil } from '@/types'
import WhatsAppButton from '@/components/whatsapp/WhatsAppButton'
import {
  Plus, Search, Edit2, Trash2,
  Users, ArrowRight
} from 'lucide-react'

const supabase = createClient()

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [filtered, setFiltered] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [search, setSearch] = useState('')
  const [filterEtapa, setFilterEtapa] = useState('')
  const [filterObjetivo, setFilterObjetivo] = useState('')

  useEffect(() => { loadClientes() }, [])

  useEffect(() => {
    let result = clientes
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.nome.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.telefone?.includes(q)
      )
    }
    if (filterEtapa) result = result.filter(c => c.etapa_funil === filterEtapa)
    if (filterObjetivo) result = result.filter(c => c.objetivo === filterObjetivo)
    setFiltered(result)
  }, [search, filterEtapa, filterObjetivo, clientes])

  const loadClientes = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    setClientes((data || []) as any)
    setFiltered((data || []) as any)
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este cliente?')) return
    await supabase.from('clientes').delete().eq('id', id)
    setClientes(prev => prev.filter(c => c.id !== id))
  }

  const openEdit = (c: Cliente) => { setEditing(c); setModalOpen(true) }
  const openNew = () => { setEditing(null); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditing(null) }

  return (
    <AppLayout title="Clientes">
      <div className="space-y-4">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Buscar por nome, e-mail ou telefone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="input w-auto" value={filterEtapa} onChange={e => setFilterEtapa(e.target.value)}>
            <option value="">Todas etapas</option>
            {Object.entries(ETAPAS_FUNIL).map(([k, v]) =>
              <option key={k} value={k}>{v.label}</option>
            )}
          </select>
          <select className="input w-auto" value={filterObjetivo} onChange={e => setFilterObjetivo(e.target.value)}>
            <option value="">Todos objetivos</option>
            <option value="morar">Morar</option>
            <option value="investir">Investir</option>
            <option value="alugar">Alugar</option>
          </select>
          <button onClick={openNew} className="btn-primary whitespace-nowrap">
            <Plus size={16} /> Novo cliente
          </button>
        </div>

        {/* Count */}
        <p className="text-sm text-slate-500">
          {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </p>

        {/* List */}
        {loading ? (
          <div className="text-center py-16 text-slate-400">Carregando clientes...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum cliente encontrado"
            description="Cadastre seu primeiro cliente para começar a gerenciar seu pipeline."
            action={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Novo cliente</button>}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(cliente => (
              <ClienteCard
                key={cliente.id}
                cliente={cliente}
                onEdit={() => openEdit(cliente)}
                onDelete={() => handleDelete(cliente.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar Cliente' : 'Novo Cliente'}
        size="xl"
      >
        <ClienteForm
          cliente={editing}
          onSuccess={() => { closeModal(); loadClientes() }}
          onCancel={closeModal}
        />
      </Modal>
    </AppLayout>
  )
}

function ClienteCard({ cliente, onEdit, onDelete }: {
  cliente: Cliente
  onEdit: () => void
  onDelete: () => void
}) {
  const etapa = ETAPAS_FUNIL[cliente.etapa_funil]

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {cliente.nome.slice(0,2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">{cliente.nome}</h3>
            {cliente.cidade && <p className="text-xs text-slate-400">{cliente.cidade}</p>}
          </div>
        </div>
        <span className={`badge text-white text-xs ${etapa?.color || 'bg-slate-500'}`}>
          {etapa?.label || cliente.etapa_funil}
        </span>
      </div>

      {/* Info */}
      <div className="space-y-1 mb-3 text-xs text-slate-600">
        {cliente.orcamento_max && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Orçamento</span>
            <span className="font-medium">{formatCurrency(cliente.orcamento_max)}</span>
          </div>
        )}
        {cliente.tipo_imovel && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Tipo</span>
            <span className="capitalize">{cliente.tipo_imovel}</span>
          </div>
        )}
        {cliente.objetivo && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Objetivo</span>
            <span className="capitalize">{cliente.objetivo}</span>
          </div>
        )}
      </div>

      {/* Inteligência */}
      {(cliente.classe_economica || cliente.perfil_comprador) && (
        <div className="flex flex-wrap gap-1 mb-3">
          {cliente.classe_economica && (
            <span className={`badge text-xs ${CLASSE_LABELS[cliente.classe_economica]?.color}`}>
              {CLASSE_LABELS[cliente.classe_economica]?.label}
            </span>
          )}
          {cliente.perfil_comprador && (
            <span className="badge bg-indigo-50 text-indigo-700 text-xs">
              {PERFIL_LABELS[cliente.perfil_comprador]?.icon} {PERFIL_LABELS[cliente.perfil_comprador]?.label}
            </span>
          )}
          {cliente.score_potencial !== undefined && (
            <span className="badge bg-green-50 text-green-700 text-xs">
              Score {cliente.score_potencial}%
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-slate-100">
        {cliente.telefone && (
          <WhatsAppButton cliente={cliente} compact className="flex-1" />
        )}
        <a href={`/clientes/${cliente.id}`} className="btn-secondary flex-1 justify-center text-xs py-1.5">
          <ArrowRight size={13} /> Detalhes
        </a>
        <button onClick={onEdit} className="btn-secondary px-2 py-1.5">
          <Edit2 size={13} />
        </button>
        <button onClick={onDelete} className="btn-secondary px-2 py-1.5 text-red-500 hover:bg-red-50 hover:border-red-200">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
