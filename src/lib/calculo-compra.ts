// Simulador de compra de imóvel (lado comprador) — São Paulo.
// Funções puras (sem I/O). O componente de UI só chama calcularCompraImovel()
// e exibe o resultado. Nada aqui salva nada no banco.
//
// ⚠️ ESTIMATIVA simplificada para apoiar a negociação, não um cálculo financeiro
// definitivo. O ITBI usa o preço do imóvel como base (na prática a prefeitura
// cobra sobre o maior valor entre o preço e o "valor venal de referência", que
// não está disponível no sistema). O custo de cartório é uma referência
// percentual configurável, não a tabela exata de emolumentos do TJSP/ANOREG-SP.
// Sempre recomendar confirmação com o banco/cartório antes do fechamento.

export type SistemaAmortizacao = 'SAC' | 'PRICE'

export interface DadosCompraImovel {
  valorImovel: number
  valorEntrada: number
  prazoMeses: number
  taxaJurosAnual: number // % a.a., ex: 11.5
  sistema: SistemaAmortizacao
  financiamentoSFH?: boolean // SFH/PAR/HIS — alíquota de ITBI reduzida sobre parte financiada
  cartorioPercentual?: number // referência configurável, padrão 1.5%
  possuiOutrosImoveis?: boolean | null // cliente já tem outro imóvel? (afeta isenção de 1º imóvel)
  rendaMensalTotal?: number | null // faixa_renda + conjuge_renda do cliente
  orcamentoMaxCliente?: number | null
}

export interface ResultadoCompraImovel {
  valorImovel: number
  valorEntrada: number
  valorFinanciado: number

  itbiValor: number
  itbiIsento: boolean
  itbiMotivo: string | null

  cartorioPercentual: number
  cartorioValor: number

  custoTotalFechamento: number // entrada + ITBI + cartório (o que sai do bolso no fechamento)

  sistema: SistemaAmortizacao
  prazoMeses: number
  taxaJurosAnual: number
  parcelaInicial: number
  parcelaFinal: number // = parcelaInicial no PRICE; menor no SAC

  rendaComprometidaPercentual: number | null // parcela inicial / renda mensal total
  alertaRendaComprometida: boolean // > 30%

  dentroDoOrcamento: boolean | null
}

const LIMITE_ISENCAO_ITBI_PRIMEIRO_IMOVEL = 245_527.77
const LIMITE_REDUCAO_SFH = 110_175.62
const ALIQUOTA_ITBI_PADRAO = 0.03
const ALIQUOTA_ITBI_REDUZIDA_SFH = 0.005
const CARTORIO_PERCENTUAL_PADRAO = 1.5
const LIMITE_COMPROMETIMENTO_RENDA = 0.30

function calcularITBI(
  valorImovel: number,
  valorFinanciado: number,
  financiamentoSFH: boolean,
  possuiOutrosImoveis: boolean | null | undefined
): { valor: number; isento: boolean; motivo: string | null } {
  // Isenção total de 1º imóvel (sem outros imóveis) até o limite
  if (!possuiOutrosImoveis && valorImovel <= LIMITE_ISENCAO_ITBI_PRIMEIRO_IMOVEL) {
    return {
      valor: 0,
      isento: true,
      motivo: `Primeiro imóvel, valor até R$ ${LIMITE_ISENCAO_ITBI_PRIMEIRO_IMOVEL.toLocaleString('pt-BR')} — isento de ITBI.`,
    }
  }

  if (financiamentoSFH && valorFinanciado > 0) {
    const parteReduzida = Math.min(valorFinanciado, LIMITE_REDUCAO_SFH)
    const parteNormal = Math.max(valorImovel - parteReduzida, 0)
    const valor = parteReduzida * ALIQUOTA_ITBI_REDUZIDA_SFH + parteNormal * ALIQUOTA_ITBI_PADRAO
    return {
      valor,
      isento: false,
      motivo: `Alíquota reduzida (0,5%) sobre até R$ ${LIMITE_REDUCAO_SFH.toLocaleString('pt-BR')} financiados pelo SFH, 3% sobre o restante.`,
    }
  }

  return { valor: valorImovel * ALIQUOTA_ITBI_PADRAO, isento: false, motivo: null }
}

function calcularParcelasSAC(valorFinanciado: number, taxaMensal: number, prazoMeses: number) {
  const amortizacao = valorFinanciado / prazoMeses
  const parcelaInicial = amortizacao + valorFinanciado * taxaMensal
  const saldoFinal = amortizacao // saldo devedor antes da última parcela
  const parcelaFinal = amortizacao + saldoFinal * taxaMensal
  return { parcelaInicial, parcelaFinal }
}

function calcularParcelaPrice(valorFinanciado: number, taxaMensal: number, prazoMeses: number) {
  if (taxaMensal === 0) return valorFinanciado / prazoMeses
  const fator = Math.pow(1 + taxaMensal, prazoMeses)
  return valorFinanciado * (taxaMensal * fator) / (fator - 1)
}

export function calcularCompraImovel(dados: DadosCompraImovel): ResultadoCompraImovel {
  const valorImovel = dados.valorImovel || 0
  const valorEntrada = Math.min(dados.valorEntrada || 0, valorImovel)
  const valorFinanciado = Math.max(valorImovel - valorEntrada, 0)
  const prazoMeses = dados.prazoMeses || 360
  const taxaJurosAnual = dados.taxaJurosAnual ?? 11.5
  const taxaMensal = Math.pow(1 + taxaJurosAnual / 100, 1 / 12) - 1

  const { valor: itbiValor, isento: itbiIsento, motivo: itbiMotivo } = calcularITBI(
    valorImovel, valorFinanciado, !!dados.financiamentoSFH, dados.possuiOutrosImoveis
  )

  const cartorioPercentual = dados.cartorioPercentual ?? CARTORIO_PERCENTUAL_PADRAO
  const cartorioValor = valorImovel * (cartorioPercentual / 100)

  const custoTotalFechamento = valorEntrada + itbiValor + cartorioValor

  let parcelaInicial = 0
  let parcelaFinal = 0
  if (valorFinanciado > 0) {
    if (dados.sistema === 'SAC') {
      const r = calcularParcelasSAC(valorFinanciado, taxaMensal, prazoMeses)
      parcelaInicial = r.parcelaInicial
      parcelaFinal = r.parcelaFinal
    } else {
      const p = calcularParcelaPrice(valorFinanciado, taxaMensal, prazoMeses)
      parcelaInicial = p
      parcelaFinal = p
    }
  }

  const rendaMensalTotal = dados.rendaMensalTotal || null
  const rendaComprometidaPercentual = rendaMensalTotal && rendaMensalTotal > 0
    ? parcelaInicial / rendaMensalTotal
    : null

  const dentroDoOrcamento = dados.orcamentoMaxCliente != null
    ? valorImovel <= dados.orcamentoMaxCliente
    : null

  return {
    valorImovel,
    valorEntrada,
    valorFinanciado,
    itbiValor,
    itbiIsento,
    itbiMotivo,
    cartorioPercentual,
    cartorioValor,
    custoTotalFechamento,
    sistema: dados.sistema,
    prazoMeses,
    taxaJurosAnual,
    parcelaInicial,
    parcelaFinal,
    rendaComprometidaPercentual,
    alertaRendaComprometida: rendaComprometidaPercentual != null && rendaComprometidaPercentual > LIMITE_COMPROMETIMENTO_RENDA,
    dentroDoOrcamento,
  }
}
