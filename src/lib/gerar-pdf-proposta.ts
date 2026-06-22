// Gera o PDF da proposta de compra a partir do resultado da simulação.
// Roda 100% no navegador (jsPDF) — não depende de serviço externo nem de
// Chromium no servidor, o que evita custos/limites de função serverless.

import { jsPDF } from 'jspdf'
import { formatCurrency } from './utils'
import type { Cliente, Imovel } from './../types'
import type { ResultadoCompraImovel } from './calculo-compra'

interface GerarPdfPropostaParams {
  cliente: Cliente
  imovel: Imovel
  resultado: ResultadoCompraImovel
}

export function gerarPdfProposta({ cliente, imovel, resultado }: GerarPdfPropostaParams): ArrayBuffer {
  const doc = new jsPDF()
  const margemX = 18
  let y = 20

  // Cabeçalho
  doc.setFillColor(30, 58, 95)
  doc.rect(0, 0, 210, 32, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Siqueira Inteligência Imobiliária', margemX, 16)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Proposta de Compra — Simulação Financeira', margemX, 24)

  y = 44
  doc.setTextColor(30, 41, 59)

  const linha = (label: string, valor: string, destaque = false) => {
    doc.setFont('helvetica', destaque ? 'bold' : 'normal')
    doc.setFontSize(destaque ? 12 : 10.5)
    doc.text(label, margemX, y)
    doc.text(valor, 192, y, { align: 'right' })
    y += destaque ? 8 : 6.5
  }

  const secao = (titulo: string) => {
    y += 3
    doc.setFillColor(241, 245, 249)
    doc.rect(margemX - 4, y - 5, 178, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(30, 58, 95)
    doc.text(titulo, margemX, y)
    doc.setTextColor(30, 41, 59)
    y += 8
  }

  secao('Cliente e Imóvel')
  linha('Cliente', cliente.nome)
  linha('Imóvel', imovel.titulo)
  if (imovel.bairro || imovel.cidade) {
    linha('Localização', [imovel.bairro, imovel.cidade].filter(Boolean).join(' — '))
  }
  linha('Preço do imóvel', formatCurrency(resultado.valorImovel), true)

  secao('Custos no Fechamento')
  linha('Entrada', formatCurrency(resultado.valorEntrada))
  linha('ITBI' + (resultado.itbiIsento ? ' (isento)' : ''), formatCurrency(resultado.itbiValor))
  linha(`Cartório/registro (${resultado.cartorioPercentual}%)`, formatCurrency(resultado.cartorioValor))
  linha('Custo total no fechamento', formatCurrency(resultado.custoTotalFechamento), true)
  if (resultado.itbiMotivo) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 116, 139)
    const wrapped = doc.splitTextToSize(resultado.itbiMotivo, 174)
    doc.text(wrapped, margemX, y)
    y += wrapped.length * 4 + 2
    doc.setTextColor(30, 41, 59)
  }

  secao('Financiamento')
  linha('Valor financiado', formatCurrency(resultado.valorFinanciado))
  linha('Sistema de amortização', resultado.sistema === 'SAC' ? 'SAC (parcela decrescente)' : 'PRICE (parcela fixa)')
  linha('Prazo', `${resultado.prazoMeses} meses`)
  linha('Taxa de juros', `${resultado.taxaJurosAnual}% a.a.`)
  linha(resultado.sistema === 'SAC' ? 'Parcela inicial' : 'Parcela', formatCurrency(resultado.parcelaInicial), true)
  if (resultado.sistema === 'SAC') {
    linha('Parcela final', formatCurrency(resultado.parcelaFinal))
  }

  secao('Indicadores')
  if (resultado.rendaComprometidaPercentual != null) {
    linha('Comprometimento de renda', `${(resultado.rendaComprometidaPercentual * 100).toFixed(1)}%`)
  }
  if (resultado.dentroDoOrcamento != null) {
    linha('Dentro do orçamento do cliente', resultado.dentroDoOrcamento ? 'Sim' : 'Não')
  }

  // Rodapé
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(148, 163, 184)
  const dataGeracao = new Date().toLocaleDateString('pt-BR')
  doc.text(
    `Estimativa simplificada gerada em ${dataGeracao} para apoiar a negociação — não substitui simulação oficial do banco/cartório antes do fechamento.`,
    margemX, 282, { maxWidth: 174 }
  )

  return doc.output('arraybuffer')
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any)
  }
  return btoa(binary)
}
