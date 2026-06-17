import { Cliente, ClasseEconomica, PerfilComprador, Imovel } from '@/types'

// ============================================================
// CLASSIFICAÇÃO AUTOMÁTICA DE PERFIL
// ============================================================

export function calcularClasseEconomica(renda: number): ClasseEconomica {
  if (renda <= 3000)  return 'baixa'
  if (renda <= 12000) return 'media'
  return 'alta'
}

export function calcularPerfilComprador(
  objetivo: string,
  orcamentoMax?: number,
  classeEconomica?: ClasseEconomica
): PerfilComprador {
  if (objetivo === 'investir') return 'investidor'
  if (objetivo === 'alugar')   return 'locacao_futura'
  // objetivo = 'morar'
  if (classeEconomica === 'alta' && orcamentoMax && orcamentoMax > 500000) return 'upgrade'
  return 'primeira_compra'
}

export function calcularScorePotencial(cliente: Partial<Cliente>): number {
  let score = 0
  // Renda informada
  if (cliente.faixa_renda && cliente.faixa_renda > 0) {
    score += 20
    if (cliente.faixa_renda > 10000) score += 10
  }
  // Orçamento definido
  if (cliente.orcamento_min && cliente.orcamento_max) score += 20
  // Objetivo claro
  if (cliente.objetivo) score += 10
  // Zona definida
  if (cliente.zona_interesse) score += 10
  // Contato completo
  if (cliente.telefone) score += 10
  if (cliente.email)    score += 5
  // Tipo definido
  if (cliente.tipo_imovel && cliente.tipo_imovel !== 'qualquer') score += 10
  // Quartos definidos
  if (cliente.quartos_desejados) score += 5
  return Math.min(score, 100)
}

export function calcularInteligenicia(cliente: Partial<Cliente>) {
  const classe = cliente.faixa_renda
    ? calcularClasseEconomica(cliente.faixa_renda)
    : undefined

  const perfil = (cliente.objetivo && classe)
    ? calcularPerfilComprador(cliente.objetivo, cliente.orcamento_max, classe)
    : undefined

  const score = calcularScorePotencial(cliente)

  return { classe_economica: classe, perfil_comprador: perfil, score_potencial: score }
}

// ============================================================
// MATCHING: cliente x imóvel
// ============================================================

export interface MatchResult {
  score: number
  detalhes: {
    tipo: number
    orcamento: number
    quartos: number
    zona: number
    comodidades: number
  }
}

export function calcularMatch(cliente: Cliente, imovel: Imovel): MatchResult {
  const detalhes = { tipo: 0, orcamento: 0, quartos: 0, zona: 0, comodidades: 0 }

  // Tipo (30 pts)
  if (!cliente.tipo_imovel || cliente.tipo_imovel === 'qualquer') {
    detalhes.tipo = 30
  } else if (cliente.tipo_imovel === imovel.tipo) {
    detalhes.tipo = 30
  } else {
    detalhes.tipo = 0
  }

  // Orçamento (30 pts)
  if (cliente.orcamento_min !== undefined && cliente.orcamento_max !== undefined) {
    if (imovel.valor >= cliente.orcamento_min && imovel.valor <= cliente.orcamento_max) {
      detalhes.orcamento = 30
    } else if (imovel.valor <= cliente.orcamento_max * 1.1) {
      detalhes.orcamento = 15 // 10% acima do máximo
    } else if (imovel.valor < cliente.orcamento_min) {
      detalhes.orcamento = 20 // abaixo do mínimo (pode ser bom para investidor)
    }
  } else if (cliente.orcamento_max && imovel.valor <= cliente.orcamento_max) {
    detalhes.orcamento = 25
  }

  // Quartos (20 pts)
  if (cliente.quartos_desejados && imovel.quartos) {
    if (imovel.quartos === cliente.quartos_desejados) {
      detalhes.quartos = 20
    } else if (Math.abs(imovel.quartos - cliente.quartos_desejados) === 1) {
      detalhes.quartos = 10
    } else {
      detalhes.quartos = 0
    }
  } else {
    detalhes.quartos = 10 // sem preferência definida
  }

  // Zona (10 pts)
  if (!cliente.zona_interesse) {
    detalhes.zona = 10
  } else if (cliente.zona_interesse === imovel.zona) {
    detalhes.zona = 10
  }

  // Comodidades (10 pts)
  if (cliente.necessidades && imovel.comodidades && cliente.necessidades.length > 0) {
    const matches = cliente.necessidades.filter(n =>
      imovel.comodidades!.includes(n)
    ).length
    detalhes.comodidades = Math.min(
      Math.round((matches / cliente.necessidades.length) * 10),
      10
    )
  } else {
    detalhes.comodidades = 5
  }

  const score = detalhes.tipo + detalhes.orcamento + detalhes.quartos + detalhes.zona + detalhes.comodidades

  return { score, detalhes }
}

export function getMatchLabel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Excelente', color: 'text-green-600 bg-green-50' }
  if (score >= 65) return { label: 'Bom',       color: 'text-blue-600 bg-blue-50' }
  if (score >= 45) return { label: 'Médio',     color: 'text-amber-600 bg-amber-50' }
  return                   { label: 'Baixo',    color: 'text-slate-500 bg-slate-50' }
}
