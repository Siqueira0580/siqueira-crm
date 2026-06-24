'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Sparkles, Users, Building2, FileText, TrendingUp,
  Brain, CheckCircle2, ChevronRight, ChevronLeft, X,
  LayoutDashboard, Calculator, Send, HelpCircle,
} from 'lucide-react'

const supabase = createClient()

// ─────────────────────────────────────────
// Definição das etapas
// ─────────────────────────────────────────
const ETAPAS = [
  {
    id: 'boas-vindas',
    icone: <Sparkles size={32} className="text-blue-500" />,
    titulo: 'Bem-vindo ao Siqueira CRM!',
    subtitulo: 'Seu sistema de gestão imobiliária',
    descricao:
      'Este breve tutorial vai mostrar como usar as principais funcionalidades. Leva menos de 2 minutos — mas você pode pular a qualquer momento.',
    cor: 'from-blue-50 to-indigo-50',
    bordaCor: 'border-blue-200',
    destaques: [
      { icon: <LayoutDashboard size={15} />, texto: 'Dashboard com métricas em tempo real' },
      { icon: <Users size={15} />,           texto: 'Gestão completa de clientes' },
      { icon: <Building2 size={15} />,       texto: 'Catálogo de imóveis integrado' },
      { icon: <FileText size={15} />,        texto: 'Propostas com simulação financeira' },
    ],
  },
  {
    id: 'clientes-imoveis',
    icone: <Users size={32} className="text-emerald-500" />,
    titulo: 'Clientes e Imóveis',
    subtitulo: 'A base do seu negócio',
    descricao:
      'Cadastre clientes com perfil completo: renda, objetivos, preferências e histórico. O sistema faz matching automático com os imóveis do catálogo.',
    cor: 'from-emerald-50 to-teal-50',
    bordaCor: 'border-emerald-200',
    destaques: [
      { icon: <Users size={15} />,     texto: 'Perfil detalhado: família, renda, objetivos' },
      { icon: <Building2 size={15} />, texto: 'Imóveis com fotos, valores e características' },
      { icon: <Brain size={15} />,     texto: 'Matching inteligente cliente ↔ imóvel' },
      { icon: <TrendingUp size={15} />,texto: 'Pipeline de negociações por etapa' },
    ],
  },
  {
    id: 'simulador-propostas',
    icone: <Calculator size={32} className="text-violet-500" />,
    titulo: 'Simulador e Propostas',
    subtitulo: 'Calcule e apresente com profissionalismo',
    descricao:
      'No perfil do cliente, simule a compra de qualquer imóvel: entrada, prazo, sistema SAC ou PRICE, ITBI e cartório. Gere um PDF e envie por WhatsApp ou e-mail.',
    cor: 'from-violet-50 to-purple-50',
    bordaCor: 'border-violet-200',
    destaques: [
      { icon: <Calculator size={15} />, texto: 'Simulação SAC e PRICE com cálculo de ITBI' },
      { icon: <FileText size={15} />,   texto: 'PDF gerado automaticamente no navegador' },
      { icon: <Send size={15} />,       texto: 'Envio direto por WhatsApp ou e-mail' },
      { icon: <FileText size={15} />,   texto: 'Página Propostas: histórico e reenvio' },
    ],
  },
  {
    id: 'pipeline-ia',
    icone: <TrendingUp size={32} className="text-amber-500" />,
    titulo: 'Pipeline e Ferramentas de IA',
    subtitulo: 'Acompanhe e acelere suas negociações',
    descricao:
      'Visualize todas as negociações em um funil Kanban. Use a Análise IA para entender o comportamento dos clientes e o Radar de Leads para identificar oportunidades.',
    cor: 'from-amber-50 to-orange-50',
    bordaCor: 'border-amber-200',
    destaques: [
      { icon: <TrendingUp size={15} />, texto: 'Pipeline Kanban: do lead ao fechamento' },
      { icon: <Brain size={15} />,      texto: 'Análise IA: comportamento e perfil' },
      { icon: <LayoutDashboard size={15} />, texto: 'Radar de leads com score automático' },
      { icon: <HelpCircle size={15} />, texto: 'Página Ajuda com guia de cálculo completo' },
    ],
  },
  {
    id: 'concluido',
    icone: <CheckCircle2 size={32} className="text-green-500" />,
    titulo: 'Tudo pronto!',
    subtitulo: 'Você já pode começar',
    descricao:
      'Acesse a página Ajuda a qualquer momento pelo menu lateral para rever este tutorial e consultar o guia completo de cálculo financeiro.',
    cor: 'from-green-50 to-emerald-50',
    bordaCor: 'border-green-200',
    destaques: [
      { icon: <Users size={15} />,      texto: 'Comece cadastrando seu primeiro cliente' },
      { icon: <Building2 size={15} />,  texto: 'Adicione imóveis ao catálogo' },
      { icon: <HelpCircle size={15} />, texto: 'Dúvidas? Menu → Ajuda' },
      { icon: <Sparkles size={15} />,   texto: 'Boas vendas!' },
    ],
  },
]

// ─────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────
interface Props {
  onConcluir: () => void
}

export default function PrimeiroAcessoWizard({ onConcluir }: Props) {
  const [etapa, setEtapa]         = useState(0)
  const [salvando, setSalvando]   = useState(false)

  const atual = ETAPAS[etapa]
  const total = ETAPAS.length
  const isUltima = etapa === total - 1

  const concluir = async () => {
    setSalvando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await fetch('/api/perfil/onboarding', {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
      }
    } catch { /* silencioso */ }
    finally {
      setSalvando(false)
      onConcluir()
    }
  }

  return (
    /* Overlay */
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Fundo desfocado */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">

        {/* Botão fechar / pular */}
        <button
          onClick={concluir}
          title="Pular tutorial"
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Topo colorido com ícone */}
        <div className={`bg-gradient-to-br ${atual.cor} px-8 pt-10 pb-6 flex flex-col items-center text-center border-b ${atual.bordaCor}`}>
          <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center mb-4">
            {atual.icone}
          </div>
          <h2 className="text-xl font-bold text-slate-800">{atual.titulo}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{atual.subtitulo}</p>
        </div>

        {/* Corpo */}
        <div className="px-8 py-6 flex-1">
          <p className="text-sm text-slate-600 leading-relaxed mb-5">{atual.descricao}</p>

          <ul className="space-y-2.5">
            {atual.destaques.map((d, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
                <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                  {d.icon}
                </span>
                {d.texto}
              </li>
            ))}
          </ul>
        </div>

        {/* Rodapé com paginação e botões */}
        <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-between gap-3">
          {/* Indicadores de etapa */}
          <div className="flex gap-1.5">
            {ETAPAS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === etapa ? 'w-6 bg-blue-500' : i < etapa ? 'w-3 bg-blue-200' : 'w-3 bg-slate-200'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Voltar */}
            {etapa > 0 && !isUltima && (
              <button
                onClick={() => setEtapa(e => e - 1)}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft size={15} /> Voltar
              </button>
            )}

            {/* Pular */}
            {!isUltima && (
              <button
                onClick={concluir}
                className="text-sm text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Não mostrar mais
              </button>
            )}

            {/* Próximo / Concluir */}
            {isUltima ? (
              <button
                onClick={concluir}
                disabled={salvando}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors disabled:opacity-60"
              >
                <CheckCircle2 size={15} />
                {salvando ? 'Salvando...' : 'Começar agora!'}
              </button>
            ) : (
              <button
                onClick={() => setEtapa(e => e + 1)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors"
              >
                Próximo <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
