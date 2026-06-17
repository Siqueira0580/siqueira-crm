'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Cliente } from '@/types'
import {
  Brain, Sparkles, Loader2, User, DollarSign, Users,
  Heart, PersonStanding, FileText, ChevronDown, RotateCcw,
  AlertTriangle, CheckCircle2, Zap, Shield, BarChart3,
  RefreshCw, PlusCircle, GitBranch, Thermometer, History,
  MessageSquare, Download, Trash2, Clock, ChevronRight, X,
  Maximize2, Minimize2, FileDown
} from 'lucide-react'

const supabase = createClient()

type Mode = 'novo' | 'atualizar'

interface Analise {
  id: string
  cliente_id: string | null
  modo: Mode
  score: number | null
  temperatura: string | null
  conteudo: string
  dados_entrada: Record<string, string>
  created_at: string
  cliente?: { nome: string } | null
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function parseInline(s: string): React.ReactNode[] {
  const boldParts = s.split(/\*\*(.*?)\*\*/)
  const result: React.ReactNode[] = []
  boldParts.forEach((part, idx) => {
    if (idx % 2 === 1) {
      result.push(<strong key={`b${idx}`} className="font-semibold text-slate-800">{part}</strong>)
    } else {
      const italicParts = part.split(/\*(.*?)\*/)
      italicParts.forEach((ip, iidx) => {
        if (iidx % 2 === 1) {
          result.push(<em key={`i${idx}-${iidx}`} className="italic text-slate-600">{ip}</em>)
        } else {
          const codeParts = ip.split(/`([^`]+)`/)
          codeParts.forEach((cp, cidx) => {
            if (cidx % 2 === 1) {
              result.push(
                <code key={`c${idx}-${iidx}-${cidx}`}
                  className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-xs tracking-wider">
                  {cp}
                </code>
              )
            } else { result.push(cp) }
          })
        }
      })
    }
  })
  return result
}

function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0
  const sectionIcons: Record<string, React.ReactNode> = {
    '📊': <BarChart3 size={17} className="text-green-500" />,
    '🧠': <Brain size={17} className="text-indigo-500" />,
    '🎯': <Zap size={17} className="text-amber-500" />,
    '🛡️': <Shield size={17} className="text-blue-500" />,
    '🌳': <GitBranch size={17} className="text-teal-500" />,
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('## ')) {
      const title = line.replace('## ', '')
      const emoji = Object.keys(sectionIcons).find(e => title.includes(e))
      elements.push(
        <div key={key++} className="mt-6 mb-3 pb-2 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            {emoji ? sectionIcons[emoji] : null}
            {title.replace(/[📊🧠🎯🛡️🌳]/g, '').trim()}
          </h3>
        </div>
      )
      continue
    }
    if (line.match(/^\s{4,}[*-]|\s{4,}👉/)) {
      const content = line.replace(/^\s+[*-]\s*/, '').replace(/^\s+/, '')
      const isAction = content.startsWith('👉')
      elements.push(
        <div key={key++} className={`ml-5 mt-1 pl-3 text-sm ${isAction ? 'border-l-2 border-teal-400 text-teal-800 font-medium' : 'border-l-2 border-indigo-200 text-slate-700'}`}>
          {parseInline(content)}
        </div>
      )
      continue
    }
    if (line.startsWith('*   ') || line.startsWith('* ') || line.startsWith('-   ') || line.startsWith('- ')) {
      const content = line.replace(/^[*-]\s+/, '')
      const isDecision = content.startsWith('**SE') || content.startsWith('SE ')
      elements.push(
        <div key={key++} className={`flex gap-2 mt-2 text-sm ${isDecision ? 'mt-3' : ''}`}>
          {isDecision
            ? <span className="text-teal-500 font-bold text-xs mt-0.5 flex-shrink-0">IF</span>
            : <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />}
          <span className="text-slate-700">{parseInline(content)}</span>
        </div>
      )
      continue
    }
    if (line.trim()) {
      elements.push(
        <p key={key++} className="text-sm text-slate-700 leading-relaxed mt-1">
          {parseInline(line)}
        </p>
      )
    }
  }
  return <div className="space-y-0.5">{elements}</div>
}

// ── Helpers ───────────────────────────────────────────────────────────────────
interface AnaliseResult {
  score_atual: number
  temperatura: string
  justificativa_mudanca: string
  evolucao_perfil: string
  objecoes: { tipo?: string; foco: string; script_resposta: string }[]
  arvore_decisao: { se_cliente_questionar: string; entao_acao: string }[]
  gatilhos_emocionais?: { momento: string; frase: string }[]
  questionario_persuasivo?: {
    foco: string
    pergunta_corretor: string
    resposta_prevista: string
    argumento_cartada_final: string
  }[]
  proximos_passos?: { prioridade: number; acao: string; prazo: string }[]
  mensagem_followup?: string
  perfil_risco?: { nivel: string; sinal_alerta: string }
  imovel_ideal?: { obrigatorios: string[]; desejaveis: string[] }
}

function parseAnalise(text: string): AnaliseResult | null {
  try {
    const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    return JSON.parse(clean) as AnaliseResult
  } catch {
    return null
  }
}

function extractScore(text: string): number | null {
  const parsed = parseAnalise(text)
  if (parsed) return parsed.score_atual ?? null
  const m = text.match(/Score\s+Atual[:\s]+(\d+)/) || text.match(/Lead Scoring[:\s]+(\d+)/)
  return m ? parseInt(m[1]) : null
}

function extractTemperatura(text: string): string | null {
  const parsed = parseAnalise(text)
  if (parsed?.temperatura) {
    if (parsed.temperatura.includes('Quente')) return 'Quente'
    if (parsed.temperatura.includes('Morno')) return 'Morno'
    if (parsed.temperatura.includes('Frio')) return 'Frio'
  }
  if (text.includes('Quente')) return 'Quente'
  if (text.includes('Morno')) return 'Morno'
  if (text.includes('Frio')) return 'Frio'
  return null
}

function scoreColor(score: number | null) {
  if (score == null) return 'bg-slate-400'
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-slate-400'
}

function scoreLabel(score: number | null) {
  if (score == null) return '—'
  if (score >= 70) return 'Quente 🔥'
  if (score >= 40) return 'Morno 🌡️'
  return 'Frio ❄️'
}

// ── Score Badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score, prevScore }: { score: number; prevScore?: number | null }) {
  const delta = prevScore != null ? score - prevScore : null
  return (
    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
      <div className={`w-14 h-14 rounded-full ${scoreColor(score)} flex items-center justify-center text-white font-bold text-xl shadow`}>
        {score}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-500 uppercase font-medium tracking-wide">Lead Score</p>
          {delta != null && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${delta > 0 ? 'bg-green-100 text-green-700' : delta < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
              {delta > 0 ? `+${delta}` : delta === 0 ? '=' : delta}
            </span>
          )}
        </div>
        <p className="text-lg font-bold text-slate-800">{scoreLabel(score)}</p>
        <div className="mt-1.5 h-2.5 bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${scoreColor(score)}`} style={{ width: `${score}%` }} />
        </div>
      </div>
    </div>
  )
}

// ── Mode Toggle ───────────────────────────────────────────────────────────────
function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
      <button onClick={() => onChange('novo')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'novo' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
        <PlusCircle size={15} /> Nova Análise
      </button>
      <button onClick={() => onChange('atualizar')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'atualizar' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
        <RefreshCw size={15} /> Atualizar Dossiê
      </button>
    </div>
  )
}

// ── History Panel ─────────────────────────────────────────────────────────────
function HistoryPanel({
  historico, onSelect, onDelete, visible, onClose
}: {
  historico: Analise[]
  onSelect: (a: Analise) => void
  onDelete: (id: string) => void
  visible: boolean
  onClose: () => void
}) {
  if (!visible) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-sm bg-white shadow-2xl border-l border-slate-200 flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><History size={16} /> Histórico de Análises</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {historico.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">Nenhuma análise salva ainda.</p>
          )}
          {historico.map(a => (
            <div key={a.id} className="border border-slate-200 rounded-xl p-3 hover:border-indigo-300 hover:bg-indigo-50 transition-all group">
              <div className="flex items-start justify-between gap-2">
                <button className="flex-1 text-left" onClick={() => { onSelect(a); onClose() }}>
                  <div className="flex items-center gap-2">
                    {a.cliente?.nome && (
                      <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                        {a.cliente.nome}
                      </span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${a.modo === 'atualizar' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {a.modo === 'atualizar' ? 'Atualização' : 'Nova'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    {a.score != null && (
                      <div className={`w-6 h-6 rounded-full ${scoreColor(a.score)} text-white text-xs font-bold flex items-center justify-center`}>
                        {a.score}
                      </div>
                    )}
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock size={10} /> {formatDateTime(a.created_at)}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => onDelete(a.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Export helpers ────────────────────────────────────────────────────────────
function toWhatsApp(text: string): string {
  const parsed = parseAnalise(text)
  if (parsed) {
    const lines: string[] = []
    lines.push(`📊 *Score: ${parsed.score_atual}* — ${parsed.temperatura}`)
    lines.push(`_${parsed.justificativa_mudanca}_`)
    lines.push('')
    lines.push('🧠 *Perfil Psicológico*')
    lines.push(parsed.evolucao_perfil)
    lines.push('')
    lines.push('🛡️ *Objeções e Scripts*')
    parsed.objecoes.forEach((o, i) => {
      lines.push(`${i + 1}. *${o.foco}*`)
      lines.push(`   _"${o.script_resposta}"_`)
    })
    lines.push('')
    lines.push('🌳 *Árvore de Decisão*')
    parsed.arvore_decisao.forEach(a => {
      lines.push(`• SE: ${a.se_cliente_questionar}`)
      lines.push(`  👉 ENTÃO: ${a.entao_acao}`)
    })
    if (parsed.gatilhos_emocionais?.length) {
      lines.push('')
      lines.push('⚡ *Gatilhos Emocionais*')
      parsed.gatilhos_emocionais.forEach(g => {
        lines.push(`• *${g.momento}*`)
        lines.push(`  _"${g.frase}"_`)
      })
    }
    if (parsed.questionario_persuasivo?.length) {
      lines.push('')
      lines.push('🎯 *Questionário Persuasivo*')
      parsed.questionario_persuasivo.forEach((q, i) => {
        lines.push(`${i + 1}. *${q.foco}*`)
        lines.push(`   ❓ _"${q.pergunta_corretor}"_`)
        lines.push(`   💡 ${q.argumento_cartada_final}`)
      })
    }
    if (parsed.proximos_passos?.length) {
      lines.push('')
      lines.push('✅ *Próximos Passos*')
      parsed.proximos_passos.forEach(p => {
        lines.push(`${p.prioridade}. ${p.acao} _(${p.prazo})_`)
      })
    }
    if (parsed.perfil_risco) {
      lines.push('')
      lines.push(`🚨 *Perfil de Risco: ${parsed.perfil_risco.nivel}*`)
      lines.push(parsed.perfil_risco.sinal_alerta)
    }
    if (parsed.imovel_ideal) {
      lines.push('')
      lines.push('🏠 *Imóvel Ideal*')
      lines.push('*Obrigatórios:* ' + parsed.imovel_ideal.obrigatorios.join(' • '))
      lines.push('*Desejáveis:* ' + parsed.imovel_ideal.desejaveis.join(' • '))
    }
    if (parsed.mensagem_followup) {
      lines.push('')
      lines.push('💬 *Mensagem de Follow-up*')
      lines.push(parsed.mensagem_followup)
    }
    return lines.join('\n')
  }
  // legacy markdown fallback
  return text
    .replace(/## 🧠 /g, '🧠 *').replace(/## 📊 /g, '📊 *').replace(/## 🎯 /g, '🎯 *')
    .replace(/## 🛡️ /g, '🛡️ *').replace(/## 🌳 /g, '🌳 *').replace(/## /g, '*')
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    .replace(/\*   /g, '• ')
    .replace(/^\s{4,}/gm, '  ')
}

function exportPDF(content: string, clienteNome?: string) {
  const title = clienteNome ? `Dossiê — ${clienteNome}` : 'Dossiê Estratégico'
  const parsed = parseAnalise(content)

  let body = ''
  if (parsed) {
    const scoreColor = parsed.score_atual >= 70 ? '#16a34a' : parsed.score_atual >= 40 ? '#d97706' : '#64748b'
    body = `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
        <span style="background:${scoreColor};color:white;padding:4px 14px;border-radius:20px;font-weight:bold;font-size:16px">Score ${parsed.score_atual}</span>
        <code style="font-family:monospace;font-size:12px;color:#475569">${parsed.temperatura}</code>
      </div>
      <p style="font-style:italic;color:#475569;margin-bottom:24px">${parsed.justificativa_mudanca}</p>
      <h2>🧠 Perfil Psicológico</h2>
      <p>${parsed.evolucao_perfil}</p>
      <h2>🛡️ Objeções e Scripts</h2>
      ${parsed.objecoes.map((o, i) => `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin:8px 0">
          <strong>${i + 1}. ${o.foco}</strong>
          <p style="font-style:italic;color:#475569;margin:4px 0 0">"${o.script_resposta}"</p>
        </div>`).join('')}
      <h2>🌳 Árvore de Decisão</h2>
      ${parsed.arvore_decisao.map(a => `
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;margin:8px 0;align-items:start">
          <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px">
            <strong style="color:#92400e;font-size:11px">SE</strong>
            <p style="margin:4px 0 0;font-size:12px;color:#78350f">${a.se_cliente_questionar}</p>
          </div>
          <div style="padding-top:20px;color:#64748b">→</div>
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px">
            <strong style="color:#166534;font-size:11px">ENTÃO</strong>
            <p style="margin:4px 0 0;font-size:12px;color:#14532d">${a.entao_acao}</p>
          </div>
        </div>`).join('')}
      ${parsed.questionario_persuasivo?.length ? `
      <h2>🎯 Questionário Persuasivo (Método Socrático)</h2>
      ${parsed.questionario_persuasivo.map((q, i) => `
        <div style="border:1px solid #ede9fe;border-radius:10px;overflow:hidden;margin:10px 0">
          <div style="background:#f5f3ff;padding:10px 12px;display:flex;align-items:center;gap:10px">
            <span style="background:#7c3aed;color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;flex-shrink:0">${i + 1}</span>
            <strong style="color:#6d28d9;font-size:12px">${q.foco}</strong>
          </div>
          <div style="padding:12px">
            <p style="font-style:italic;color:#1e1b4b;font-weight:500;margin:0 0 10px">"${q.pergunta_corretor}"</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <div style="background:#f8fafc;border-radius:6px;padding:8px">
                <p style="font-size:10px;font-weight:bold;color:#94a3b8;text-transform:uppercase;margin:0 0 4px">Resposta prevista</p>
                <p style="font-size:12px;color:#475569;margin:0">${q.resposta_prevista}</p>
              </div>
              <div style="background:#f0fdf4;border-radius:6px;padding:8px">
                <p style="font-size:10px;font-weight:bold;color:#16a34a;text-transform:uppercase;margin:0 0 4px">Cartada final</p>
                <p style="font-size:12px;color:#15803d;margin:0">${q.argumento_cartada_final}</p>
              </div>
            </div>
          </div>
        </div>`).join('')}` : ''}
      ${parsed.gatilhos_emocionais?.length ? `
      <h2>⚡ Gatilhos Emocionais</h2>
      ${parsed.gatilhos_emocionais.map(g => `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;margin:8px 0">
          <strong style="color:#92400e">⚡ ${g.momento}</strong>
          <p style="font-style:italic;color:#475569;margin:4px 0 0">"${g.frase}"</p>
        </div>`).join('')}` : ''}
      ${parsed.proximos_passos?.length ? `
      <h2>✅ Próximos Passos</h2>
      ${parsed.proximos_passos.map(p => `
        <div style="display:flex;align-items:flex-start;gap:12px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px;margin:6px 0">
          <span style="background:#16a34a;color:white;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;flex-shrink:0">${p.prioridade}</span>
          <div><p style="margin:0">${p.acao}</p><small style="color:#16a34a">⏱ ${p.prazo}</small></div>
        </div>`).join('')}` : ''}
      ${parsed.perfil_risco ? `
      <h2>🚨 Perfil de Risco</h2>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px">
        <span style="background:${parsed.perfil_risco.nivel === 'Alto' ? '#dc2626' : parsed.perfil_risco.nivel === 'Médio' ? '#d97706' : '#16a34a'};color:white;padding:2px 12px;border-radius:20px;font-size:12px;font-weight:bold">${parsed.perfil_risco.nivel}</span>
        <p style="margin:8px 0 0;color:#475569">🚨 ${parsed.perfil_risco.sinal_alerta}</p>
      </div>` : ''}
      ${parsed.imovel_ideal ? `
      <h2>🏠 Imóvel Ideal</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px">
          <strong style="color:#166534;font-size:11px;text-transform:uppercase">Obrigatórios</strong>
          <ul style="margin:8px 0 0;padding-left:16px">${parsed.imovel_ideal.obrigatorios.map(i => `<li style="font-size:12px;margin:3px 0">${i}</li>`).join('')}</ul>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">
          <strong style="color:#475569;font-size:11px;text-transform:uppercase">Desejáveis</strong>
          <ul style="margin:8px 0 0;padding-left:16px">${parsed.imovel_ideal.desejaveis.map(i => `<li style="font-size:12px;margin:3px 0;color:#64748b">${i}</li>`).join('')}</ul>
        </div>
      </div>` : ''}
      ${parsed.mensagem_followup ? `
      <h2>💬 Mensagem de Follow-up (WhatsApp)</h2>
      <div style="background:#dcf8c6;border-radius:12px;border-top-left-radius:0;padding:14px;max-width:480px;font-size:13px;line-height:1.6;white-space:pre-wrap;color:#1e293b">${parsed.mensagem_followup}</div>` : ''}`
  } else {
    body = `<div>${content.split('\n').map(line => {
      if (line.startsWith('## ')) return `<h2>${line.replace('## ', '')}</h2>`
      if (line.startsWith('*   ') || line.startsWith('* ')) return `<ul><li>${line.replace(/^\*\s+/, '')}</li></ul>`
      if (line.match(/^\s{4,}/)) return `<p style="margin-left:20px;color:#475569">${line.trim()}</p>`
      if (line.trim()) return `<p>${line}</p>`
      return '<br>'
    }).join('')}</div>`
  }

  const html = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><title>${title}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; padding: 32px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 20px; color: #4f46e5; margin-bottom: 4px; }
  .sub { font-size: 11px; color: #64748b; margin-bottom: 24px; }
  h2 { font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; }
  p { line-height: 1.6; margin: 6px 0; }
  ul { padding-left: 20px; } li { margin: 4px 0; }
  strong { font-weight: 600; }
  em { font-style: italic; color: #475569; }
  code { background: #eef2ff; color: #4338ca; padding: 1px 6px; border-radius: 4px; font-family: monospace; }
</style></head><body>
<h1>${title}</h1>
<p class="sub">Gerado em ${new Date().toLocaleString('pt-BR')} • Siqueira CRM</p>
${body}
</body></html>`
  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500) }
}

// ── JSON Analysis Renderer ────────────────────────────────────────────────────
const TIPO_OBJECAO_COLOR: Record<string, string> = {
  'Financeira': 'bg-orange-50 border-orange-200 text-orange-700',
  'Emocional':  'bg-purple-50 border-purple-200 text-purple-700',
  'Timing':     'bg-sky-50 border-sky-200 text-sky-700',
  'Conjugal':   'bg-pink-50 border-pink-200 text-pink-700',
}
const RISCO_COLOR: Record<string, string> = {
  'Baixo':  'bg-green-100 text-green-700',
  'Médio':  'bg-amber-100 text-amber-700',
  'Alto':   'bg-red-100 text-red-700',
}

function AnaliseJSONView({ data }: { data: AnaliseResult }) {
  const [copiedFollowup, setCopiedFollowup] = useState(false)

  return (
    <div className="space-y-4">

      {/* Score / temperatura */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4">
        <code className="font-mono text-sm text-slate-600 tracking-wide block mb-2">{data.temperatura}</code>
        <p className="text-sm text-slate-500 italic">{data.justificativa_mudanca}</p>
      </div>

      {/* Perfil psicológico */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Brain size={15} className="text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-700">Perfil Psicológico</h3>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{data.evolucao_perfil}</p>
      </div>

      {/* Objeções */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={15} className="text-blue-500" />
          <h3 className="text-sm font-semibold text-slate-700">Objeções e Scripts de Contorno</h3>
        </div>
        <div className="space-y-2.5">
          {data.objecoes.map((ob, i) => {
            const colorClass = ob.tipo ? TIPO_OBJECAO_COLOR[ob.tipo] || 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700'
            return (
              <div key={i} className={`border rounded-lg p-3 ${colorClass.split(' ').slice(0,2).join(' ')}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  {ob.tipo && <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colorClass}`}>{ob.tipo}</span>}
                  <p className="text-xs font-semibold text-slate-700">⚠️ {ob.foco}</p>
                </div>
                <p className="text-sm text-slate-600 italic">"{ob.script_resposta}"</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Árvore de decisão */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch size={15} className="text-teal-500" />
          <h3 className="text-sm font-semibold text-slate-700">Árvore de Decisão</h3>
        </div>
        <div className="space-y-2.5">
          {data.arvore_decisao.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_18px_1fr] gap-2 items-start">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <p className="text-xs font-bold text-amber-700 mb-1">SE</p>
                <p className="text-xs text-amber-800 leading-relaxed">{item.se_cliente_questionar}</p>
              </div>
              <div className="flex items-center justify-center pt-4 text-slate-400 text-xs">→</div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
                <p className="text-xs font-bold text-green-700 mb-1">ENTÃO</p>
                <p className="text-xs text-green-800 leading-relaxed">{item.entao_acao}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gatilhos emocionais */}
      {data.gatilhos_emocionais?.length ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={15} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-700">Gatilhos Emocionais</h3>
          </div>
          <div className="space-y-2.5">
            {data.gatilhos_emocionais.map((g, i) => (
              <div key={i} className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">⚡ {g.momento}</p>
                <p className="text-sm text-slate-700 italic">"{g.frase}"</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Questionário persuasivo */}
      {data.questionario_persuasivo?.length ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={15} className="text-violet-500" />
            <h3 className="text-sm font-semibold text-slate-700">Questionário Persuasivo</h3>
            <span className="text-xs text-slate-400 ml-1">Método Socrático</span>
          </div>
          <div className="space-y-3">
            {data.questionario_persuasivo.map((q, i) => (
              <div key={i} className="border border-violet-100 rounded-xl overflow-hidden">
                <div className="bg-violet-50 px-3 py-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <p className="text-xs font-semibold text-violet-700">{q.foco}</p>
                </div>
                <div className="p-3 space-y-2.5">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Pergunta</p>
                    <p className="text-sm text-slate-800 font-medium italic">"{q.pergunta_corretor}"</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Resposta prevista</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{q.resposta_prevista}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2">
                      <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Cartada final</p>
                      <p className="text-xs text-emerald-800 leading-relaxed">{q.argumento_cartada_final}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Próximos passos */}
      {data.proximos_passos?.length ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={15} className="text-green-500" />
            <h3 className="text-sm font-semibold text-slate-700">Próximos Passos</h3>
          </div>
          <div className="space-y-2">
            {data.proximos_passos.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 bg-green-50 border border-green-100 rounded-lg">
                <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{p.prioridade}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">{p.acao}</p>
                  <p className="text-xs text-green-600 font-medium mt-0.5">⏱ {p.prazo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Mensagem follow-up */}
      {data.mensagem_followup ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={15} className="text-green-600" />
              <h3 className="text-sm font-semibold text-slate-700">Mensagem de Follow-up (WhatsApp)</h3>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(data.mensagem_followup!); setCopiedFollowup(true); setTimeout(() => setCopiedFollowup(false), 2000) }}
              className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 font-medium">
              {copiedFollowup ? <><CheckCircle2 size={12} /> Copiado!</> : <><MessageSquare size={12} /> Copiar</>}
            </button>
          </div>
          <div className="bg-[#dcf8c6] rounded-xl rounded-tl-none p-3 max-w-sm text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
            {data.mensagem_followup}
          </div>
        </div>
      ) : null}

      {/* Perfil de risco + Imóvel ideal lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {data.perfil_risco ? (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={15} className="text-red-500" />
              <h3 className="text-sm font-semibold text-slate-700">Perfil de Risco</h3>
            </div>
            <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-2 ${RISCO_COLOR[data.perfil_risco.nivel] || 'bg-slate-100 text-slate-600'}`}>
              {data.perfil_risco.nivel}
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">🚨 {data.perfil_risco.sinal_alerta}</p>
          </div>
        ) : null}

        {data.imovel_ideal ? (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={15} className="text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-700">Imóvel Ideal</h3>
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Obrigatórios</p>
            <ul className="space-y-1 mb-3">
              {data.imovel_ideal.obrigatorios.map((item, i) => (
                <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                  <span className="text-green-500 mt-0.5">✓</span>{item}
                </li>
              ))}
            </ul>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Desejáveis</p>
            <ul className="space-y-1">
              {data.imovel_ideal.desejaveis.map((item, i) => (
                <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5">
                  <span className="text-slate-400 mt-0.5">◦</span>{item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function AnaliseComportamentoContent() {
  const searchParams = useSearchParams()
  const clienteIdParam = searchParams.get('cliente_id')
  const clienteNomeParam = searchParams.get('cliente_nome')

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [selectedCliente, setSelectedCliente] = useState(clienteIdParam || '')
  const [selectedClienteNome, setSelectedClienteNome] = useState(clienteNomeParam || '')
  const [mode, setMode] = useState<Mode>('novo')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [analysis, setAnalysis] = useState('')
  const [currentAnaliseId, setCurrentAnaliseId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const [prevScore, setPrevScore] = useState<number | null>(null)
  const [historico, setHistorico] = useState<Analise[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)

  const [form, setForm] = useState({
    historico_mensagens: '',
    faixa_renda: '',
    tamanho_familia: '',
    religiao: '',
    genero: '',
    personalidade: '',
    outros_dados: '',
  })
  const [analise_anterior, setAnaliseAnterior] = useState('')
  const [novas_interacoes, setNovasInteracoes] = useState('')

  useEffect(() => {
    loadClientes()
    loadHistorico()
  }, [])

  // Pre-fill from URL params (coming from /clientes/[id])
  useEffect(() => {
    if (clienteIdParam) {
      const nome = decodeURIComponent(clienteNomeParam || '')
      setSelectedClienteNome(nome)
    }
  }, [clienteIdParam, clienteNomeParam])

  const loadClientes = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('user_id', session.user.id)
      .order('nome')
    setClientes((data || []) as any)

    // If came from cliente page, pre-fill form
    if (clienteIdParam && data) {
      const c = data.find((cl: any) => cl.id === clienteIdParam)
      if (c) prefillFromCliente(c as any)
    }
  }

  const loadHistorico = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('analises_comportamento')
      .select('*, cliente:cliente_id(nome)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setHistorico((data || []) as any)
  }

  const prefillFromCliente = (c: Cliente) => {
    // ── Labels ──────────────────────────────────────────────────────────────
    const ESTADO_CIVIL_LABEL: Record<string, string> = {
      solteiro: 'Solteiro(a)', casado: 'Casado(a)', divorciado: 'Divorciado(a)',
      viuvo: 'Viúvo(a)', uniao_estavel: 'União Estável', outro: 'Outro',
    }
    const MORADIA_LABEL: Record<string, string> = {
      alugado: 'Alugado', proprio: 'Próprio (quitado)', financiado: 'Financiado',
      familiar: 'Casa de familiar', outro: 'Outro',
    }
    const OBJETIVO_LABEL: Record<string, string> = {
      morar: 'Morar', investir: 'Investir', alugar: 'Alugar',
    }
    const TIPO_LABEL: Record<string, string> = {
      casa: 'Casa', apartamento: 'Apartamento', comercial: 'Comercial', qualquer: 'Qualquer',
    }

    // ── Idade ────────────────────────────────────────────────────────────────
    const idade = c.data_nascimento
      ? Math.floor((Date.now() - new Date(c.data_nascimento + 'T00:00:00').getTime()) / (365.25 * 24 * 3600 * 1000))
      : null

    // ── Histórico ─────────────────────────────────────────────────────────────
    const historicoTexto = c.historico?.length
      ? c.historico.map(h => `[${new Date(h.data).toLocaleDateString('pt-BR')}] ${h.descricao}`).join('\n')
      : ''

    // ── Tamanho da família ────────────────────────────────────────────────────
    const filhosTexto = c.filhos_detalhes?.length
      ? `${c.filhos_quantidade} filho(s): ` + c.filhos_detalhes.map(f =>
          `${f.genero === 'menino' ? 'Menino' : f.genero === 'menina' ? 'Menina' : 'Outro'}${f.nome ? ` ${f.nome}` : ''}${f.idade != null ? ` ${f.idade}a` : ''}`
        ).join(', ')
      : c.filhos_quantidade && c.filhos_quantidade > 0
        ? `${c.filhos_quantidade} filho(s)`
        : 'Sem filhos'

    const familiaPartes: string[] = []
    if (c.estado_civil) familiaPartes.push(ESTADO_CIVIL_LABEL[c.estado_civil] || c.estado_civil)
    if (idade)          familiaPartes.push(`${idade} anos`)
    familiaPartes.push(filhosTexto)
    if (c.conjuge_nome) familiaPartes.push(`Cônjuge: ${c.conjuge_nome}`)

    // ── Personalidade / Outros ────────────────────────────────────────────────
    const conjugeTexto = c.conjuge_nome
      ? `${c.conjuge_nome}${c.conjuge_profissao ? `, ${c.conjuge_profissao}` : ''}${c.conjuge_renda ? `, renda ${formatCurrency(c.conjuge_renda)}/mês` : ''}`
      : ''

    // Moradia detalhada
    const enderecoTipoLabel = c.endereco_tipo === 'veraneio' ? 'Veraneio' : c.endereco_tipo === 'outro' ? 'Outro' : 'Residencial atual'
    const moradiaLinhas: string[] = []
    if (c.moradia_atual_tipo) {
      moradiaLinhas.push(
        `${MORADIA_LABEL[c.moradia_atual_tipo] || c.moradia_atual_tipo}${c.moradia_atual_valor ? ` · R$ ${c.moradia_atual_valor}/mês` : ''} (${enderecoTipoLabel})`
      )
    }
    if (c.logradouro || c.cidade) {
      moradiaLinhas.push(
        [c.logradouro, c.numero, c.bairro, c.cidade && c.estado ? `${c.cidade}/${c.estado}` : c.cidade || c.estado, c.cep].filter(Boolean).join(', ')
      )
    }
    const comodosArr: string[] = []
    if (c.moradia_quartos)      comodosArr.push(`${c.moradia_quartos} quartos`)
    if (c.moradia_suites)       comodosArr.push(`${c.moradia_suites} suítes`)
    if (c.moradia_banheiros)    comodosArr.push(`${c.moradia_banheiros} banheiros`)
    if (c.moradia_salas)        comodosArr.push(`${c.moradia_salas} salas`)
    if (c.moradia_cozinhas)     comodosArr.push(`${c.moradia_cozinhas} cozinhas`)
    if (c.moradia_varandas)     comodosArr.push(`${c.moradia_varandas} varandas`)
    if (c.moradia_vagas_garagem) comodosArr.push(`${c.moradia_vagas_garagem} vagas de garagem`)
    if (comodosArr.length) moradiaLinhas.push(`Cômodos: ${comodosArr.join(', ')}`)
    const extrasArr: string[] = []
    if (c.moradia_quintal)      extrasArr.push('Quintal')
    if (c.moradia_area_servico) extrasArr.push('Área de serviço')
    if (c.moradia_home_office)  extrasArr.push('Home office')
    if (c.moradia_piscina)      extrasArr.push('Piscina')
    if (c.moradia_area_gourmet) extrasArr.push('Área gourmet')
    if (extrasArr.length) moradiaLinhas.push(`Extras: ${extrasArr.join(', ')}`)
    if (c.possui_outros_imoveis) moradiaLinhas.push('✓ Possui outros imóveis')
    if (c.moradia_observacao) moradiaLinhas.push(`Obs: ${c.moradia_observacao}`)

    const personalidadeLinhas: string[] = []
    if (c.data_nascimento) personalidadeLinhas.push(`Nascimento: ${new Date(c.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')}${idade ? ` (${idade} anos)` : ''}`)
    if (c.cidade_nascimento) personalidadeLinhas.push(`Origem: ${c.cidade_nascimento}${c.estado_nascimento ? `/${c.estado_nascimento}` : ''}`)
    if (conjugeTexto) personalidadeLinhas.push(`Cônjuge: ${conjugeTexto}`)
    if (moradiaLinhas.length) {
      personalidadeLinhas.push(`\nMoradia atual:\n${moradiaLinhas.map(l => `  ${l}`).join('\n')}`)
    }

    // ── Outros dados (preferências de imóvel + notas) ─────────────────────────
    const outrosLinhas: string[] = []
    if (c.notas) outrosLinhas.push(c.notas)
    const prefsArr: string[] = []
    if (c.objetivo)                        prefsArr.push(`Objetivo: ${OBJETIVO_LABEL[c.objetivo] || c.objetivo}`)
    if (c.tipo_imovel && c.tipo_imovel !== 'qualquer') prefsArr.push(`Tipo desejado: ${TIPO_LABEL[c.tipo_imovel] || c.tipo_imovel}`)
    if (c.zona_interesse)                  prefsArr.push(`Zona: ${c.zona_interesse}`)
    if (c.quartos_desejados)               prefsArr.push(`Quartos desejados: ${c.quartos_desejados}+`)
    if (c.orcamento_min || c.orcamento_max) {
      prefsArr.push(`Orçamento: ${c.orcamento_min ? formatCurrency(c.orcamento_min) : '?'} até ${c.orcamento_max ? formatCurrency(c.orcamento_max) : '?'}`)
    }
    if (c.necessidades?.length) prefsArr.push(`Necessidades: ${c.necessidades.join(', ')}`)
    if (prefsArr.length) outrosLinhas.push(`Preferências de imóvel: ${prefsArr.join(' | ')}`)

    setForm(prev => ({
      ...prev,
      historico_mensagens: historicoTexto || prev.historico_mensagens,
      faixa_renda: c.faixa_renda ? formatCurrency(c.faixa_renda) + '/mês' : prev.faixa_renda,
      tamanho_familia: familiaPartes.filter(Boolean).join(' · ') || prev.tamanho_familia,
      outros_dados: outrosLinhas.join('\n').trim() || prev.outros_dados,
      personalidade: personalidadeLinhas.filter(Boolean).join('\n') || prev.personalidade,
      // dados estruturados para a API
      ...(c.estado_civil        ? { estado_civil:        c.estado_civil        } : {}),
      ...(c.data_nascimento     ? { data_nascimento:     c.data_nascimento     } : {}),
      ...(c.cidade_nascimento   ? { cidade_nascimento:   c.cidade_nascimento   } : {}),
      ...(c.estado_nascimento   ? { estado_nascimento:   c.estado_nascimento   } : {}),
      ...(c.filhos_detalhes     ? { filhos_detalhes:     c.filhos_detalhes     } : {}),
      ...(c.conjuge_nome        ? { conjuge_nome:        c.conjuge_nome        } : {}),
      ...(c.conjuge_profissao   ? { conjuge_profissao:   c.conjuge_profissao   } : {}),
      ...(c.conjuge_renda       ? { conjuge_renda:       c.conjuge_renda       } : {}),
      ...(c.moradia_atual_tipo  ? { moradia_atual_tipo:  c.moradia_atual_tipo  } : {}),
      ...(c.moradia_atual_valor ? { moradia_atual_valor: c.moradia_atual_valor } : {}),
      ...(c.moradia_quartos       != null ? { moradia_quartos:       c.moradia_quartos       } : {}),
      ...(c.moradia_suites        != null ? { moradia_suites:        c.moradia_suites        } : {}),
      ...(c.moradia_banheiros     != null ? { moradia_banheiros:     c.moradia_banheiros     } : {}),
      ...(c.moradia_salas         != null ? { moradia_salas:         c.moradia_salas         } : {}),
      ...(c.moradia_cozinhas      != null ? { moradia_cozinhas:      c.moradia_cozinhas      } : {}),
      ...(c.moradia_varandas      != null ? { moradia_varandas:      c.moradia_varandas      } : {}),
      ...(c.moradia_vagas_garagem != null ? { moradia_vagas_garagem: c.moradia_vagas_garagem } : {}),
      ...(c.moradia_quintal       != null ? { moradia_quintal:       c.moradia_quintal       } : {}),
      ...(c.moradia_area_servico  != null ? { moradia_area_servico:  c.moradia_area_servico  } : {}),
      ...(c.moradia_home_office   != null ? { moradia_home_office:   c.moradia_home_office   } : {}),
      ...(c.moradia_piscina       != null ? { moradia_piscina:       c.moradia_piscina       } : {}),
      ...(c.moradia_area_gourmet  != null ? { moradia_area_gourmet:  c.moradia_area_gourmet  } : {}),
      ...(c.moradia_observacao    ? { moradia_observacao:    c.moradia_observacao    } : {}),
      ...(c.possui_outros_imoveis != null ? { possui_outros_imoveis: c.possui_outros_imoveis } : {}),
      ...(c.endereco_tipo         ? { endereco_tipo:         c.endereco_tipo         } : {}),
      ...(c.genero                ? { genero:                c.genero                } : {}),
    }))
  }

  const handleClienteSelect = (clienteId: string) => {
    setSelectedCliente(clienteId)
    if (!clienteId) { setSelectedClienteNome(''); return }
    const c = clientes.find(cl => cl.id === clienteId)
    if (!c) return
    setSelectedClienteNome(c.nome)
    prefillFromCliente(c)
  }

  const handleModeChange = (m: Mode) => {
    setMode(m); setAnalysis(''); setError(''); setScore(null); setPrevScore(null)
  }

  const handleReset = () => {
    setForm({ historico_mensagens: '', faixa_renda: '', tamanho_familia: '', religiao: '', genero: '', personalidade: '', outros_dados: '' })
    setAnaliseAnterior(''); setNovasInteracoes(''); setSelectedCliente(''); setSelectedClienteNome('')
    setAnalysis(''); setError(''); setScore(null); setPrevScore(null); setCurrentAnaliseId(null)
  }

  const handleSelectFromHistory = (a: Analise) => {
    setAnalysis(a.conteudo)
    setScore(a.score)
    setCurrentAnaliseId(a.id)
    setMode(a.modo)
    if (a.dados_entrada) setForm(prev => ({ ...prev, ...a.dados_entrada }))
    if (a.cliente_id) setSelectedCliente(a.cliente_id)
    if (a.cliente?.nome) setSelectedClienteNome(a.cliente.nome)
  }

  const handleDeleteFromHistory = async (id: string) => {
    await supabase.from('analises_comportamento').delete().eq('id', id)
    setHistorico(prev => prev.filter(a => a.id !== id))
    if (currentAnaliseId === id) { setAnalysis(''); setScore(null); setCurrentAnaliseId(null) }
  }

  const saveAnalise = async (conteudo: string, scoreVal: number | null, modoUsado: Mode) => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSaving(false); return }

    const temp = extractTemperatura(conteudo)
    const { data } = await (supabase.from('analises_comportamento') as any).insert({
      cliente_id: selectedCliente || null,
      user_id: session.user.id,
      modo: modoUsado,
      score: scoreVal,
      temperatura: temp,
      conteudo,
      dados_entrada: form,
    }).select().single()

    if (data) {
      setCurrentAnaliseId(data.id)
      setHistorico(prev => [{ ...data, cliente: selectedClienteNome ? { nome: selectedClienteNome } : null } as any, ...prev])
    }
    setSaving(false)
  }

  const handleSubmit = async () => {
    if (mode === 'novo' && !form.historico_mensagens && !form.outros_dados) {
      setError('Preencha ao menos o histórico de mensagens ou outras informações do lead.'); return
    }
    if (mode === 'atualizar' && !novas_interacoes) {
      setError('Informe as novas interações para atualizar o dossiê.'); return
    }

    setLoading(true); setAnalysis(''); setError('')
    if (mode === 'atualizar') setPrevScore(score)

    try {
      const endpoint = mode === 'novo'
        ? '/api/analise-comportamento'
        : '/api/analise-comportamento/atualizar'

      const payload = mode === 'novo'
        ? { ...form, nome_cliente: selectedClienteNome }
        : {
            nome_cliente:        selectedClienteNome,
            // campos de texto visíveis
            faixa_renda:         form.faixa_renda,
            tamanho_familia:     form.tamanho_familia,
            religiao:            form.religiao,
            genero:              form.genero,
            outros_dados:        form.personalidade || form.outros_dados,
            analise_anterior,
            novas_interacoes,
            // dados estruturados do cliente (moradia, família, etc.)
            estado_civil:         (form as any).estado_civil,
            data_nascimento:      (form as any).data_nascimento,
            cidade_nascimento:    (form as any).cidade_nascimento,
            estado_nascimento:    (form as any).estado_nascimento,
            filhos_detalhes:      (form as any).filhos_detalhes,
            conjuge_nome:         (form as any).conjuge_nome,
            conjuge_profissao:    (form as any).conjuge_profissao,
            conjuge_renda:        (form as any).conjuge_renda,
            moradia_atual_tipo:   (form as any).moradia_atual_tipo,
            moradia_atual_valor:  (form as any).moradia_atual_valor,
            moradia_quartos:      (form as any).moradia_quartos,
            moradia_suites:       (form as any).moradia_suites,
            moradia_banheiros:    (form as any).moradia_banheiros,
            moradia_salas:        (form as any).moradia_salas,
            moradia_cozinhas:     (form as any).moradia_cozinhas,
            moradia_varandas:     (form as any).moradia_varandas,
            moradia_vagas_garagem:(form as any).moradia_vagas_garagem,
            moradia_quintal:      (form as any).moradia_quintal,
            moradia_area_servico: (form as any).moradia_area_servico,
            moradia_home_office:  (form as any).moradia_home_office,
            moradia_piscina:      (form as any).moradia_piscina,
            moradia_area_gourmet: (form as any).moradia_area_gourmet,
            moradia_observacao:   (form as any).moradia_observacao,
            possui_outros_imoveis:(form as any).possui_outros_imoveis,
            endereco_tipo:        (form as any).endereco_tipo,
          }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok || data.error) { setError(data.error || 'Erro ao gerar análise.'); return }

      const newScore = extractScore(data.analysis)
      setAnalysis(data.analysis)
      setScore(newScore)
      if (mode === 'novo') setAnaliseAnterior(data.analysis)

      await saveAnalise(data.analysis, newScore, mode)
    } catch (e: any) {
      setError(e.message || 'Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(toWhatsApp(analysis))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const baseFields = [
    { key: 'faixa_renda' as const, label: 'Faixa de Renda', icon: DollarSign, placeholder: 'Ex: R$ 8.000 a R$ 12.000/mês', multiline: false },
    { key: 'tamanho_familia' as const, label: 'Tamanho da Família', icon: Users, placeholder: 'Ex: Casal com 2 filhos pequenos', multiline: false },
    { key: 'religiao' as const, label: 'Religião / Crenças', icon: Heart, placeholder: 'Ex: Evangélico, Católico (se aplicável)', multiline: false },
    { key: 'genero' as const, label: 'Gênero', icon: PersonStanding, placeholder: 'Ex: Masculino, Feminino, Casal', multiline: false },
    { key: 'personalidade' as const, label: 'Personalidade / Outros', icon: User, placeholder: 'Traços notados, urgência, histórico geral...', multiline: true },
  ]

  return (
    <AppLayout title="Análise de Comportamento">
      <div className="max-w-6xl space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow">
              <Brain size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Análise de Comportamento</h1>
              <p className="text-sm text-slate-500">Dossiê estratégico e psicológico do lead via IA</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ModeToggle mode={mode} onChange={handleModeChange} />
            <button
              onClick={() => setShowHistory(true)}
              className="btn-secondary relative"
            >
              <History size={15} /> Histórico
              {historico.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {historico.length > 9 ? '9+' : historico.length}
                </span>
              )}
            </button>
            {analysis && (
              <button onClick={handleReset} className="btn-secondary">
                <RotateCcw size={14} /> Limpar
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ── Formulário ── */}
          <div className="space-y-4">

            {/* Importar cliente */}
            {mode === 'novo' && (
              <div className="card space-y-3">
                <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Users size={15} /> Vincular a cliente existente
                  <span className="text-xs font-normal text-slate-400">(opcional)</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedCliente}
                    onChange={e => handleClienteSelect(e.target.value)}
                    className="input pr-8 appearance-none"
                  >
                    <option value="">-- Nenhum (lead avulso) --</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Campos base */}
            <div className="card space-y-3">
              <p className="text-sm font-semibold text-slate-700">Informações do Lead</p>
              {baseFields.map(({ key, label, icon: Icon, placeholder, multiline }) => (
                <div key={key}>
                  <label className="label flex items-center gap-1.5">
                    <Icon size={13} className="text-slate-400" /> {label}
                  </label>
                  {multiline ? (
                    <textarea
                      className="input min-h-[80px] resize-none text-sm"
                      placeholder={placeholder}
                      value={(form as any)[key] || ''}
                      onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  ) : (
                    <input
                      type="text"
                      className="input text-sm"
                      placeholder={placeholder}
                      value={(form as any)[key] || ''}
                      onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Campo principal por modo */}
            {mode === 'novo' ? (
              <div className="card space-y-3">
                <div>
                  <label className="label flex items-center gap-1.5">
                    <MessageSquare size={13} className="text-slate-400" /> Histórico de Mensagens / Conversa
                  </label>
                  <textarea
                    className="input min-h-[120px] resize-none text-sm"
                    placeholder="Cole aqui o histórico de conversa com o lead (WhatsApp, e-mail, ligação etc.)"
                    value={form.historico_mensagens}
                    onChange={e => setForm(prev => ({ ...prev, historico_mensagens: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-1.5">
                    <FileText size={13} className="text-slate-400" /> Outras Informações
                  </label>
                  <textarea
                    className="input min-h-[80px] resize-none text-sm"
                    placeholder="Observações adicionais, contexto, urgência..."
                    value={form.outros_dados}
                    onChange={e => setForm(prev => ({ ...prev, outros_dados: e.target.value }))}
                  />
                </div>
              </div>
            ) : (
              <div className="card space-y-3">
                <div>
                  <label className="label flex items-center gap-1.5">
                    <GitBranch size={13} className="text-slate-400" /> Novas Interações
                  </label>
                  <textarea
                    className="input min-h-[120px] resize-none text-sm"
                    placeholder="Descreva o que aconteceu desde a última análise: novas mensagens, visita, feedback..."
                    value={novas_interacoes}
                    onChange={e => setNovasInteracoes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" /> {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || saving}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Analisando...</>
              ) : (
                <><Brain size={16} /> {mode === 'novo' ? 'Gerar Dossiê' : 'Atualizar Dossiê'}</>
              )}
            </button>
          </div>

          {/* ── Resultado ── */}
          <div className="space-y-4">
            {!analysis && !loading && (
              <div className="card flex flex-col items-center justify-center py-16 text-center text-slate-400 gap-3">
                <Brain size={40} className="text-slate-200" />
                <p className="text-sm">Preencha o formulário e clique em <strong className="text-slate-500">Gerar Dossiê</strong></p>
                <p className="text-xs text-slate-300">A IA irá analisar o comportamento e perfil do lead</p>
              </div>
            )}

            {loading && (
              <div className="card flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 size={32} className="text-indigo-500 animate-spin" />
                <p className="text-sm text-slate-500 font-medium">Gerando análise com IA...</p>
                <p className="text-xs text-slate-400">Isso pode levar alguns segundos</p>
              </div>
            )}

            {analysis && !loading && (
              <>
                {/* Score / Temperatura */}
                {score !== null && (
                  <div className="card flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0
                      ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}>
                      {score}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Score de Potencial</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        {prevScore !== null && prevScore !== score && (
                          <span className={`text-xs font-semibold ${score > prevScore ? 'text-green-600' : 'text-red-600'}`}>
                            {score > prevScore ? '+' : ''}{score - prevScore}
                          </span>
                        )}
                      </div>
                    </div>
                    <Thermometer size={20} className={`flex-shrink-0 ${score >= 80 ? 'text-green-500' : score >= 60 ? 'text-amber-500' : 'text-slate-300'}`} />
                  </div>
                )}

                {/* Conteudo */}
                <div className="card">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Sparkles size={15} className="text-indigo-500" /> Dossiê do Lead
                    </p>
                    <div className="flex items-center gap-2">
                      {saving && <Loader2 size={13} className="text-slate-400 animate-spin" />}
                      <button
                        onClick={handleCopyWhatsApp}
                        className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"
                      >
                        {copied ? <><CheckCircle2 size={12} className="text-green-500" /> Copiado!</> : <><MessageSquare size={12} /> WhatsApp</>}
                      </button>
                      <button
                        onClick={() => exportPDF(analysis, selectedClienteNome || undefined)}
                        className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"
                        title="Baixar PDF"
                      >
                        <FileDown size={12} /> PDF
                      </button>
                      <button
                        onClick={() => setShowFullscreen(true)}
                        className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"
                        title="Tela cheia"
                      >
                        <Maximize2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
                    {(() => {
                      const parsed = parseAnalise(analysis)
                      return parsed
                        ? <AnaliseJSONView data={parsed} />
                        : renderMarkdown(analysis)
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Painel Histórico ── */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowHistory(false)} />
          <div className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <p className="font-semibold text-slate-800 flex items-center gap-2">
                <History size={16} className="text-indigo-500" /> Histórico de Análises
              </p>
              <button onClick={() => setShowHistory(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {historico.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                  <Clock size={28} className="text-slate-200" />
                  <p className="text-sm">Nenhuma análise salva</p>
                </div>
              ) : (
                historico.map(a => (
                  <div key={a.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        className="flex-1 text-left"
                        onClick={() => { handleSelectFromHistory(a); setShowHistory(false) }}
                      >
                        <p className="text-sm font-medium text-slate-800 line-clamp-2">
                          {a.cliente?.nome || 'Lead avulso'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(a.created_at)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {a.score !== null && (
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full
                              ${(a.score ?? 0) >= 80 ? 'bg-green-100 text-green-700' : (a.score ?? 0) >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                              {a.score}pts
                            </span>
                          )}
                          <span className="text-xs text-slate-400 capitalize">{a.modo}</span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDeleteFromHistory(a.id)}
                        className="p-1 text-slate-300 hover:text-red-500 flex-shrink-0 mt-0.5"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-100">
              <button
                onClick={() => { handleReset(); setShowHistory(false) }}
                className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
              >
                <PlusCircle size={14} /> Nova Análise
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Tela Cheia ── */}
      {showFullscreen && analysis && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shadow-sm flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Brain size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Dossiê do Lead{selectedClienteNome ? ` — ${selectedClienteNome}` : ''}
                </p>
                {score !== null && (
                  <p className="text-xs text-slate-500">Score: {score} pts</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyWhatsApp}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                {copied ? <><CheckCircle2 size={12} className="text-green-500" /> Copiado!</> : <><MessageSquare size={12} /> WhatsApp</>}
              </button>
              <button
                onClick={() => exportPDF(analysis, selectedClienteNome || undefined)}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <FileDown size={12} /> PDF
              </button>
              <button
                onClick={() => setShowFullscreen(false)}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Minimize2 size={12} /> Fechar
              </button>
            </div>
          </div>

          {/* Score bar */}
          {score !== null && (
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-4 flex-shrink-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0
                ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}>
                {score}
              </div>
              <div className="flex-1 max-w-xs">
                <p className="text-xs text-slate-500 uppercase font-medium tracking-wide mb-1">Score de Potencial</p>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo scrollável */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-6">
              {(() => {
                const parsed = parseAnalise(analysis)
                return parsed
                  ? <AnaliseJSONView data={parsed} />
                  : <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">{renderMarkdown(analysis)}</div>
              })()}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

export default function AnaliseComportamentoPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <AnaliseComportamentoContent />
    </Suspense>
  )
}
