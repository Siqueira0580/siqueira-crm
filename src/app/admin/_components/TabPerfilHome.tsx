'use client'
import { useState, useEffect, useRef } from 'react'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase'
import {
  Image as ImageIcon, Plus, Trash2, ArrowUp, ArrowDown, Loader2,
  AlertCircle, Eye, EyeOff, Building2, Upload, Check
} from 'lucide-react'

const supabase = createClient()

interface Banner {
  id: string
  imovel_id: string | null
  foto_url: string
  storage_path: string | null
  tipo: 'hero' | 'destaque'
  titulo: string | null
  ordem: number
  ativo: boolean
}

interface ImovelOpcao {
  id: string
  titulo: string
  fotos: { id: string; url: string; storage_path: string | null }[]
}

export default function TabPerfilHome() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [tipoNovo, setTipoNovo] = useState<'hero' | 'destaque'>('hero')
  const [tituloNovo, setTituloNovo] = useState('')
  const [origem, setOrigem] = useState<'imovel' | 'upload'>('imovel')
  const [imoveis, setImoveis] = useState<ImovelOpcao[]>([])
  const [imovelSelecionado, setImovelSelecionado] = useState('')
  const [fotoSelecionada, setFotoSelecionada] = useState('')
  const [carregandoImoveis, setCarregandoImoveis] = useState(false)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erroModal, setErroModal] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadBanners() }, [])

  const loadBanners = async () => {
    setLoading(true)
    setErro('')
    const { data, error } = await supabase
      .from('banners_home')
      .select('*')
      .order('tipo', { ascending: true })
      .order('ordem', { ascending: true })
    if (error) {
      setErro(error.message)
    } else {
      setBanners((data || []) as any)
    }
    setLoading(false)
  }

  const loadImoveis = async () => {
    setCarregandoImoveis(true)
    const { data, error } = await supabase
      .from('imoveis')
      .select('id, titulo, fotos_imoveis(id, url, storage_path, ordem)')
      .order('titulo', { ascending: true })
    if (!error && data) {
      const opcoes: ImovelOpcao[] = (data as any[])
        .map(i => ({
          id: i.id,
          titulo: i.titulo,
          fotos: (i.fotos_imoveis || []).sort((a: any, b: any) => a.ordem - b.ordem),
        }))
        .filter(i => i.fotos.length > 0)
      setImoveis(opcoes)
    }
    setCarregandoImoveis(false)
  }

  const abrirModal = (tipo: 'hero' | 'destaque') => {
    setTipoNovo(tipo)
    setTituloNovo('')
    setOrigem('imovel')
    setImovelSelecionado('')
    setFotoSelecionada('')
    setArquivo(null)
    setErroModal('')
    setModalOpen(true)
    loadImoveis()
  }

  const handleAdicionar = async () => {
    setErroModal('')

    let foto_url = ''
    let storage_path: string | null = null
    let imovel_id: string | null = null

    if (origem === 'imovel') {
      if (!fotoSelecionada) { setErroModal('Selecione uma foto do imóvel.'); return }
      foto_url = fotoSelecionada
      imovel_id = imovelSelecionado || null
    } else {
      if (!arquivo) { setErroModal('Selecione um arquivo de imagem.'); return }
    }

    setSalvando(true)
    try {
      if (origem === 'upload' && arquivo) {
        const ext = arquivo.name.split('.').pop()
        const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('imoveis').upload(path, arquivo)
        if (uploadError) throw new Error(uploadError.message)
        const { data: { publicUrl } } = supabase.storage.from('imoveis').getPublicUrl(path)
        foto_url = publicUrl
        storage_path = path
      }

      const ordemAtual = banners.filter(b => b.tipo === tipoNovo).length
      const { error: insertError } = await supabase.from('banners_home').insert({
        imovel_id,
        foto_url,
        storage_path,
        tipo: tipoNovo,
        titulo: tituloNovo.trim() || null,
        ordem: ordemAtual,
        ativo: true,
      })
      if (insertError) throw new Error(insertError.message)

      setModalOpen(false)
      loadBanners()
    } catch (err: any) {
      setErroModal(err.message || 'Erro ao adicionar imagem.')
    } finally {
      setSalvando(false)
    }
  }

  const toggleAtivo = async (banner: Banner) => {
    await supabase.from('banners_home').update({ ativo: !banner.ativo }).eq('id', banner.id)
    setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, ativo: !b.ativo } : b))
  }

  const excluir = async (banner: Banner) => {
    if (!confirm('Remover esta imagem da home?')) return
    await supabase.from('banners_home').delete().eq('id', banner.id)
    if (banner.storage_path) {
      await supabase.storage.from('imoveis').remove([banner.storage_path])
    }
    setBanners(prev => prev.filter(b => b.id !== banner.id))
  }

  const mover = async (banner: Banner, direcao: -1 | 1) => {
    const grupo = banners.filter(b => b.tipo === banner.tipo).sort((a, b) => a.ordem - b.ordem)
    const idx = grupo.findIndex(b => b.id === banner.id)
    const alvoIdx = idx + direcao
    if (alvoIdx < 0 || alvoIdx >= grupo.length) return
    const alvo = grupo[alvoIdx]

    await Promise.all([
      supabase.from('banners_home').update({ ordem: alvo.ordem }).eq('id', banner.id),
      supabase.from('banners_home').update({ ordem: banner.ordem }).eq('id', alvo.id),
    ])
    loadBanners()
  }

  const hero = banners.filter(b => b.tipo === 'hero').sort((a, b) => a.ordem - b.ordem)
  const destaque = banners.filter(b => b.tipo === 'destaque').sort((a, b) => a.ordem - b.ordem)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <ImageIcon size={18} className="text-indigo-600" />
          Perfil da Página Inicial
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Escolha fotos de imóveis cadastrados (ou envie novas) para o carrossel principal e a galeria de destaques do site.
        </p>
      </div>

      {erro && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {erro}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          Carregando...
        </div>
      ) : (
        <>
          <BannerSection
            titulo="Imagem Principal (carrossel de topo)"
            descricao="Aparece em destaque no topo da página, em rotação automática."
            lista={hero}
            onAdd={() => abrirModal('hero')}
            onToggle={toggleAtivo}
            onDelete={excluir}
            onMove={mover}
          />

          <BannerSection
            titulo="Imóveis em Destaque (galeria)"
            descricao="Aparece na seção 'Imóveis em Destaque', logo abaixo dos números."
            lista={destaque}
            onAdd={() => abrirModal('destaque')}
            onToggle={toggleAtivo}
            onDelete={excluir}
            onMove={mover}
          />
        </>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={`Adicionar imagem — ${tipoNovo === 'hero' ? 'Principal' : 'Destaque'}`} size="lg">
        <div className="space-y-4">
          {erroModal && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {erroModal}
            </div>
          )}

          <div className="flex gap-2">
            <button type="button"
              onClick={() => setOrigem('imovel')}
              className={`flex-1 text-sm font-medium py-2 rounded-xl border transition-colors ${
                origem === 'imovel' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              <Building2 size={14} className="inline mr-1.5" /> Imóvel cadastrado
            </button>
            <button type="button"
              onClick={() => setOrigem('upload')}
              className={`flex-1 text-sm font-medium py-2 rounded-xl border transition-colors ${
                origem === 'upload' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              <Upload size={14} className="inline mr-1.5" /> Enviar nova imagem
            </button>
          </div>

          {origem === 'imovel' ? (
            <div className="space-y-3">
              <div>
                <label className="label">Imóvel</label>
                {carregandoImoveis ? (
                  <p className="text-sm text-slate-400 flex items-center gap-2 py-2">
                    <Loader2 size={14} className="animate-spin" /> Carregando imóveis...
                  </p>
                ) : imoveis.length === 0 ? (
                  <p className="text-sm text-slate-400 py-2">Nenhum imóvel com fotos cadastradas ainda.</p>
                ) : (
                  <select className="input" value={imovelSelecionado}
                    onChange={e => { setImovelSelecionado(e.target.value); setFotoSelecionada('') }}>
                    <option value="">Selecione um imóvel...</option>
                    {imoveis.map(i => <option key={i.id} value={i.id}>{i.titulo}</option>)}
                  </select>
                )}
              </div>

              {imovelSelecionado && (
                <div>
                  <label className="label">Foto</label>
                  <div className="grid grid-cols-4 gap-2">
                    {imoveis.find(i => i.id === imovelSelecionado)?.fotos.map(f => (
                      <button key={f.id} type="button"
                        onClick={() => setFotoSelecionada(f.url)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          fotoSelecionada === f.url ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'
                        }`}>
                        <img src={f.url} alt="" className="w-full h-full object-cover" />
                        {fotoSelecionada === f.url && (
                          <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                            <Check size={20} className="text-white drop-shadow" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="label">Arquivo de imagem</label>
              <input ref={fileRef} type="file" accept="image/*"
                onChange={e => setArquivo(e.target.files?.[0] || null)}
                className="input" />
              {arquivo && (
                <img src={URL.createObjectURL(arquivo)} alt="" className="mt-3 w-full h-40 object-cover rounded-xl" />
              )}
            </div>
          )}

          <div>
            <label className="label">Legenda (opcional)</label>
            <input className="input" placeholder="Ex: Apartamento Jardins"
              value={tituloNovo} onChange={e => setTituloNovo(e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button type="button" onClick={handleAdicionar} disabled={salvando} className="btn-primary flex-1 justify-center gap-2">
              {salvando && <Loader2 size={15} className="animate-spin" />}
              Adicionar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function BannerSection({ titulo, descricao, lista, onAdd, onToggle, onDelete, onMove }: {
  titulo: string
  descricao: string
  lista: Banner[]
  onAdd: () => void
  onToggle: (b: Banner) => void
  onDelete: (b: Banner) => void
  onMove: (b: Banner, d: -1 | 1) => void
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-semibold text-slate-800">{titulo}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{descricao}</p>
        </div>
        <button onClick={onAdd} className="btn-primary whitespace-nowrap flex-shrink-0">
          <Plus size={15} /> Adicionar
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-xl">
          <ImageIcon size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma imagem configurada ainda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map((b, i) => (
            <div key={b.id} className={`rounded-xl border overflow-hidden ${b.ativo ? 'border-slate-200' : 'border-slate-200 opacity-50'}`}>
              <div className="h-32 bg-slate-100 relative">
                <img src={b.foto_url} alt={b.titulo || ''} className="w-full h-full object-cover" />
                {!b.ativo && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-full">Oculta</span>
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-sm font-medium text-slate-700 truncate">{b.titulo || 'Sem legenda'}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-0.5">
                    <button title="Mover para cima" disabled={i === 0} onClick={() => onMove(b, -1)}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent">
                      <ArrowUp size={14} />
                    </button>
                    <button title="Mover para baixo" disabled={i === lista.length - 1} onClick={() => onMove(b, 1)}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent">
                      <ArrowDown size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button title={b.ativo ? 'Ocultar' : 'Exibir'} onClick={() => onToggle(b)}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                      {b.ativo ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button title="Excluir" onClick={() => onDelete(b)}
                      className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
