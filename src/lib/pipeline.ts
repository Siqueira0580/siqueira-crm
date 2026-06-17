import { createClient } from '@/lib/supabase'
import { ETAPAS_FUNIL } from '@/lib/utils'
import type { EtapaFunil } from '@/types'

// Ordem das etapas para comparacao
export const ETAPA_ORDEM: Record<EtapaFunil, number> = {
  lead_novo: 0,
  contato_iniciado: 1,
  visita_agendada: 2,
  proposta_enviada: 3,
  negociacao: 4,
  fechado: 5,
  perdido: 6,
}

/**
 * Atualiza a etapa do funil de um cliente e registra no historico.
 * Por padrao so avanca (nao regressa), exceto quando forcarRegressao = true.
 * Retorna true em caso de sucesso, false em caso de erro.
 */
export async function atualizarPipelineCliente(
  clienteId: string,
  novaEtapa: EtapaFunil,
  descricao: string,
  forcarRegressao = false
): Promise<boolean> {
  try {
    const supabase = createClient()

    const { data: cliente, error } = await supabase
      .from('clientes')
      .select('etapa_funil, historico')
      .eq('id', clienteId)
      .single()

    if (error || !cliente) {
      console.error('[pipeline] erro ao buscar cliente:', error)
      return false
    }

    const etapaAtual = cliente.etapa_funil as EtapaFunil
    const ordemAtual = ETAPA_ORDEM[etapaAtual] ?? 0
    const ordemNova = ETAPA_ORDEM[novaEtapa] ?? 0

    // Nao mover para tras, a menos que seja forcado (ex: cancelamento de visita)
    if (!forcarRegressao && ordemNova <= ordemAtual) return false

    const novaEntrada = {
      data: new Date().toISOString(),
      tipo: 'sistema',
      descricao: `${descricao} (${ETAPAS_FUNIL[etapaAtual]?.label ?? etapaAtual} -> ${ETAPAS_FUNIL[novaEtapa]?.label ?? novaEtapa})`,
    }

    // Garante que historico seja sempre um array antes de fazer o spread
    const historicoExistente = Array.isArray(cliente.historico) ? cliente.historico : []
    const historicoAtualizado = [...historicoExistente, novaEntrada]

    const { error: updateError } = await supabase
      .from('clientes')
      .update({ etapa_funil: novaEtapa, historico: historicoAtualizado })
      .eq('id', clienteId)

    if (updateError) {
      console.error('[pipeline] erro ao atualizar etapa:', updateError)
      return false
    }

    return true
  } catch (err) {
    console.error('[pipeline] excecao inesperada:', err)
    return false
  }
}
