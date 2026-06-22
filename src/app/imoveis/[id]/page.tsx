'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Modal from '@/components/ui/Modal'
import ImovelForm from '@/components/imoveis/ImovelForm'
import CalculadoraVenda from '@/components/imoveis/CalculadoraVenda'
import { createClient } from '@/lib/supabase'
import { calcularMatch, getMatchLabel } from '@/lib/matching'
import { formatCurrency, STATUS_IMOVEL } from '@/lib/utils'
import type { Imovel, Cliente, Profile } from '@/types'
import {
  ArrowLeft, Edit2, MapPin, Bed, Car, Bath,
  SquareStack, Zap, ChevronLeft, ChevronRight, FileText, Loader2, Expand, Calculator
} from 'lucide-react'
import Lightbox from '@/components/ui/Lightbox'

const supabase = createClient()

export default function ImovelDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [imovel, setImovel] = useState<Imovel | null>(null)
  const [matches, setMatches] = useState<{ cliente: Cliente; score: number }[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [fotoIdx, setFotoIdx] = useState(0)
  const [propostaOpen, setPropostaOpen] = useState(false)
  const [calculadoraOpen, setCalculadoraOpen] = useState(false)
  const [propostaClienteId, setPropostaClienteId] = useState('')
  const [gerando, setGerando] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(0)

  useEffect(() => { if (id) loadData() }, [id])

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const [{ data: imovelData }, { data: clientesData }, { data: profileData }] = await Promise.all([
      supabase.from('imoveis').select('*, fotos_imoveis(*)').eq('id', id).single(),
      supabase.from('clientes').select('*').eq('user_id', session.user.id).order('nome'),
      supabase.from('profiles').select('*').eq('id', session.user.id).single(),
    ])

    if (profileData) setProfile(profileData as any)
    setClientes((clientesData || []) as any)

    if (imovelData) {
      const mapped = { ...(imovelData as any), fotos: (imovelData as any).fotos_imoveis }
      setImovel(mapped)

      if (clientesData) {
        const results = clientesData
          .map((c: any) => ({ cliente: c as any, ...calcularMatch(c as any, mapped) }))
          .filter(r => r.score >= 40)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
        setMatches(results as any)
      }
    }
    setLoading(false)
  }

  const gerarProposta = () => {
    if (!imovel) return
    setGerando(true)

    const cliente = clientes.find(c => c.id === propostaClienteId)
    const foto = imovel.fotos?.[0]?.url || ''
    const endereco = [
      imovel.logradouro, imovel.numero ? `nº ${imovel.numero}` : '', imovel.complemento,
      imovel.bairro, imovel.cidade, imovel.estado
    ].filter(Boolean).join(', ')
    const dataHoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Proposta — ${imovel.titulo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #1e293b; background: white; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1d4ed8; padding-bottom: 20px; margin-bottom: 28px; }
  .logo-area { }
  .company { font-size: 22px; font-weight: bold; color: #1d4ed8; }
  .tagline { font-size: 12px; color: #64748b; margin-top: 2px; }
  .broker-info { text-align: right; font-size: 13px; color: #475569; }
  .broker-name { font-weight: bold; font-size: 15px; color: #1e293b; }
  .doc-title { background: linear-gradient(135deg, #1d4ed8, #4f46e5); color: white; padding: 20px 28px; border-radius: 12px; margin-bottom: 24px; }
  .doc-title h1 { font-size: 20px; margin-bottom: 4px; }
  .doc-title .date { font-size: 12px; opacity: 0.8; }
  .foto { width: 100%; height: 320px; object-fit: cover; border-radius: 12px; margin-bottom: 24px; }
  .foto-placeholder { width: 100%; height: 200px; background: #f1f5f9; border-radius: 12px; margin-bottom: 24px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 14px; }
  .price-badge { background: #1d4ed8; color: white; display: inline-block; padding: 10px 24px; border-radius: 30px; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
  .section { margin-bottom: 24px; }
  .section h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; }
  .specs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .spec { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .spec-num { font-size: 22px; font-weight: bold; color: #1d4ed8; }
  .spec-label { font-size: 11px; color: #64748b; margin-top: 2px; }
  .comodidades { display: flex; flex-wrap: wrap; gap: 8px; }
  .badge { background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 999px; font-size: 12px; }
  .address { background: #f8fafc; border-radius: 8px; padding: 14px; font-size: 13px; color: #475569; line-height: 1.6; }
  .description { font-size: 13px; color: #475569; line-height: 1.7; }
  .client-section { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; }
  .client-section h2 { border-bottom: 1px solid #86efac; color: #15803d; }
  .client-name { font-size: 18px; font-weight: bold; color: #15803d; margin-top: 4px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
  @media print {
    .page { padding: 20px; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-area">
      <div class="company">Siqueira</div>
      <div class="tagline">Inteligência Imobiliária</div>
    </div>
    <div class="broker-info">
      <div class="broker-name">${profile?.nome || 'Corretor'}</div>
      ${profile?.email ? `<div>${profile.email}</div>` : ''}
    </div>
  </div>

  <div class="doc-title">
    <h1>Proposta Comercial</h1>
    <div class="date">${dataHoje}</div>
  </div>

  ${foto
    ? `<img src="${foto}" alt="${imovel.titulo}" class="foto" />`
    : `<div class="foto-placeholder">📷 Sem foto disponível</div>`
  }

  <div class="price-badge">${formatCurrency(imovel.valor)}</div>

  <div class="section">
    <h2>Imóvel</h2>
    <p style="font-size:20px;font-weight:bold;margin-bottom:4px;">${imovel.titulo}</p>
    ${imovel.tipo ? `<p style="color:#64748b;font-size:13px;text-transform:capitalize;">${imovel.tipo}${imovel.zona ? ` · Zona ${imovel.zona}` : ''}</p>` : ''}
  </div>

  ${(imovel.quartos || imovel.banheiros || imovel.vagas || imovel.area_m2) ? `
  <div class="section">
    <h2>Características</h2>
    <div class="specs">
      ${imovel.quartos ? `<div class="spec"><div class="spec-num">${imovel.quartos}</div><div class="spec-label">Quartos</div></div>` : ''}
      ${imovel.banheiros ? `<div class="spec"><div class="spec-num">${imovel.banheiros}</div><div class="spec-label">Banheiros</div></div>` : ''}
      ${imovel.vagas ? `<div class="spec"><div class="spec-num">${imovel.vagas}</div><div class="spec-label">Vagas</div></div>` : ''}
      ${imovel.area_m2 ? `<div class="spec"><div class="spec-num">${imovel.area_m2}</div><div class="spec-label">m²</div></div>` : ''}
    </div>
  </div>` : ''}

  ${imovel.comodidades && imovel.comodidades.length > 0 ? `
  <div class="section">
    <h2>Comodidades</h2>
    <div class="comodidades">
      ${imovel.comodidades.map(c => `<span class="badge">${c}</span>`).join('')}
    </div>
  </div>` : ''}

  ${endereco ? `
  <div class="section">
    <h2>Localização</h2>
    <div class="address">${endereco}</div>
  </div>` : ''}

  ${imovel.descricao ? `
  <div class="section">
    <h2>Descrição</h2>
    <div class="description">${imovel.descricao}</div>
  </div>` : ''}

  ${cliente ? `
  <div class="section">
    <div class="client-section">
      <h2>Preparada para</h2>
      <div class="client-name">${cliente.nome}</div>
      ${cliente.telefone ? `<div style="font-size:13px;color:#475569;margin-top:4px;">${cliente.telefone}</div>` : ''}
      ${cliente.email ? `<div style="font-size:13px;color:#475569;">${cliente.email}</div>` : ''}
    </div>
  </div>` : ''}

  <div class="footer">
    Proposta gerada por Siqueira Inteligência Imobiliária • ${dataHoje}<br>
    Este documento é de uso exclusivo do destinatário.
  </div>
</div>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) {
      setGerando(false)
      return
    }
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.print(); setGerando(false) }, 700)
    setPropostaOpen(false)
  }

  if (loading) return <AppLayout title="Imóvel"><div className="text-center py-16 text-slate-400">Carregando...</div></AppLayout>
  if (!imovel) return <AppLayout title="Imóvel"><div className="text-center py-16 text-slate-400">Imóvel não encontrado.</div></AppLayout>

  const status = STATUS_IMOVEL[imovel.status]
  const fotos = imovel.fotos || []
  const capa = fotos[fotoIdx]?.url

  return (
    <AppLayout title={imovel.titulo}>
      <div className="max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.back()} className="btn-secondary p-2 flex-shrink-0"><ArrowLeft size={18} /></button>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-800 truncate">{imovel.titulo}</h2>
              <p className="text-sm text-blue-600 font-semibold">{formatCurrency(imovel.valor)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge ${status.color}`}>{status.label}</span>
            <button onClick={() => setCalculadoraOpen(true)} className="btn-secondary">
              <Calculator size={16} /> <span className="hidden sm:inline">Calcular venda</span>
            </button>
            <button onClick={() => setPropostaOpen(true)} className="btn-secondary">
              <FileText size={16} /> <span className="hidden sm:inline">Gerar Proposta</span>
            </button>
            <button onClick={() => setEditOpen(true)} className="btn-secondary">
              <Edit2 size={16} /> <span className="hidden sm:inline">Editar</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Col 1-2: Fotos + Info */}
          <div className="xl:col-span-2 space-y-5">

            {/* Galeria */}
            <div className="card !p-0 overflow-hidden">
              <div
                className="h-72 bg-slate-100 relative group cursor-zoom-in"
                onClick={() => { if (capa) { setLightboxIdx(fotoIdx); setLightboxOpen(true) } }}
              >
                {capa ? (
                  <>
                    <img src={capa} alt={imovel.titulo} className="w-full h-full object-cover" />
                    {/* Hover hint */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Expand size={28} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <SquareStack size={40} className="text-slate-300" />
                  </div>
                )}

                {/* Nav arrows */}
                {fotos.length > 1 && (
                  <>
                    <button
                      onClick={e => { e.stopPropagation(); setFotoIdx(i => Math.max(0, i - 1)) }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                      disabled={fotoIdx === 0}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setFotoIdx(i => Math.min(fotos.length - 1, i + 1)) }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                      disabled={fotoIdx === fotos.length - 1}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}

                {/* Counter */}
                {fotos.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <SquareStack size={10} /> {fotoIdx + 1}/{fotos.length}
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {fotos.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto bg-slate-50">
                  {fotos.map((foto, idx) => (
                    <button
                      key={foto.id}
                      onClick={() => setFotoIdx(idx)}
                      className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${idx === fotoIdx ? 'border-blue-500' : 'border-transparent opacity-70 hover:opacity-100'}`}
                    >
                      <img src={foto.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Detalhes */}
            <div className="card">
              <h3 className="font-semibold text-slate-800 mb-4">Detalhes do imóvel</h3>

              {(imovel.quartos != null || imovel.banheiros != null || imovel.vagas != null || imovel.area_m2 != null) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {imovel.quartos != null && (
                    <div className="text-center bg-slate-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-blue-600">{imovel.quartos}</p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1"><Bed size={11} /> Quartos</p>
                    </div>
                  )}
                  {imovel.banheiros != null && (
                    <div className="text-center bg-slate-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-blue-600">{imovel.banheiros}</p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1"><Bath size={11} /> Banheiros</p>
                    </div>
                  )}
                  {imovel.vagas != null && (
                    <div className="text-center bg-slate-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-blue-600">{imovel.vagas}</p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1"><Car size={11} /> Vagas</p>
                    </div>
                  )}
                  {imovel.area_m2 != null && (
                    <div className="text-center bg-slate-50 rounded-xl p-3">
                      <p className="text-2xl font-bold text-blue-600">{imovel.area_m2}</p>
                      <p className="text-xs text-slate-500 mt-1">m²</p>
                    </div>
                  )}
                </div>
              )}

              {(imovel.logradouro || imovel.bairro || imovel.cidade) && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Endereço</p>
                  <p className="text-sm text-slate-600 flex items-start gap-1.5">
                    <MapPin size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                    {[imovel.logradouro, imovel.numero ? `nº ${imovel.numero}` : '', imovel.complemento, imovel.bairro, imovel.cidade, imovel.estado].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}

              {imovel.comodidades && imovel.comodidades.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Comodidades</p>
                  <div className="flex flex-wrap gap-1.5">
                    {imovel.comodidades.map(c => (
                      <span key={c} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {imovel.descricao && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Descrição</p>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{imovel.descricao}</p>
                </div>
              )}
            </div>
          </div>

          {/* Col 3: Matches */}
          <div className="space-y-4">
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={18} className="text-amber-500" />
                <h3 className="font-semibold text-slate-800">Clientes compatíveis</h3>
              </div>
              {matches.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Nenhum cliente compatível encontrado.</p>
              ) : (
                <div className="space-y-3">
                  {matches.map(({ cliente, score }) => {
                    const match = getMatchLabel(score)
                    return (
                      <a key={cliente.id} href={`/clientes/${cliente.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-colors group">
                        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold text-blue-700">
                          {cliente.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-700">{cliente.nome}</p>
                          <p className="text-xs text-slate-400">{cliente.orcamento_max ? formatCurrency(cliente.orcamento_max) : 'Sem orçamento'}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${match.color}`}>{score}%</span>
                      </a>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          fotos={fotos.map(f => ({ url: f.url, descricao: f.descricao }))}
          index={lightboxIdx}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setLightboxIdx}
        />
      )}

      {/* Modal Editar */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Editar Imóvel" size="xl">
        <ImovelForm
          imovel={imovel}
          onSuccess={() => { setEditOpen(false); loadData() }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      {/* Modal Calculadora de Venda */}
      <Modal isOpen={calculadoraOpen} onClose={() => setCalculadoraOpen(false)} title="Calculadora de Venda" size="lg">
        <CalculadoraVenda
          imovel={imovel}
          onClose={() => setCalculadoraOpen(false)}
          onSalvo={loadData}
        />
      </Modal>

      {/* Modal Proposta */}
      <Modal isOpen={propostaOpen} onClose={() => setPropostaOpen(false)} title="Gerar Proposta" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Selecionar cliente (opcional)</label>
            <select
              className="input"
              value={propostaClienteId}
              onChange={e => setPropostaClienteId(e.target.value)}
            >
              <option value="">— Sem cliente específico —</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setPropostaOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={gerarProposta} disabled={gerando} className="btn-primary">
              {gerando ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              {gerando ? 'Gerando...' : 'Abrir PDF'}
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
