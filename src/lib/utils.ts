import { ClasseEconomica, EtapaFunil, PerfilComprador, StatusImovel, StatusVisita } from '@/types'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
  }
  return phone
}

export const ETAPAS_FUNIL: Record<EtapaFunil, { label: string; color: string }> = {
  lead_novo:        { label: 'Lead Novo',         color: 'bg-slate-500' },
  contato_iniciado: { label: 'Contato Iniciado',  color: 'bg-blue-500' },
  visita_agendada:  { label: 'Visita Agendada',   color: 'bg-indigo-500' },
  proposta_enviada: { label: 'Proposta Enviada',  color: 'bg-amber-500' },
  negociacao:       { label: 'Em Negociação',     color: 'bg-orange-500' },
  fechado:          { label: 'Fechado ✓',         color: 'bg-green-600' },
  perdido:          { label: 'Perdido',           color: 'bg-red-500' },
}

export const STATUS_IMOVEL: Record<StatusImovel, { label: string; color: string }> = {
  disponivel: { label: 'Disponível', color: 'bg-green-100 text-green-800' },
  vendido:    { label: 'Vendido',    color: 'bg-slate-100 text-slate-600' },
  reservado:  { label: 'Reservado', color: 'bg-amber-100 text-amber-800' },
}

export const STATUS_VISITA: Record<StatusVisita, { label: string; color: string }> = {
  agendado:  { label: 'Agendado',  color: 'bg-blue-100 text-blue-800' },
  realizado: { label: 'Realizado', color: 'bg-green-100 text-green-800' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
}

export const CLASSE_LABELS: Record<ClasseEconomica, { label: string; color: string }> = {
  baixa: { label: 'Classe C/D',  color: 'bg-slate-100 text-slate-700' },
  media: { label: 'Classe B/C',  color: 'bg-blue-100 text-blue-700' },
  alta:  { label: 'Classe A/B',  color: 'bg-purple-100 text-purple-700' },
}

export const PERFIL_LABELS: Record<PerfilComprador, { label: string; icon: string }> = {
  investidor:      { label: 'Investidor',       icon: '📈' },
  primeira_compra: { label: 'Primeira Compra',  icon: '🏠' },
  upgrade:         { label: 'Upgrade',          icon: '⬆️' },
  locacao_futura:  { label: 'Locação Futura',   icon: '🔑' },
}

export const COMODIDADES_OPTIONS = [
  'Vaga de garagem',
  'Varanda/Sacada',
  'Condomínio fechado',
  'Piscina',
  'Academia',
  'Churrasqueira',
  'Elevador',
  'Portaria 24h',
  'Área de lazer',
  'Pet friendly',
]

export const NECESSIDADES_OPTIONS = COMODIDADES_OPTIONS

export function whatsappLink(telefone: string, mensagem?: string): string {
  const numero = telefone.replace(/\D/g, '')
  const msg = mensagem ? encodeURIComponent(mensagem) : ''
  return `https://wa.me/55${numero}${msg ? `?text=${msg}` : ''}`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
