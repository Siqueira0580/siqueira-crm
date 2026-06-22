'use client'
import { useState, useMemo } from 'react'
import { calcularCompraImovel, type SistemaAmortizacao } from '@/lib/calculo-compra'
import { calcularMatch } from '@/lib/matching'
import { formatCurrency } from '@/lib/utils'
import type { Cliente, Imovel } from '@/types'
import { Calculator, Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

interface SimuladorCompraProps {
  cliente: Cliente
  imoveis: Imovel[]
  onClose: () => void
}

export default function SimuladorCompra({ cliente, imoveis, onClose }: SimuladorCompraProps) {
  const imoveisOrdenados = useMemo(() => {
    return [...imoveis]
      .map(imovel => ({ imovel, score: calcularMatch(cliente, imovel).score }))
      .sort((a, b) => b.score - a.score)
  }, [imoveis, cliente])

  const [imovelId, setImovelId] = useState(imoveisOrdenados[0]?.imovel.id || '')
  const imovel = imoveisOrdenados.find(i => i.imovel.id === imovelId)?.imovel

  const [valorEntradaPct, setValorEntradaPct] = useState('20')
  const [prazoMeses, setPrazoMeses] = useState('360')
  const [taxaJurosAnual, setTaxaJurosAnual] = useState('11.5')
  const [sistema, setSistema] = useState<SistemaAmortizacao>('SAC')
  const [financiamentoSFH, setFinanciamentoSFH] = useState(false)
  const [cartorioPercentual, setCartorioPercentual] = useState('1.5')

  const rendaMensalTotal = (cliente.faixa_renda || 0) + (cliente.conjuge_renda || 0)

  const valorEntrada = imovel ? (imovel.valor * (Number(valorEntradaPct) || 0)) / 100 : 0

  const resultado = useMemo(() => {
    if (!imovel) return null
    return calcularCompraImovel({
      valorImovel: imovel.valor,
      valorEntrada,
      prazoMeses: Number(prazoMeses) || 360,
      taxaJurosAnual: Number(taxaJurosAnual) || 11.5,
      sistema,
      financiamentoSFH,
      cartorioPercentual: cartorioPercentual !== '' ? Number(cartorioPercentual) : undefined,
      possuiOutrosImoveis: cliente.possui_outros_imoveis,
      rendaMensalTotal: rendaMensalTotal > 0 ? rendaMensalTotal : null,
      orcamentoMaxCliente: cliente.orcamento_max ?? null,
    })
  }, [imovel, valorEntrada, prazoMeses, taxaJurosAnual, sistema, financiamentoSFH, cartorioPercentual, cliente, rendaMensalTotal])

  if (imoveisOrdenados.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Nenhum imóvel disponível cadastrado para simular.</p>
        <div className="flex justify-end">
          <button onClick={onClose} className="btn-secondary">Fechar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-xl px-3 py-2.5">
        <Info size={14} className="mt-0.5 flex-shrink-0" />
        Estimativa simplificada para apoiar a negociação — ITBI e cartório usam referências e podem variar; não substitui simulação oficial do banco antes do fechamento.
      </div>

      {/* Seletor de imóvel */}
      <div>
        <label className="label">Imóvel</label>
        <select className="input" value={imovelId} onChange={e => setImovelId(e.target.value)}>
          {imoveisOrdenados.map(({ imovel: i, score }) => (
            <option key={i.id} value={i.id}>
              {i.titulo} — {formatCurrency(i.valor)} ({score}% compatível)
            </option>
          ))}
        </select>
      </div>

      {imovel && resultado && (
        <>
          {/* Dados do cliente (somente leitura) */}
          <div className="flex flex-wrap gap-3 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
            <span>Renda do cliente: <strong className="text-slate-700">{rendaMensalTotal > 0 ? `${formatCurrency(rendaMensalTotal)}/mês` : 'não informada'}</strong></span>
            <span>Orçamento máx.: <strong className="text-slate-700">{cliente.orcamento_max ? formatCurrency(cliente.orcamento_max) : 'não informado'}</strong></span>
            <span>Outros imóveis: <strong className="text-slate-700">{cliente.possui_outros_imoveis ? 'sim' : 'não'}</strong></span>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Entrada (% do valor)</label>
              <input type="number" step="1" className="input" value={valorEntradaPct} onChange={e => setValorEntradaPct(e.target.value)} />
              <p className="text-xs text-slate-400 mt-1">{formatCurrency(valorEntrada)}</p>
            </div>
            <div>
              <label className="label">Prazo (meses)</label>
              <select className="input" value={prazoMeses} onChange={e => setPrazoMeses(e.target.value)}>
                <option value="120">120 (10 anos)</option>
                <option value="180">180 (15 anos)</option>
                <option value="240">240 (20 anos)</option>
                <option value="360">360 (30 anos)</option>
                <option value="420">420 (35 anos)</option>
              </select>
            </div>
            <div>
              <label className="label">Taxa de juros (% a.a.)</label>
              <input type="number" step="0.1" className="input" value={taxaJurosAnual} onChange={e => setTaxaJurosAnual(e.target.value)} />
              <p className="text-xs text-slate-400 mt-1">Referência atual de mercado: ~11,5% a.a. + TR (editável).</p>
            </div>
            <div>
              <label className="label">Sistema de amortização</label>
              <div className="flex gap-2 mt-1">
                {(['SAC', 'PRICE'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSistema(s)}
                    className={`flex-1 text-sm px-3 py-2 rounded-lg border transition-colors ${sistema === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                  >
                    {s === 'SAC' ? 'SAC (parcela decrescente)' : 'PRICE (parcela fixa)'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Cartório/registro (% referência)</label>
              <input type="number" step="0.1" className="input" value={cartorioPercentual} onChange={e => setCartorioPercentual(e.target.value)} />
              <p className="text-xs text-slate-400 mt-1">Estimativa — tabela oficial varia por valor venal (TJSP/ANOREG-SP).</p>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-slate-600 mb-2.5">
                <input type="checkbox" checked={financiamentoSFH} onChange={e => setFinanciamentoSFH(e.target.checked)} className="rounded" />
                Financiamento SFH/PAR/HIS (ITBI reduzido)
              </label>
            </div>
          </div>

          {/* Resultado */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Calculator size={16} className="text-blue-600" />
              <h3 className="font-semibold text-slate-800 text-sm">Demonstrativo</h3>
            </div>

            <LinhaResultado label="Preço do imóvel" valor={resultado.valorImovel} />
            <LinhaResultado label="Entrada" valor={-resultado.valorEntrada} />

            {resultado.itbiIsento ? (
              <div className="flex items-start gap-1.5 text-xs text-green-700 bg-green-50 rounded-lg px-2.5 py-1.5 my-1">
                <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" /> {resultado.itbiMotivo}
              </div>
            ) : (
              <>
                <LinhaResultado label="ITBI" valor={-resultado.itbiValor} />
                {resultado.itbiMotivo && <p className="text-xs text-slate-400 italic">{resultado.itbiMotivo}</p>}
              </>
            )}

            <LinhaResultado label={`Cartório/registro (${resultado.cartorioPercentual}%)`} valor={-resultado.cartorioValor} />

            <div className="border-t border-slate-200 pt-2 mt-1 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Custo total no fechamento</span>
              <span className="font-bold text-slate-800">{formatCurrency(resultado.custoTotalFechamento)}</span>
            </div>

            <div className="border-t border-slate-200 pt-2 mt-2 space-y-2">
              <LinhaResultado label="Valor financiado" valor={resultado.valorFinanciado} neutro />
              <LinhaResultado
                label={resultado.sistema === 'SAC' ? 'Parcela inicial (SAC)' : 'Parcela fixa (Price)'}
                valor={resultado.parcelaInicial}
                neutro
              />
              {resultado.sistema === 'SAC' && (
                <LinhaResultado label="Parcela final (SAC)" valor={resultado.parcelaFinal} neutro />
              )}
            </div>

            {resultado.rendaComprometidaPercentual != null && (
              <div className={`flex items-start gap-1.5 text-xs rounded-lg px-2.5 py-1.5 my-1 ${resultado.alertaRendaComprometida ? 'text-amber-700 bg-amber-50' : 'text-green-700 bg-green-50'}`}>
                {resultado.alertaRendaComprometida ? <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" /> : <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" />}
                Comprometimento de renda: {(resultado.rendaComprometidaPercentual * 100).toFixed(1)}%
                {resultado.alertaRendaComprometida ? ' — acima de 30%, pode dificultar aprovação do financiamento.' : ' — dentro do limite usual de 30%.'}
              </div>
            )}

            {resultado.dentroDoOrcamento != null && (
              <div className={`flex items-start gap-1.5 text-xs rounded-lg px-2.5 py-1.5 ${resultado.dentroDoOrcamento ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                {resultado.dentroDoOrcamento ? <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" /> : <XCircle size={13} className="mt-0.5 flex-shrink-0" />}
                {resultado.dentroDoOrcamento ? 'Dentro do orçamento informado pelo cliente.' : 'Acima do orçamento máximo informado pelo cliente.'}
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex justify-end gap-3 pt-1">
        <button onClick={onClose} className="btn-secondary">Fechar</button>
      </div>
    </div>
  )
}

function LinhaResultado({ label, valor, neutro = false }: { label: string; valor: number; neutro?: boolean }) {
  const cor = neutro ? 'text-slate-700' : valor < 0 ? 'text-red-600' : 'text-slate-700'
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium ${cor}`}>
        {valor < 0 ? '− ' : ''}{formatCurrency(Math.abs(valor))}
      </span>
    </div>
  )
}
