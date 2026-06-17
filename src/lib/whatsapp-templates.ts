import type { Cliente, Imovel } from '@/types'
import { formatCurrency } from './utils'

export interface WhatsAppTemplate {
  id: string
  label: string
  message: string
}

export function getWhatsAppTemplates(
  cliente: Cliente,
  imovel?: Partial<Imovel>
): WhatsAppTemplate[] {
  const primeiroNome = cliente.nome.split(' ')[0]
  const tipo =
    cliente.tipo_imovel && cliente.tipo_imovel !== 'qualquer'
      ? cliente.tipo_imovel
      : 'imóvel'
  const zona = cliente.zona_interesse ? ` na Zona ${cliente.zona_interesse}` : ''
  const orcamento = cliente.orcamento_max
    ? ` até ${formatCurrency(cliente.orcamento_max)}`
    : ''
  const quartos = cliente.quartos_desejados
    ? ` com ${cliente.quartos_desejados} quartos`
    : ''

  return [
    {
      id: 'primeiro_contato',
      label: '👋 Primeiro contato',
      message: `Olá ${primeiroNome}! Tudo bem? 😊 Aqui é da *Siqueira Inteligência Imobiliária*. Vi que você está interessado em um ${tipo}${zona}${orcamento}. Posso te mostrar as melhores opções disponíveis?`,
    },
    {
      id: 'oferta',
      label: '🏠 Indicar imóvel',
      message: imovel?.titulo
        ? `Olá ${primeiroNome}! Encontrei um *${imovel.tipo || tipo}* perfeito para você: _"${imovel.titulo}"_${imovel.valor ? ` por ${formatCurrency(imovel.valor)}` : ''}${zona}. Gostaria de ver as fotos e agendar uma visita? 📷`
        : `Olá ${primeiroNome}! Tenho ótimas novidades! 🏡 Encontrei opções de *${tipo}*${quartos}${zona}${orcamento} que combinam com o seu perfil. Posso te enviar os detalhes?`,
    },
    {
      id: 'visita',
      label: '📅 Agendar visita',
      message: `Olá ${primeiroNome}! Gostaria de agendar uma visita ao imóvel que separei especialmente para você. Quais dias e horários funcionam melhor esta semana? 😊`,
    },
    {
      id: 'followup',
      label: '🔄 Follow-up',
      message: `Olá ${primeiroNome}! Passando para saber se ainda está procurando um ${tipo}${zona}. Temos novidades no mercado que podem te interessar! Posso te ligar para conversar? 📞`,
    },
    {
      id: 'fechamento',
      label: '🤝 Proposta/Fechamento',
      message: `Olá ${primeiroNome}! Tenho uma proposta especial que preparei pensando no seu perfil. Pode ser a oportunidade que você estava esperando! Quando podemos conversar? 🤝`,
    },
  ]
}
