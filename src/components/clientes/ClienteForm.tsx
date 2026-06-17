'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { calcularInteligenicia } from '@/lib/matching'
import { COMODIDADES_OPTIONS, formatPhone, formatCurrency, ETAPAS_FUNIL } from '@/lib/utils'
import { atualizarPipelineCliente } from '@/lib/pipeline'
import type { Cliente, FilhoDetalhe, EtapaFunil } from '@/types'
import { Loader2, Brain, AlertCircle, User, Home, Target, Search, ExternalLink, CheckCircle2 } from 'lucide-react'
import { buscarCep, formatarCep } from '@/lib/cep'

interface ClienteFormProps {
  cliente?: Cliente | null
  onSuccess: () => void
  onCancel: () => void
}

type Tab = 'basico' | 'pessoal' | 'preferencias'

const supabase = createClient()

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

const ESTADO_CIVIL_OPTS = [
  { value: 'solteiro',      label: 'Solteiro(a)' },
  { value: 'casado',        label: 'Casado(a)' },
  { value: 'divorciado',    label: 'Divorciado(a)' },
  { value: 'viuvo',         label: 'Viúvo(a)' },
  { value: 'uniao_estavel', label: 'União Estável' },
  { value: 'outro',         label: 'Outro' },
]

const MORADIA_OPTS = [
  { value: 'alugado',     label: 'Alugado' },
  { value: 'proprio',     label: 'Próprio (quitado)' },
  { value: 'financiado',  label: 'Financiado' },
  { value: 'familiar',    label: 'Casa de familiar' },
  { value: 'outro',       label: 'Outro' },
]

function formatCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function formatRG(v: string) {
  return v.replace(/\D/g, '').slice(0, 9)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,})$/, '$1-$2')
}

const emptyForm = {
  nome: '', telefone: '', email: '', faixa_renda: '',
  cpf: '', rg: '',
  // Endereço unificado
  endereco_tipo: 'residencial_atual',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  moradia_atual_tipo: '',
  moradia_atual_valor: '',
  moradia_quartos: 0,
  moradia_suites: 0,
  moradia_banheiros: 0,
  moradia_salas: 0,
  moradia_cozinhas: 0,
  moradia_varandas: 0,
  moradia_vagas_garagem: 0,
  moradia_quintal: false,
  moradia_area_servico: false,
  moradia_home_office: false,
  moradia_piscina: false,
  moradia_area_gourmet: false,
  moradia_observacao: '',
  possui_outros_imoveis: false,
  tipo_imovel: 'qualquer', objetivo: 'morar', zona_interesse: '',
  orcamento_min: '', orcamento_max: '',
  quartos_desejados: '', necessidades: [] as string[],
  etapa_funil: 'lead_novo', notas: '',
  // pessoal
  genero: '',
  estado_civil: '',
  data_nascimento: '',
  cidade_nascimento: '',
  estado_nascimento: '',
  filhos_quantidade: '0',
  filhos_detalhes: [] as FilhoDetalhe[],
  conjuge_nome: '',
  conjuge_profissao: '',
  conjuge_renda: '',
}

export default function ClienteForm({ cliente, onSuccess, onCancel }: ClienteFormProps) {
  const [form, setForm] = useState(emptyForm)
  const [tab, setTab] = useState<Tab>('basico')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inteligencia, setInteligencia] = useState<any>(null)
  const [cepLoading, setCepLoading] = useState(false)
  const [cepStatus, setCepStatus] = useState<'idle' | 'ok' | 'error'>('idle')

  useEffect(() => {
    if (cliente) {
      setForm({
        nome: cliente.nome || '',
        telefone: cliente.telefone || '',
        email: cliente.email || '',
        faixa_renda: cliente.faixa_renda?.toString() || '',
        cpf: cliente.cpf || '',
        rg: cliente.rg || '',
        endereco_tipo: cliente.endereco_tipo || 'residencial_atual',
        cep: cliente.cep || '',
        logradouro: cliente.logradouro || '',
        numero: cliente.numero || '',
        complemento: cliente.complemento || '',
        bairro: cliente.bairro || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        moradia_atual_tipo: cliente.moradia_atual_tipo || '',
        moradia_atual_valor: cliente.moradia_atual_valor?.toString() || '',
        moradia_quartos: cliente.moradia_quartos ?? 0,
        moradia_suites: cliente.moradia_suites ?? 0,
        moradia_banheiros: cliente.moradia_banheiros ?? 0,
        moradia_salas: cliente.moradia_salas ?? 0,
        moradia_cozinhas: cliente.moradia_cozinhas ?? 0,
        moradia_varandas: cliente.moradia_varandas ?? 0,
        moradia_vagas_garagem: cliente.moradia_vagas_garagem ?? 0,
        moradia_quintal: cliente.moradia_quintal ?? false,
        moradia_area_servico: cliente.moradia_area_servico ?? false,
        moradia_home_office: cliente.moradia_home_office ?? false,
        moradia_piscina: cliente.moradia_piscina ?? false,
        moradia_area_gourmet: cliente.moradia_area_gourmet ?? false,
        moradia_observacao: cliente.moradia_observacao || '',
        possui_outros_imoveis: cliente.possui_outros_imoveis || false,
        tipo_imovel: cliente.tipo_imovel || 'qualquer',
        objetivo: cliente.objetivo || 'morar',
        zona_interesse: cliente.zona_interesse || '',
        orcamento_min: cliente.orcamento_min?.toString() || '',
        orcamento_max: cliente.orcamento_max?.toString() || '',
        quartos_desejados: cliente.quartos_desejados?.toString() || '',
        necessidades: cliente.necessidades || [],
        etapa_funil: cliente.etapa_funil || 'lead_novo',
        notas: cliente.notas || '',
        genero: cliente.genero || '',
        estado_civil: cliente.estado_civil || '',
        data_nascimento: cliente.data_nascimento || '',
        cidade_nascimento: cliente.cidade_nascimento || '',
        estado_nascimento: cliente.estado_nascimento || '',
        filhos_quantidade: cliente.filhos_quantidade?.toString() || '0',
        filhos_detalhes: cliente.filhos_detalhes || [],
        conjuge_nome: cliente.conjuge_nome || '',
        conjuge_profissao: cliente.conjuge_profissao || '',
        conjuge_renda: cliente.conjuge_renda?.toString() || '',
      })
    }
  }, [cliente])

  useEffect(() => {
    if (form.faixa_renda || form.orcamento_max) {
      const intel = calcularInteligenicia({
        faixa_renda: form.faixa_renda ? Number(form.faixa_renda) : undefined,
        objetivo: form.objetivo as any,
        orcamento_max: form.orcamento_max ? Number(form.orcamento_max) : undefined,
        telefone: form.telefone,
        email: form.email,
        tipo_imovel: form.tipo_imovel as any,
        zona_interesse: form.zona_interesse as any,
        quartos_desejados: form.quartos_desejados ? Number(form.quartos_desejados) : undefined,
        necessidades: form.necessidades,
      })
      setInteligencia(intel)
    }
  }, [form.faixa_renda, form.orcamento_max, form.objetivo, form.tipo_imovel])

  const set = (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleCepChange = async (raw: string) => {
    const formatted = formatarCep(raw)
    setForm(p => ({ ...p, cep: formatted }))
    setCepStatus('idle')
    if (formatted.replace(/\D/g, '').length === 8) {
      setCepLoading(true)
      const dados = await buscarCep(formatted)
      setCepLoading(false)
      if (dados) {
        setForm(p => ({
          ...p,
          logradouro: dados.logradouro || p.logradouro,
          bairro: dados.bairro || p.bairro,
          cidade: dados.localidade || p.cidade,
          estado: dados.uf || p.estado,
          complemento: dados.complemento || p.complemento,
        }))
        setCepStatus('ok')
      } else {
        setCepStatus('error')
      }
    }
  }

  const handleNecessidade = (item: string) =>
    setForm(prev => ({
      ...prev,
      necessidades: prev.necessidades.includes(item)
        ? prev.necessidades.filter(n => n !== item)
        : [...prev.necessidades, item],
    }))

  // ── Filhos ────────────────────────────────────────────────────────────────
  const syncFilhos = (qtd: number) => {
    setForm(prev => {
      const cur = prev.filhos_detalhes
      if (qtd > cur.length) {
        const add = Array.from({ length: qtd - cur.length }, () => ({ genero: 'menino' as const }))
        return { ...prev, filhos_quantidade: qtd.toString(), filhos_detalhes: [...cur, ...add] }
      }
      return { ...prev, filhos_quantidade: qtd.toString(), filhos_detalhes: cur.slice(0, qtd) }
    })
  }

  const updateFilho = (idx: number, field: keyof FilhoDetalhe, value: string) =>
    setForm(prev => {
      const filhos = [...prev.filhos_detalhes]
      filhos[idx] = { ...filhos[idx], [field]: field === 'idade' ? (value ? Number(value) : undefined) : value }
      return { ...prev, filhos_detalhes: filhos }
    })

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw new Error('Erro de sessão: ' + sessionError.message)
      if (!session?.user) throw new Error('Usuário não autenticado.')

      const intel = calcularInteligenicia({
        faixa_renda: form.faixa_renda ? Number(form.faixa_renda) : undefined,
        objetivo: form.objetivo as any,
        orcamento_max: form.orcamento_max ? Number(form.orcamento_max) : undefined,
        telefone: form.telefone,
        email: form.email,
        tipo_imovel: form.tipo_imovel as any,
        zona_interesse: form.zona_interesse as any,
        quartos_desejados: form.quartos_desejados ? Number(form.quartos_desejados) : undefined,
        necessidades: form.necessidades,
      })

      const conjuge = form.estado_civil === 'casado' || form.estado_civil === 'uniao_estavel'

      const payload = {
        nome: form.nome,
        telefone: form.telefone || null,
        email: form.email || null,
        faixa_renda: form.faixa_renda ? Number(form.faixa_renda) : null,
        tipo_imovel: form.tipo_imovel,
        objetivo: form.objetivo,
        zona_interesse: form.zona_interesse || null,
        cidade: form.cidade || null,
        orcamento_min: form.orcamento_min ? Number(form.orcamento_min) : null,
        orcamento_max: form.orcamento_max ? Number(form.orcamento_max) : null,
        quartos_desejados: form.quartos_desejados ? Number(form.quartos_desejados) : null,
        necessidades: form.necessidades,
        etapa_funil: form.etapa_funil,
        notas: form.notas || null,
        cpf: form.cpf || null,
        rg: form.rg || null,
        // Endereço unificado
        endereco_tipo: form.endereco_tipo || 'residencial_atual',
        cep: form.cep || null,
        logradouro: form.logradouro || null,
        numero: form.numero || null,
        complemento: form.complemento || null,
        bairro: form.bairro || null,
        estado: form.estado || null,
        moradia_atual_tipo: form.moradia_atual_tipo || null,
        moradia_atual_valor: form.moradia_atual_valor ? Number(form.moradia_atual_valor) : null,
        moradia_quartos: form.moradia_quartos || 0,
        moradia_suites: form.moradia_suites || 0,
        moradia_banheiros: form.moradia_banheiros || 0,
        moradia_salas: form.moradia_salas || 0,
        moradia_cozinhas: form.moradia_cozinhas || 0,
        moradia_varandas: form.moradia_varandas || 0,
        moradia_vagas_garagem: form.moradia_vagas_garagem || 0,
        moradia_quintal: form.moradia_quintal,
        moradia_area_servico: form.moradia_area_servico,
        moradia_home_office: form.moradia_home_office,
        moradia_piscina: form.moradia_piscina,
        moradia_area_gourmet: form.moradia_area_gourmet,
        moradia_observacao: form.moradia_observacao || null,
        possui_outros_imoveis: form.possui_outros_imoveis,
        // pessoal
        genero: form.genero || null,
        estado_civil: form.estado_civil || null,
        data_nascimento: form.data_nascimento || null,
        cidade_nascimento: form.cidade_nascimento || null,
        estado_nascimento: form.estado_nascimento || null,
        filhos_quantidade: Number(form.filhos_quantidade) || 0,
        filhos_detalhes: form.filhos_detalhes,
        conjuge_nome: conjuge ? (form.conjuge_nome || null) : null,
        conjuge_profissao: conjuge ? (form.conjuge_profissao || null) : null,
        conjuge_renda: conjuge && form.conjuge_renda ? Number(form.conjuge_renda) : null,
        ...intel,
      }

      if (cliente) {
        // Se a etapa do funil mudou, adiciona entrada no historico
        let payloadFinal: any = { ...payload }
        if (cliente.etapa_funil && form.etapa_funil !== cliente.etapa_funil) {
          const etapaAnterior = ETAPAS_FUNIL[cliente.etapa_funil]?.label || cliente.etapa_funil
          const etapaNova = ETAPAS_FUNIL[form.etapa_funil as EtapaFunil]?.label || form.etapa_funil
          const novaEntrada = {
            data: new Date().toISOString(),
            tipo: 'sistema',
            descricao: `Etapa alterada manualmente (${etapaAnterior} -> ${etapaNova})`,
          }
          payloadFinal.historico = [...(cliente.historico || []), novaEntrada]
        }
        const { error: err } = await supabase.from('clientes').update(payloadFinal).eq('id', cliente.id)
        if (err) throw new Error('Erro ao atualizar: ' + err.message)
      } else {
        const { error: err } = await supabase.from('clientes').insert({ ...payload, user_id: session.user.id })
        if (err) throw new Error('Erro ao cadastrar: ' + err.message)
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  const temConjuge = form.estado_civil === 'casado' || form.estado_civil === 'uniao_estavel'
  const qtdFilhos = Number(form.filhos_quantidade) || 0

  const tabs = [
    { key: 'basico' as Tab, label: 'Dados Básicos', icon: <User size={14} /> },
    { key: 'pessoal' as Tab, label: 'Dados Pessoais', icon: <Home size={14} /> },
    { key: 'preferencias' as Tab, label: 'Preferências', icon: <Target size={14} /> },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /><span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
        {tabs.map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Básico ── */}
      {tab === 'basico' && (
        <div className="space-y-4">
          {inteligencia && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Brain size={15} className="text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">Perfil Automático</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {inteligencia.classe_economica && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {inteligencia.classe_economica === 'baixa' ? 'Classe C/D' : inteligencia.classe_economica === 'media' ? 'Classe B/C' : 'Classe A/B'}
                  </span>
                )}
                {inteligencia.perfil_comprador && (
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full capitalize">
                    {inteligencia.perfil_comprador.replace('_', ' ')}
                  </span>
                )}
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">Score: {inteligencia.score_potencial}%</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome completo *">
              <input className="input" value={form.nome} onChange={set('nome')} required placeholder="Nome do cliente" autoComplete="off" />
            </Field>
            <Field label="Telefone / WhatsApp">
              <input className="input" value={form.telefone}
                onChange={e => setForm(p => ({ ...p, telefone: formatPhone(e.target.value) }))}
                placeholder="(11) 99999-9999" />
            </Field>
            <Field label="E-mail">
              <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="email@exemplo.com" autoComplete="off" />
            </Field>
            <Field label="Renda mensal (R$)">
              <input className="input" type="number" min="0" value={form.faixa_renda} onChange={set('faixa_renda')} placeholder="Ex: 8000" />
            </Field>
            <Field label="CPF">
              <input className="input" value={form.cpf}
                onChange={e => setForm(p => ({ ...p, cpf: formatCPF(e.target.value) }))}
                placeholder="000.000.000-00" maxLength={14} />
            </Field>
            <Field label="RG">
              <input className="input" value={form.rg}
                onChange={e => setForm(p => ({ ...p, rg: formatRG(e.target.value) }))}
                placeholder="00.000.000-0" maxLength={12} />
            </Field>
            <Field label="Etapa no Funil">
              <select className="input" value={form.etapa_funil} onChange={set('etapa_funil')}>
                <option value="lead_novo">Lead Novo</option>
                <option value="contato_iniciado">Contato Iniciado</option>
                <option value="visita_agendada">Visita Agendada</option>
                <option value="proposta_enviada">Proposta Enviada</option>
                <option value="negociacao">Em Negociação</option>
                <option value="fechado">Fechado</option>
                <option value="perdido">Perdido</option>
              </select>
            </Field>
          </div>

          {/* ── Endereço / Moradia ── */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Endereço e Moradia</p>
              <a href="https://buscacepinter.correios.com.br/app/endereco/index.php"
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                <ExternalLink size={11} /> Não sei meu CEP
              </a>
            </div>

            {/* Tipo de endereço + Tipo de moradia + Aluguel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Tipo de endereço">
                <select className="input" value={form.endereco_tipo} onChange={set('endereco_tipo')}>
                  <option value="residencial_atual">Residencial Atual</option>
                  <option value="veraneio">Veraneio</option>
                  <option value="outro">Outro</option>
                </select>
              </Field>
              <Field label="Situação da moradia">
                <select className="input" value={form.moradia_atual_tipo} onChange={set('moradia_atual_tipo')}>
                  <option value="">— Selecione —</option>
                  {MORADIA_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              {form.moradia_atual_tipo === 'alugado' ? (
                <Field label="Valor médio do aluguel (R$)">
                  <input className="input" type="number" min="0" value={form.moradia_atual_valor} onChange={set('moradia_atual_valor')} placeholder="Ex: 1800" />
                </Field>
              ) : (
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-indigo-600"
                      checked={form.possui_outros_imoveis}
                      onChange={e => setForm(p => ({ ...p, possui_outros_imoveis: e.target.checked }))}
                    />
                    <span className="text-sm text-slate-700">Possui outros imóveis</span>
                  </label>
                </div>
              )}
            </div>

            {/* Checkbox "possui outros imóveis" quando alugado (não coube na linha acima) */}
            {form.moradia_atual_tipo === 'alugado' && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-indigo-600"
                  checked={form.possui_outros_imoveis}
                  onChange={e => setForm(p => ({ ...p, possui_outros_imoveis: e.target.checked }))}
                />
                <span className="text-sm text-slate-700">Possui outros imóveis</span>
              </label>
            )}

            {/* ── Cômodos e características da moradia atual ── */}
            {form.moradia_atual_tipo && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Detalhes da moradia atual</p>

                {/* Steppers — quantidades */}
                <div>
                  <p className="text-xs text-slate-400 mb-2">Cômodos</p>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {([
                      { key: 'moradia_quartos',      label: 'Quartos',   icon: '🛏️' },
                      { key: 'moradia_suites',        label: 'Suítes',    icon: '🛁' },
                      { key: 'moradia_banheiros',     label: 'Banheiros', icon: '🚿' },
                      { key: 'moradia_salas',         label: 'Salas',     icon: '🛋️' },
                      { key: 'moradia_cozinhas',      label: 'Cozinhas',  icon: '🍳' },
                      { key: 'moradia_varandas',      label: 'Varandas',  icon: '🌿' },
                      { key: 'moradia_vagas_garagem', label: 'Garagem',   icon: '🚗' },
                    ] as const).map(({ key, label, icon }) => (
                      <div key={key} className="flex flex-col items-center gap-1.5 bg-white rounded-xl border border-slate-200 py-3 px-2">
                        <span className="text-lg leading-none">{icon}</span>
                        <span className="text-xs text-slate-500 font-medium text-center leading-tight">{label}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <button type="button"
                            onClick={() => setForm(p => ({ ...p, [key]: Math.max(0, (p[key] as number) - 1) }))}
                            className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold leading-none transition-colors">−</button>
                          <span className="w-5 text-center text-sm font-semibold text-slate-800">{(form[key] as number) || 0}</span>
                          <button type="button"
                            onClick={() => setForm(p => ({ ...p, [key]: Math.min(10, (p[key] as number) + 1) }))}
                            className="w-6 h-6 rounded-full bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 flex items-center justify-center text-sm font-bold leading-none transition-colors">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checkboxes — extras */}
                <div>
                  <p className="text-xs text-slate-400 mb-2">Características extras</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {([
                      { key: 'moradia_quintal',      label: 'Quintal',        icon: '🌳' },
                      { key: 'moradia_area_servico', label: 'Área de Serviço', icon: '🧺' },
                      { key: 'moradia_home_office',  label: 'Home Office',    icon: '💻' },
                      { key: 'moradia_piscina',      label: 'Piscina',        icon: '🏊' },
                      { key: 'moradia_area_gourmet', label: 'Área Gourmet',   icon: '🍖' },
                    ] as const).map(({ key, label, icon }) => (
                      <label key={key}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all select-none ${
                          form[key as keyof typeof form]
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}>
                        <input type="checkbox" className="sr-only"
                          checked={!!form[key as keyof typeof form]}
                          onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} />
                        <span className="text-base leading-none">{icon}</span>
                        <span className="text-xs font-medium">{label}</span>
                        <span className={`ml-auto text-xs font-bold ${form[key as keyof typeof form] ? 'text-indigo-500' : 'text-slate-300'}`}>
                          {form[key as keyof typeof form] ? '✓' : '—'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CEP */}
            <div className="space-y-1">
              <label className="label">CEP</label>
              <div className="relative max-w-[160px]">
                <input
                  className={`input w-full pr-8 ${cepStatus === 'error' ? 'border-red-300 focus:border-red-400' : cepStatus === 'ok' ? 'border-green-400' : ''}`}
                  value={form.cep}
                  onChange={e => handleCepChange(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  {cepLoading && <Loader2 size={14} className="animate-spin text-slate-400" />}
                  {!cepLoading && cepStatus === 'ok' && <CheckCircle2 size={14} className="text-green-500" />}
                  {!cepLoading && cepStatus === 'error' && <Search size={14} className="text-red-400" />}
                </div>
              </div>
              {cepStatus === 'ok' && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={11} /> Endereço preenchido automaticamente.</p>}
              {cepStatus === 'error' && (
                <p className="text-xs text-red-500">CEP não encontrado. Preencha manualmente ou{' '}
                  <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noopener noreferrer" className="underline font-medium">busque aqui</a>.
                </p>
              )}
            </div>

            {/* Campos de endereço */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1">
                <label className="label">Logradouro</label>
                <input className="input" value={form.logradouro} onChange={set('logradouro')} placeholder="Rua, Av, Alameda..." />
              </div>
              <div className="space-y-1">
                <label className="label">Número</label>
                <input className="input" value={form.numero} onChange={set('numero')} placeholder="Ex: 123" />
              </div>
              <div className="space-y-1">
                <label className="label">Complemento</label>
                <input className="input" value={form.complemento} onChange={set('complemento')} placeholder="Apto, Bloco..." />
              </div>
              <div className="space-y-1">
                <label className="label">Bairro</label>
                <input className="input" value={form.bairro} onChange={set('bairro')} placeholder="Bairro" />
              </div>
              <div className="space-y-1">
                <label className="label">Cidade</label>
                <input className="input" value={form.cidade} onChange={set('cidade')} placeholder="Cidade" />
              </div>
              <div className="space-y-1">
                <label className="label">Estado (UF)</label>
                <select className="input" value={form.estado} onChange={set('estado')}>
                  <option value="">—</option>
                  {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>

            {/* Observação do endereço */}
            <Field label="Observação sobre a moradia">
              <textarea className="input min-h-[60px] resize-none" value={form.moradia_observacao} onChange={set('moradia_observacao')} placeholder="Ex: Apto 2 quartos, próximo ao metrô..." />
            </Field>
          </div>

          <Field label="Notas / Observações">
            <textarea className="input min-h-[80px] resize-none" value={form.notas} onChange={set('notas')} placeholder="Notas gerais sobre o cliente..." />
          </Field>
        </div>
      )}

      {/* ── Tab: Pessoal ── */}
      {tab === 'pessoal' && (
        <div className="space-y-5">

          {/* Identificação */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Identificação</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Gênero">
                <select className="input" value={form.genero} onChange={set('genero')}>
                  <option value="">— Selecione —</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Casal">Casal</option>
                  <option value="Outro">Outro</option>
                </select>
              </Field>
              <Field label="Estado Civil">
                <select className="input" value={form.estado_civil} onChange={set('estado_civil')}>
                  <option value="">— Selecione —</option>
                  {ESTADO_CIVIL_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Data de Nascimento">
                <input className="input" type="date" value={form.data_nascimento} onChange={set('data_nascimento')} />
              </Field>
              <Field label="Cidade de Nascimento">
                <input className="input" value={form.cidade_nascimento} onChange={set('cidade_nascimento')} placeholder="Ex: Campinas" />
              </Field>
              <Field label="Estado de Nascimento (UF)">
                <select className="input" value={form.estado_nascimento} onChange={set('estado_nascimento')}>
                  <option value="">— Selecione —</option>
                  {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* Cônjuge */}
          {temConjuge && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Dados do Cônjuge</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Nome do cônjuge">
                  <input className="input" value={form.conjuge_nome} onChange={set('conjuge_nome')} placeholder="Nome completo" />
                </Field>
                <Field label="Profissão">
                  <input className="input" value={form.conjuge_profissao} onChange={set('conjuge_profissao')} placeholder="Ex: Professora" />
                </Field>
                <Field label="Renda do cônjuge (R$)">
                  <input className="input" type="number" min="0" value={form.conjuge_renda} onChange={set('conjuge_renda')} placeholder="Ex: 5000" />
                </Field>
              </div>
            </div>
          )}

          {/* Filhos */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Filhos</p>
            <div className="flex items-center gap-3 mb-3">
              <Field label="Quantidade de filhos">
                <input className="input w-24" type="number" min="0" max="10"
                  value={form.filhos_quantidade}
                  onChange={e => syncFilhos(Number(e.target.value))} />
              </Field>
            </div>

            {form.filhos_detalhes.length > 0 && (
              <div className="space-y-2">
                {form.filhos_detalhes.map((filho, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="space-y-1">
                      <label className="label text-xs">Filho {idx + 1} — Gênero</label>
                      <select className="input text-sm" value={filho.genero}
                        onChange={e => updateFilho(idx, 'genero', e.target.value)}>
                        <option value="menino">Menino</option>
                        <option value="menina">Menina</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="label text-xs">Nome (opcional)</label>
                      <input className="input text-sm" value={filho.nome || ''}
                        onChange={e => updateFilho(idx, 'nome', e.target.value)}
                        placeholder="Nome" />
                    </div>
                    <div className="space-y-1">
                      <label className="label text-xs">Idade</label>
                      <input className="input text-sm" type="number" min="0" max="30"
                        value={filho.idade ?? ''}
                        onChange={e => updateFilho(idx, 'idade', e.target.value)}
                        placeholder="Anos" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── Tab: Preferências ── */}
      {tab === 'preferencias' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Tipo de Imóvel">
              <select className="input" value={form.tipo_imovel} onChange={set('tipo_imovel')}>
                <option value="qualquer">Qualquer</option>
                <option value="casa">Casa</option>
                <option value="apartamento">Apartamento</option>
                <option value="comercial">Comercial</option>
              </select>
            </Field>
            <Field label="Objetivo">
              <select className="input" value={form.objetivo} onChange={set('objetivo')}>
                <option value="morar">Morar</option>
                <option value="investir">Investir</option>
                <option value="alugar">Alugar</option>
              </select>
            </Field>
            <Field label="Quartos desejados">
              <select className="input" value={form.quartos_desejados} onChange={set('quartos_desejados')}>
                <option value="">Indiferente</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}
              </select>
            </Field>
            <Field label="Zona de interesse">
              <select className="input" value={form.zona_interesse} onChange={set('zona_interesse')}>
                <option value="">Qualquer zona</option>
                {['Norte','Sul','Leste','Oeste','Centro'].map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </Field>
            <Field label="Orçamento mínimo (R$)">
              <input className="input" type="number" min="0" value={form.orcamento_min} onChange={set('orcamento_min')} placeholder="Ex: 200000" />
            </Field>
            <Field label="Orçamento máximo (R$)">
              <input className="input" type="number" min="0" value={form.orcamento_max} onChange={set('orcamento_max')} placeholder="Ex: 500000" />
            </Field>
          </div>

          <div>
            <label className="label">Necessidades específicas</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COMODIDADES_OPTIONS.map(item => (
                <button type="button" key={item} onClick={() => handleNecessidade(item)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                    ${form.necessidades.includes(item)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
          {loading ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : (cliente ? 'Salvar alterações' : 'Cadastrar cliente')}
        </button>
      </div>
    </form>
  )
}
