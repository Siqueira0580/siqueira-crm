// Cálculo do valor líquido estimado ao vendedor de um imóvel.
// Funções puras (sem I/O) — o componente de UI só chama calcularVendaImovel()
// e exibe o resultado. Nada aqui salva nada no banco.
//
// ⚠️ Isto é uma ESTIMATIVA simplificada para apoiar a negociação, não um cálculo
// fiscal definitivo. Casos reais podem ter custos de aquisição adicionais dedutíveis
// (ITBI pago na compra, reformas comprovadas, corretagem da compra), redutores para
// imóveis adquiridos antes de 1988, ou outras isenções não cobertas aqui. Sempre
// recomendar confirmação com contador antes do fechamento.

export interface DadosVendaImovel {
  valorVenda: number
  valorAquisicao?: number | null
  dataAquisicao?: string | null // ISO date
  saldoDevedorFinanciamento?: number | null
  comissaoPercentual?: number | null // padrão 6% (referência CRECI-SP para imóveis urbanos: 6%–8%)
  imovelUnicoProprietario?: boolean | null
  isencaoUsadaUltimos5Anos?: boolean | null
}

export interface ResultadoVendaImovel {
  valorVenda: number
  comissaoPercentual: number
  comissaoValor: number
  saldoDevedorFinanciamento: number
  ganhoCapital: number | null // null = não foi possível apurar (sem valor de aquisição informado)
  isento: boolean
  motivoIsencao: string | null
  irValor: number
  valorLiquido: number
  alertaReinvestimento: boolean // lembrar que reinvestir em até 180 dias pode isentar (não aplicado automaticamente)
}

const LIMITE_ISENCAO_IMOVEL_UNICO = 440_000
const ANO_LIMITE_ISENCAO_ANTIGOS = 1969

// Faixas progressivas de IR sobre ganho de capital (Lei 13.259/2016) — cada faixa
// tributa só a parte do ganho que cai dentro dela, como no IR de pessoa física.
const FAIXAS_IR_GANHO_CAPITAL = [
  { limite: 5_000_000, aliquota: 0.15 },
  { limite: 10_000_000, aliquota: 0.175 },
  { limite: 30_000_000, aliquota: 0.20 },
  { limite: Infinity, aliquota: 0.225 },
]

function calcularIRProgressivo(ganho: number): number {
  let imposto = 0
  let baseAnterior = 0
  for (const faixa of FAIXAS_IR_GANHO_CAPITAL) {
    if (ganho <= baseAnterior) break
    const baseNaFaixa = Math.min(ganho, faixa.limite) - baseAnterior
    imposto += baseNaFaixa * faixa.aliquota
    baseAnterior = faixa.limite
  }
  return imposto
}

export function calcularVendaImovel(dados: DadosVendaImovel): ResultadoVendaImovel {
  const valorVenda = dados.valorVenda || 0
  const comissaoPercentual = dados.comissaoPercentual ?? 6
  const comissaoValor = valorVenda * (comissaoPercentual / 100)
  const saldoDevedorFinanciamento = dados.saldoDevedorFinanciamento || 0

  let ganhoCapital: number | null = null
  let isento = false
  let motivoIsencao: string | null = null

  if (dados.valorAquisicao != null && dados.valorAquisicao >= 0) {
    ganhoCapital = Math.max(0, valorVenda - dados.valorAquisicao)

    const anoAquisicao = dados.dataAquisicao ? new Date(dados.dataAquisicao).getFullYear() : null

    if (anoAquisicao != null && anoAquisicao <= ANO_LIMITE_ISENCAO_ANTIGOS) {
      isento = true
      motivoIsencao = `Imóvel adquirido em ${anoAquisicao} (até 1969) — isento de IR sobre ganho de capital.`
    } else if (
      dados.imovelUnicoProprietario &&
      valorVenda <= LIMITE_ISENCAO_IMOVEL_UNICO &&
      !dados.isencaoUsadaUltimos5Anos
    ) {
      isento = true
      motivoIsencao = `Único imóvel do proprietário, vendido por até R$ 440.000, sem uso da isenção nos últimos 5 anos — isento de IR.`
    }
  }

  const irValor = !isento && ganhoCapital ? calcularIRProgressivo(ganhoCapital) : 0

  const valorLiquido = valorVenda - comissaoValor - saldoDevedorFinanciamento - irValor

  return {
    valorVenda,
    comissaoPercentual,
    comissaoValor,
    saldoDevedorFinanciamento,
    ganhoCapital,
    isento,
    motivoIsencao,
    irValor,
    valorLiquido,
    alertaReinvestimento: !isento && !!ganhoCapital && ganhoCapital > 0,
  }
}
