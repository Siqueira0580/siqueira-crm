'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Sparkles, Users, Building2, FileText, TrendingUp,
  Brain, CheckCircle2, ChevronRight, ChevronLeft, X,
  LayoutDashboard, Calculator, Send, HelpCircle,
  Radar, Target, BarChart3, MessageCircle, Mail,
  Zap, Eye, AlertTriangle, Home, DollarSign,
  ArrowRight, Star, Clock, Phone,
} from 'lucide-react'

const supabase = createClient()

// ─────────────────────────────────────────────────────────────────
// Mini-ilustrações SVG por módulo
// ─────────────────────────────────────────────────────────────────

function IlusBemVindo() {
  return (
    <svg viewBox="0 0 260 120" className="w-full h-28" fill="none">
      {/* Sidebar */}
      <rect x="8" y="8" width="52" height="104" rx="6" fill="#1e3a5f" />
      <rect x="16" y="22" width="36" height="5" rx="2.5" fill="#fff" fillOpacity=".3" />
      <rect x="16" y="34" width="36" height="5" rx="2.5" fill="#fff" fillOpacity=".2" />
      <rect x="16" y="46" width="36" height="5" rx="2.5" fill="#fff" fillOpacity=".2" />
      <rect x="16" y="58" width="36" height="5" rx="2.5" fill="#3b82f6" />
      <rect x="16" y="70" width="36" height="5" rx="2.5" fill="#fff" fillOpacity=".2" />
      {/* Main */}
      <rect x="68" y="8" width="184" height="104" rx="6" fill="#f8fafc" />
      {/* Cards KPI */}
      {[0,1,2,3].map(i => (
        <g key={i}>
          <rect x={76 + i*44} y="18" width="38" height="26" rx="4" fill="white" stroke="#e2e8f0" strokeWidth="1" />
          <rect x={82 + i*44} y="24" width="16" height="3" rx="1.5" fill="#94a3b8" />
          <rect x={82 + i*44} y="30" width="24" height="5" rx="2" fill={['#3b82f6','#10b981','#f59e0b','#8b5cf6'][i]} />
        </g>
      ))}
      {/* Chart */}
      <rect x="76" y="52" width="108" height="52" rx="4" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      <polyline points="86,94 100,78 114,85 128,68 142,74 156,60 170,65" stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* List */}
      <rect x="192" y="52" width="52" height="52" rx="4" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      {[0,1,2,3].map(i => (
        <rect key={i} x="198" y={60 + i*11} width="40" height="6" rx="3" fill="#f1f5f9" />
      ))}
    </svg>
  )
}

function IlusClientes() {
  return (
    <svg viewBox="0 0 260 120" className="w-full h-28" fill="none">
      {/* Card cliente */}
      <rect x="8" y="8" width="150" height="104" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
      {/* Avatar */}
      <circle cx="42" cy="36" r="18" fill="#dbeafe" />
      <circle cx="42" cy="30" r="8" fill="#93c5fd" />
      <ellipse cx="42" cy="50" rx="13" ry="7" fill="#93c5fd" />
      {/* Info */}
      <rect x="68" y="24" width="70" height="6" rx="3" fill="#1e293b" />
      <rect x="68" y="34" width="50" height="4" rx="2" fill="#94a3b8" />
      <rect x="68" y="42" width="60" height="4" rx="2" fill="#94a3b8" />
      {/* Tags */}
      <rect x="16" y="62" width="40" height="14" rx="7" fill="#dbeafe" />
      <rect x="16" y="68" width="40" height="2" rx="1" fill="#3b82f6" />
      <rect x="62" y="62" width="44" height="14" rx="7" fill="#dcfce7" />
      <rect x="62" y="68" width="44" height="2" rx="1" fill="#10b981" />
      {/* Progress */}
      <rect x="16" y="85" width="124" height="6" rx="3" fill="#f1f5f9" />
      <rect x="16" y="85" width="80" height="6" rx="3" fill="#3b82f6" />
      <rect x="16" y="96" width="60" height="4" rx="2" fill="#94a3b8" />
      {/* Imóvel match */}
      <rect x="168" y="8" width="84" height="50" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
      <rect x="168" y="8" width="84" height="20" rx="8" fill="#f0fdf4" />
      <rect x="168" y="20" width="84" height="8" fill="#f0fdf4" />
      <rect x="174" y="13" width="40" height="4" rx="2" fill="#10b981" />
      <rect x="174" y="36" width="50" height="4" rx="2" fill="#1e293b" />
      <rect x="174" y="44" width="35" height="4" rx="2" fill="#94a3b8" />
      <text x="222" y="19" fontSize="8" fill="#10b981" fontWeight="bold">98%</text>
      {/* Arrow match */}
      <path d="M158 34 L168 34" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 2" markerEnd="url(#arr)" />
      {/* Imóvel 2 */}
      <rect x="168" y="66" width="84" height="46" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
      <rect x="174" y="74" width="40" height="4" rx="2" fill="#1e293b" />
      <rect x="174" y="82" width="35" height="4" rx="2" fill="#94a3b8" />
      <text x="222" y="79" fontSize="8" fill="#f59e0b" fontWeight="bold">74%</text>
    </svg>
  )
}

function IlusSimulador() {
  return (
    <svg viewBox="0 0 260 120" className="w-full h-28" fill="none">
      {/* Painel simulador */}
      <rect x="8" y="8" width="140" height="104" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
      <rect x="8" y="8" width="140" height="22" rx="8" fill="#7c3aed" />
      <rect x="8" y="22" width="140" height="8" fill="#7c3aed" />
      <rect x="14" y="14" width="80" height="5" rx="2" fill="white" fillOpacity=".9" />
      {/* Campos */}
      {[0,1,2,3].map(i => (
        <g key={i}>
          <rect x="14" y={38 + i*18} width="48" height="4" rx="2" fill="#94a3b8" />
          <rect x="14" y={44 + i*18} width="120" height="8" rx="3" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
        </g>
      ))}
      {/* Botão calcular */}
      <rect x="14" y="108" width="120" height="0" rx="4" fill="#7c3aed" />
      {/* Resultado */}
      <rect x="156" y="8" width="96" height="104" rx="8" fill="#faf5ff" stroke="#e9d5ff" strokeWidth="1.5" />
      <rect x="162" y="16" width="60" height="4" rx="2" fill="#94a3b8" />
      <rect x="162" y="26" width="80" height="8" rx="4" fill="white" stroke="#e9d5ff" strokeWidth="1" />
      <rect x="162" y="26" width="80" height="8" rx="4" fill="white" />
      <rect x="164" y="28" width="50" height="4" rx="2" fill="#7c3aed" />
      {[0,1,2,3,4].map(i => (
        <g key={i}>
          <rect x="162" y={42 + i*14} width="42" height="3" rx="1.5" fill="#94a3b8" />
          <rect x="200" y={42 + i*14} width="46" height="3" rx="1.5" fill={i===0||i===3?'#7c3aed':'#1e293b'} />
        </g>
      ))}
      {/* PDF badge */}
      <rect x="162" y="104" width="36" height="0" rx="10" fill="#dcfce7" />
    </svg>
  )
}

function IlusPipeline() {
  const colunas = [
    { label: 'Lead', cor: '#94a3b8', cards: 2 },
    { label: 'Visita', cor: '#3b82f6', cards: 1 },
    { label: 'Proposta', cor: '#f59e0b', cards: 2 },
    { label: 'Fechado', cor: '#10b981', cards: 1 },
  ]
  return (
    <svg viewBox="0 0 260 120" className="w-full h-28" fill="none">
      {colunas.map((col, ci) => (
        <g key={ci}>
          <rect x={8 + ci*63} y="8" width="56" height="104" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
          <rect x={8 + ci*63} y="8" width="56" height="16" rx="6" fill={col.cor} fillOpacity=".15" />
          <rect x={8 + ci*63} y="18" width="56" height="6" fill={col.cor} fillOpacity=".15" />
          <rect x={14 + ci*63} y="12" width="30" height="4" rx="2" fill={col.cor} />
          {Array.from({length: col.cards}).map((_, ri) => (
            <g key={ri}>
              <rect x={12 + ci*63} y={30 + ri*34} width="48" height="28" rx="4" fill="white" stroke="#e2e8f0" strokeWidth="1" />
              <rect x={16 + ci*63} y={35 + ri*34} width="28" height="4" rx="2" fill="#1e293b" />
              <rect x={16 + ci*63} y={43 + ri*34} width="20" height="3" rx="1.5" fill="#94a3b8" />
              <rect x={16 + ci*63} y={50 + ri*34} width="36" height="3" rx="1.5" fill={col.cor} fillOpacity=".4" />
            </g>
          ))}
        </g>
      ))}
    </svg>
  )
}

function IlusIA() {
  return (
    <svg viewBox="0 0 260 120" className="w-full h-28" fill="none">
      {/* Cérebro estilizado */}
      <circle cx="70" cy="60" r="48" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1.5" />
      <circle cx="70" cy="60" r="32" fill="#dbeafe" />
      {/* Nós */}
      {[[70,28],[70,92],[38,60],[102,60],[50,38],[90,38],[50,82],[90,82]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="5" fill="#3b82f6" />
      ))}
      {/* Conexões */}
      {[[70,28,38,60],[70,28,102,60],[70,28,50,38],[70,28,90,38],
        [38,60,50,38],[38,60,50,82],[102,60,90,38],[102,60,90,82],
        [70,92,50,82],[70,92,90,82]].map(([x1,y1,x2,y2],i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#93c5fd" strokeWidth="1.2" />
      ))}
      <circle cx="70" cy="60" r="10" fill="#3b82f6" />
      <circle cx="70" cy="60" r="6" fill="white" />
      {/* Score card */}
      <rect x="130" y="8" width="122" height="104" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
      <rect x="136" y="16" width="60" height="4" rx="2" fill="#94a3b8" />
      {/* Score gauge */}
      <circle cx="192" cy="50" r="24" fill="#eff6ff" stroke="#dbeafe" strokeWidth="2" />
      <path d="M173 62 A24 24 0 1 1 211 62" stroke="#3b82f6" strokeWidth="5" fill="none" strokeLinecap="round" />
      <text x="183" y="54" fontSize="13" fontWeight="bold" fill="#1e293b">87</text>
      <text x="181" y="63" fontSize="7" fill="#94a3b8">score</text>
      {/* Tags */}
      {['Comprador ativo','Renda alta','Pronto'].map((t,i) => (
        <g key={i}>
          <rect x="136" y={82 + i*10} width="40" height="7" rx="3.5" fill={['#dbeafe','#dcfce7','#fef3c7'][i]} />
          <rect x="138" y={84.5 + i*10} width="36" height="2" rx="1" fill={['#3b82f6','#10b981','#f59e0b'][i]} />
        </g>
      ))}
      <rect x="180" y="82" width="66" height="28" rx="4" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="184" y="87" width="50" height="3" rx="1.5" fill="#94a3b8" />
      <rect x="184" y="93" width="40" height="3" rx="1.5" fill="#94a3b8" />
      <rect x="184" y="99" width="45" height="3" rx="1.5" fill="#3b82f6" />
    </svg>
  )
}

function IlusRadar() {
  return (
    <svg viewBox="0 0 260 120" className="w-full h-28" fill="none">
      {/* Radar background */}
      <circle cx="80" cy="62" r="52" fill="#0f172a" />
      {[42,30,18,8].map((r,i) => (
        <circle key={i} cx="80" cy="62" r={r} fill="none" stroke="#22d3ee" strokeOpacity={0.15 + i*0.1} strokeWidth="1" />
      ))}
      {/* Linhas de varredura */}
      {[0,45,90,135].map(a => {
        const rad = a * Math.PI / 180
        return <line key={a} x1="80" y1="62" x2={80+50*Math.cos(rad)} y2={62+50*Math.sin(rad)} stroke="#22d3ee" strokeOpacity=".2" strokeWidth="1" />
      })}
      {/* Setor varrido */}
      <path d="M80 62 L80 20 A42 42 0 0 1 117 83 Z" fill="#22d3ee" fillOpacity=".08" />
      <path d="M80 62 L80 20 A42 42 0 0 1 117 83 Z" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeOpacity=".4" />
      {/* Leads detectados */}
      <circle cx="100" cy="30" r="5" fill="#f59e0b" />
      <circle cx="100" cy="30" r="9" fill="#f59e0b" fillOpacity=".3" />
      <circle cx="115" cy="55" r="4" fill="#ef4444" />
      <circle cx="115" cy="55" r="7" fill="#ef4444" fillOpacity=".3" />
      <circle cx="58" cy="35" r="3" fill="#22d3ee" fillOpacity=".6" />
      {/* Painel leads */}
      <rect x="142" y="8" width="110" height="104" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
      <rect x="148" y="15" width="55" height="4" rx="2" fill="#94a3b8" />
      {[
        { nome: 'Ana Lima', score: 92, cor: '#ef4444', w: 74 },
        { nome: 'Carlos M.', score: 78, cor: '#f59e0b', w: 58 },
        { nome: 'Marta S.', score: 61, cor: '#3b82f6', w: 44 },
      ].map((l,i) => (
        <g key={i}>
          <rect x="148" y={26 + i*32} width="96" height="26" rx="5" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
          <circle cx="159" cy={39 + i*32} r="7" fill={l.cor} fillOpacity=".2" />
          <circle cx="159" cy={39 + i*32} r="4" fill={l.cor} />
          <rect x="170" y={32 + i*32} width="36" height="3.5" rx="1.5" fill="#1e293b" />
          <rect x="170" y={39 + i*32} width={l.w * 0.5} height="3" rx="1.5" fill={l.cor} fillOpacity=".3" />
          <text x="226" y={40 + i*32} fontSize="8" fontWeight="bold" fill={l.cor}>{l.score}</text>
        </g>
      ))}
      <rect x="148" y="104" width="96" height="0" rx="4" fill="#3b82f6" />
    </svg>
  )
}

function IlusCaptacao() {
  return (
    <svg viewBox="0 0 260 120" className="w-full h-28" fill="none">
      {/* Imóvel */}
      <rect x="8" y="40" width="90" height="72" rx="0" fill="#1e3a5f" />
      <polygon points="8,40 53,8 98,40" fill="#1e3a5f" />
      <rect x="8" y="40" width="90" height="72" rx="0" fill="#dbeafe" fillOpacity=".1" />
      <rect x="24" y="70" width="20" height="42" rx="2" fill="#1e3a5f" stroke="#93c5fd" strokeWidth="1" />
      <rect x="54" y="55" width="30" height="25" rx="2" fill="#1e3a5f" stroke="#93c5fd" strokeWidth="1" />
      <circle cx="75" cy="67" r="3" fill="#93c5fd" />
      {/* Badge */}
      <rect x="70" y="5" width="50" height="22" rx="6" fill="#10b981" />
      <text x="82" y="20" fontSize="9" fontWeight="bold" fill="white">À venda</text>
      {/* Painel captação */}
      <rect x="108" y="8" width="144" height="104" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
      <rect x="108" y="8" width="144" height="20" rx="8" fill="#f0fdf4" />
      <rect x="108" y="20" width="144" height="8" fill="#f0fdf4" />
      <rect x="114" y="13" width="60" height="5" rx="2" fill="#10b981" />
      {/* Checklist */}
      {['Documentação','Fotos profissionais','Precificação','Divulgação','Contrato'].map((item,i) => (
        <g key={i}>
          <circle cx="118" cy={38 + i*16} r="5" fill={i < 3 ? '#10b981' : '#e2e8f0'} />
          {i < 3 && <path d={`M115 ${38 + i*16} L117 ${40 + i*16} L121 ${36 + i*16}`} stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />}
          <rect x="128" y={35 + i*16} width={[52,66,48,60,44][i]} height="4" rx="2" fill={i < 3 ? '#1e293b' : '#94a3b8'} />
        </g>
      ))}
      {/* Modelo de email */}
      <rect x="108" y="102" width="144" height="0" rx="5" fill="#dbeafe" />
    </svg>
  )
}

function IlusConcluido() {
  return (
    <svg viewBox="0 0 260 120" className="w-full h-28" fill="none">
      <circle cx="130" cy="60" r="52" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="2" />
      <circle cx="130" cy="60" r="38" fill="#dcfce7" />
      <circle cx="130" cy="60" r="24" fill="#10b981" />
      <path d="M118 60 L126 68 L142 52" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Estrelas */}
      {[[40,25],[220,25],[40,95],[220,95],[130,12]].map(([x,y],i) => (
        <path key={i} d={`M${x} ${y-5} L${x+2} ${y-1} L${x+6} ${y-1} L${x+3} ${y+2} L${x+4} ${y+6} L${x} ${y+3} L${x-4} ${y+6} L${x-3} ${y+2} L${x-6} ${y-1} L${x-2} ${y-1} Z`}
          fill="#fbbf24" opacity={0.6 + i*0.08} />
      ))}
      {/* Confetes */}
      {[[60,20,'#3b82f6'],[190,30,'#f59e0b'],[55,80,'#8b5cf6'],[195,85,'#10b981'],[90,105,'#ef4444'],[170,108,'#3b82f6']].map(([x,y,c],i) => (
        <rect key={i} x={x as number} y={y as number} width="6" height="6" rx="1" fill={c as string} opacity=".7" transform={`rotate(${i*25} ${x as number+3} ${y as number+3})`} />
      ))}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────
// Etapas do wizard
// ─────────────────────────────────────────────────────────────────
const ETAPAS = [
  {
    id: 'boas-vindas',
    icone: <Sparkles size={28} className="text-blue-500" />,
    titulo: 'Bem-vindo ao Siqueira CRM!',
    subtitulo: 'Plataforma completa de gestão imobiliária',
    descricao: 'Este tutorial vai apresentar todos os módulos do sistema em menos de 3 minutos. Você pode navegar entre as etapas ou pular a qualquer momento.',
    cor: 'from-blue-600 to-indigo-700',
    ilustracao: <IlusBemVindo />,
    destaques: [
      { icon: <Users size={14} />,       cor: 'bg-blue-100 text-blue-600',   texto: 'Gestão completa de clientes e imóveis' },
      { icon: <Calculator size={14} />,  cor: 'bg-violet-100 text-violet-600', texto: 'Simulador financeiro com PDF automático' },
      { icon: <Brain size={14} />,       cor: 'bg-indigo-100 text-indigo-600', texto: 'Análise de IA e Radar de leads' },
      { icon: <TrendingUp size={14} />,  cor: 'bg-emerald-100 text-emerald-600', texto: 'Pipeline Kanban e ferramentas de captação' },
    ],
  },
  {
    id: 'clientes-imoveis',
    icone: <Users size={28} className="text-emerald-500" />,
    titulo: 'Clientes e Imóveis',
    subtitulo: 'A base de toda negociação',
    descricao: 'Cadastre clientes com perfil completo — renda, família, objetivos e preferências. O sistema faz matching automático pontuando cada imóvel do catálogo.',
    cor: 'from-emerald-600 to-teal-700',
    ilustracao: <IlusClientes />,
    destaques: [
      { icon: <Users size={14} />,      cor: 'bg-emerald-100 text-emerald-600', texto: 'Perfil: renda familiar, filhos, objetivos e zona' },
      { icon: <Building2 size={14} />,  cor: 'bg-teal-100 text-teal-600',      texto: 'Catálogo de imóveis com fotos e status' },
      { icon: <Star size={14} />,       cor: 'bg-amber-100 text-amber-600',    texto: 'Matching automático com score de compatibilidade' },
      { icon: <BarChart3 size={14} />,  cor: 'bg-blue-100 text-blue-600',      texto: 'Histórico de interações e anotações por cliente' },
    ],
  },
  {
    id: 'simulador-propostas',
    icone: <Calculator size={28} className="text-violet-500" />,
    titulo: 'Simulador e Propostas',
    subtitulo: 'Calcule, apresente e feche negócios',
    descricao: 'No perfil do cliente simule a compra com SAC ou PRICE, entrada, prazo, ITBI e cartório. Gere o PDF no navegador e envie por WhatsApp ou e-mail em segundos.',
    cor: 'from-violet-600 to-purple-700',
    ilustracao: <IlusSimulador />,
    destaques: [
      { icon: <Calculator size={14} />,  cor: 'bg-violet-100 text-violet-600', texto: 'SAC (parcela decrescente) e PRICE (parcela fixa)' },
      { icon: <DollarSign size={14} />,  cor: 'bg-purple-100 text-purple-600', texto: 'ITBI automático — com isenção SFH quando aplicável' },
      { icon: <FileText size={14} />,    cor: 'bg-indigo-100 text-indigo-600', texto: 'PDF gerado no navegador, sem servidor externo' },
      { icon: <Send size={14} />,        cor: 'bg-blue-100 text-blue-600',     texto: 'Envio direto por WhatsApp e e-mail transacional' },
    ],
  },
  {
    id: 'pipeline',
    icone: <TrendingUp size={28} className="text-amber-500" />,
    titulo: 'Pipeline de Negociações',
    subtitulo: 'Do lead ao fechamento em um só lugar',
    descricao: 'Visualize todas as negociações em um funil Kanban com 7 etapas. Mova cards entre colunas, consulte o histórico e nunca perca o fio de uma negociação.',
    cor: 'from-amber-500 to-orange-600',
    ilustracao: <IlusPipeline />,
    destaques: [
      { icon: <TrendingUp size={14} />,  cor: 'bg-amber-100 text-amber-600',  texto: '7 etapas: Lead → Contato → Visita → Proposta → Fechado' },
      { icon: <Eye size={14} />,         cor: 'bg-orange-100 text-orange-600',texto: 'Visão completa de todas as negociações em andamento' },
      { icon: <Clock size={14} />,       cor: 'bg-red-100 text-red-600',      texto: 'Alertas de tempo parado em cada etapa' },
      { icon: <BarChart3 size={14} />,   cor: 'bg-blue-100 text-blue-600',    texto: 'Histórico completo de ações por negociação' },
    ],
  },
  {
    id: 'analise-ia',
    icone: <Brain size={28} className="text-indigo-500" />,
    titulo: 'Análise de Inteligência Artificial',
    subtitulo: 'Entenda cada cliente em profundidade',
    descricao: 'O módulo de IA analisa o comportamento, o perfil financeiro e os padrões de interação de cada cliente, gerando um score e recomendações personalizadas para abordagem.',
    cor: 'from-indigo-600 to-blue-700',
    ilustracao: <IlusIA />,
    destaques: [
      { icon: <Brain size={14} />,      cor: 'bg-indigo-100 text-indigo-600', texto: 'Score comportamental: intenção de compra de 0 a 100' },
      { icon: <Target size={14} />,     cor: 'bg-blue-100 text-blue-600',     texto: 'Identificação de perfil: investidor, moradia, upgrade' },
      { icon: <Zap size={14} />,        cor: 'bg-violet-100 text-violet-600', texto: 'Insights automáticos sobre cada cliente' },
      { icon: <AlertTriangle size={14}/>,cor: 'bg-amber-100 text-amber-600',  texto: 'Alertas de risco: comprometimento de renda e capacidade' },
    ],
  },
  {
    id: 'radar',
    icone: <Radar size={28} className="text-cyan-500" />,
    titulo: 'Radar de Leads',
    subtitulo: 'Identifique oportunidades antes da concorrência',
    descricao: 'O Radar monitora automaticamente todos os clientes e sinaliza os que estão prontos para fechar, os que estão esfriando e os que precisam de reativação urgente.',
    cor: 'from-cyan-600 to-sky-700',
    ilustracao: <IlusRadar />,
    destaques: [
      { icon: <Radar size={14} />,      cor: 'bg-cyan-100 text-cyan-600',    texto: 'Varredura automática de todos os clientes ativos' },
      { icon: <Target size={14} />,     cor: 'bg-red-100 text-red-600',      texto: 'Leads quentes: alta pontuação e intenção recente' },
      { icon: <AlertTriangle size={14}/>,cor: 'bg-amber-100 text-amber-600', texto: 'Leads esfriando: sem contato há mais de X dias' },
      { icon: <Phone size={14} />,      cor: 'bg-emerald-100 text-emerald-600', texto: 'Sugestão de ação: ligar, enviar proposta ou agendar visita' },
    ],
  },
  {
    id: 'captacao',
    icone: <Home size={28} className="text-rose-500" />,
    titulo: 'Recursos de Captação',
    subtitulo: 'Ferramentas para ampliar seu portfólio',
    descricao: 'O módulo de Captação reúne materiais, modelos de abordagem, checklist de documentação e estratégias para você captar novos imóveis com mais eficiência e profissionalismo.',
    cor: 'from-rose-500 to-pink-700',
    ilustracao: <IlusCaptacao />,
    destaques: [
      { icon: <Home size={14} />,        cor: 'bg-rose-100 text-rose-600',    texto: 'Checklist completo de captação e documentação' },
      { icon: <FileText size={14} />,    cor: 'bg-pink-100 text-pink-600',    texto: 'Modelos de apresentação ao proprietário' },
      { icon: <MessageCircle size={14}/>,cor: 'bg-violet-100 text-violet-600',texto: 'Scripts de abordagem por WhatsApp e telefone' },
      { icon: <Mail size={14} />,        cor: 'bg-blue-100 text-blue-600',    texto: 'Templates de e-mail profissional para proprietários' },
    ],
  },
  {
    id: 'concluido',
    icone: <CheckCircle2 size={28} className="text-green-500" />,
    titulo: 'Você está pronto!',
    subtitulo: 'Boas vendas com o Siqueira CRM',
    descricao: 'Acesse a página Ajuda no menu lateral sempre que precisar rever este tutorial ou consultar o guia completo de cálculo financeiro (SAC, PRICE, ITBI).',
    cor: 'from-green-600 to-emerald-700',
    ilustracao: <IlusConcluido />,
    destaques: [
      { icon: <Users size={14} />,      cor: 'bg-emerald-100 text-emerald-600', texto: 'Cadastre seu primeiro cliente agora' },
      { icon: <Building2 size={14} />,  cor: 'bg-teal-100 text-teal-600',      texto: 'Adicione imóveis ao catálogo' },
      { icon: <Radar size={14} />,      cor: 'bg-cyan-100 text-cyan-600',      texto: 'Acompanhe leads quentes pelo Radar' },
      { icon: <HelpCircle size={14} />, cor: 'bg-blue-100 text-blue-600',      texto: 'Menu → Ajuda para consultar o guia completo' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────
interface Props { onConcluir: () => void }

export default function PrimeiroAcessoWizard({ onConcluir }: Props) {
  const [etapa, setEtapa]       = useState(0)
  const [salvando, setSalvando] = useState(false)

  const atual    = ETAPAS[etapa]
  const total    = ETAPAS.length
  const isUltima = etapa === total - 1
  const progresso = Math.round(((etapa + 1) / total) * 100)

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
    finally { setSalvando(false); onConcluir() }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
      {/* Fundo */}
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Barra de progresso */}
        <div className="h-1 bg-slate-100 flex-shrink-0">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>

        {/* Cabeçalho gradiente com ilustração */}
        <div className={`bg-gradient-to-br ${atual.cor} px-6 pt-6 pb-4 relative flex-shrink-0`}>
          {/* Fechar */}
          <button
            onClick={concluir}
            title="Pular tutorial"
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X size={16} />
          </button>

          {/* Etapa label */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              {atual.icone}
            </div>
            <span className="text-white/70 text-xs font-medium">
              Etapa {etapa + 1} de {total}
            </span>
          </div>

          <h2 className="text-lg font-bold text-white leading-tight">{atual.titulo}</h2>
          <p className="text-white/70 text-xs mt-0.5">{atual.subtitulo}</p>

          {/* Ilustração */}
          <div className="mt-4 rounded-2xl overflow-hidden bg-white/10 backdrop-blur-sm border border-white/20 px-3 pt-3 pb-0">
            {atual.ilustracao}
          </div>
        </div>

        {/* Corpo */}
        <div className="px-6 py-4 flex-1 overflow-y-auto">
          <p className="text-sm text-slate-600 leading-relaxed mb-4">{atual.descricao}</p>

          <div className="grid grid-cols-1 gap-2">
            {atual.destaques.map((d, i) => (
              <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${d.cor}`}>
                  {d.icon}
                </span>
                <span className="text-sm text-slate-700">{d.texto}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-shrink-0 bg-white">
          {/* Pontos de navegação (clicáveis) */}
          <div className="flex gap-1.5 flex-wrap">
            {ETAPAS.map((_, i) => (
              <button
                key={i}
                onClick={() => setEtapa(i)}
                title={ETAPAS[i].titulo}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === etapa
                    ? 'w-6 bg-blue-500'
                    : i < etapa
                    ? 'w-2 bg-blue-300'
                    : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Voltar */}
            {etapa > 0 && (
              <button
                onClick={() => setEtapa(e => e - 1)}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft size={14} /> Voltar
              </button>
            )}

            {/* Pular (só mostra antes da última) */}
            {!isUltima && (
              <button
                onClick={concluir}
                className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Não mostrar mais
              </button>
            )}

            {/* Próximo / Concluir */}
            {isUltima ? (
              <button
                onClick={concluir}
                disabled={salvando}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors disabled:opacity-60"
              >
                <CheckCircle2 size={15} />
                {salvando ? 'Salvando...' : 'Começar agora!'}
              </button>
            ) : (
              <button
                onClick={() => setEtapa(e => e + 1)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
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
