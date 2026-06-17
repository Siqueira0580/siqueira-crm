'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Modal from '@/components/ui/Modal'
import ImovelForm from '@/components/imoveis/ImovelForm'
import EmptyState from '@/components/ui/EmptyState'
import { createClient } from '@/lib/supabase'
import { formatCurrency, STATUS_IMOVEL } from '@/lib/utils'
import type { Imovel } from '@/types'
import {
  Plus, Search, Edit2, Trash2, Building2, Bed, Car,
  MapPin, ArrowRight, SquareStack
} from 'lucide-react'

const supabase = createClient()

export default function ImoveisPage() {
  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [filtered, setFiltered] = useState<Imovel[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Imovel | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterTipo, setFilterTipo] = useState('')

  useEffect(() => { loadImoveis() }, [])

  useEffect(() => {
    let result = imoveis
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(i =>
        i.titulo.toLowerCase().includes(q) ||
        i.cidade?.toLowerCase().includes(q) ||
        i.bairro?.toLowerCase().includes(q)
      )
    }
    if (filterStatus) result = result.filter(i => i.status === filterStatus)
    if (filterTipo) result = result.filter(i => i.tipo === filterTipo)
    setFiltered(result)
  }, [search, filterStatus, filterTipo, imoveis])

  const loadImoveis = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const { data } = await supabase
      .from('imoveis')
      .select('*, fotos_imoveis(id, url, ordem)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    const mapped = (data as any[])?.map((i: any) => ({ ...i, fotos: i.fotos_imoveis })) || []
    setImoveis(mapped)
    setFiltered(mapped)
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este imóvel?')) return
    await supabase.from('imoveis').delete().eq('id', id)
    setImoveis(prev => prev.filter(i => i.id !== id))
  }

  const openEdit = (i: Imovel) => { setEditing(i); setModalOpen(true) }
  const openNew = () => { setEditing(null); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditing(null) }

  return (
    <AppLayout title="Imóveis">
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Buscar por título, cidade ou bairro..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos status</option>
            <option value="disponivel">Disponível</option>
            <option value="reservado">Reservado</option>
            <option value="vendido">Vendido</option>
          </select>
          <select className="input w-auto" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
            <option value="">Todos tipos</option>
            <option value="apartamento">Apartamento</option>
            <option value="casa">Casa</option>
            <option value="comercial">Comercial</option>
          </select>
          <button onClick={openNew} className="btn-primary whitespace-nowrap">
            <Plus size={16} /> Novo imóvel
          </button>
        </div>

        <p className="text-sm text-slate-500">
          {filtered.length} imóvel{filtered.length !== 1 ? 'is' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </p>

        {loading ? (
          <div className="text-center py-16 text-slate-400">Carregando imóveis...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Nenhum imóvel encontrado"
            description="Cadastre imóveis para começar a fazer matching com seus clientes."
            action={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Novo imóvel</button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(imovel => (
              <ImovelCard
                key={imovel.id}
                imovel={imovel}
                onEdit={() => openEdit(imovel)}
                onDelete={() => handleDelete(imovel.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Editar Imóvel' : 'Novo Imóvel'} size="xl">
        <ImovelForm
          imovel={editing}
          onSuccess={() => { closeModal(); loadImoveis() }}
          onCancel={closeModal}
        />
      </Modal>
    </AppLayout>
  )
}

function ImovelCard({ imovel, onEdit, onDelete }: { imovel: Imovel; onEdit: () => void; onDelete: () => void }) {
  const status = STATUS_IMOVEL[imovel.status]
  const capa = imovel.fotos?.[0]?.url

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Foto */}
      <div className="h-44 bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
        {capa ? (
          <img src={capa} alt={imovel.titulo} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 size={40} className="text-slate-300" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className={`badge text-xs font-semibold ${status.color}`}>{status.label}</span>
        </div>
        {imovel.fotos && imovel.fotos.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            <SquareStack size={10} /> {imovel.fotos.length}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-slate-800 text-sm leading-tight">{imovel.titulo}</h3>
        </div>

        <p className="text-xl font-bold text-blue-600 mb-2">{formatCurrency(imovel.valor)}</p>

        {(imovel.bairro || imovel.cidade) && (
          <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
            <MapPin size={11} />
            {[imovel.bairro, imovel.cidade].filter(Boolean).join(', ')}
            {imovel.zona && ` — Zona ${imovel.zona}`}
          </p>
        )}

        <div className="flex gap-3 text-xs text-slate-500 mb-4">
          {imovel.quartos && <span className="flex items-center gap-1"><Bed size={12} /> {imovel.quartos} qtos</span>}
          {imovel.banheiros && <span>🚿 {imovel.banheiros} ban</span>}
          {imovel.vagas && <span className="flex items-center gap-1"><Car size={12} /> {imovel.vagas} vaga{imovel.vagas > 1 ? 's' : ''}</span>}
          {imovel.area_m2 && <span>📐 {imovel.area_m2}m²</span>}
        </div>

        <div className="flex gap-2">
          <a href={`/imoveis/${imovel.id}`} className="btn-secondary flex-1 justify-center text-xs py-1.5">
            <ArrowRight size={13} /> Ver detalhes
          </a>
          <button onClick={onEdit} className="btn-secondary px-2 py-1.5"><Edit2 size={13} /></button>
          <button onClick={onDelete} className="btn-secondary px-2 py-1.5 text-red-500 hover:bg-red-50 hover:border-red-200">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
