'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { calcularVendaImovel } from '@/lib/calculo-venda'
import { formatCurrency } from '@/lib/utils'
import type { Imovel } from '@/types'
import { Calculator, Info, CheckCircle2, AlertTriangle, Loader2, Save } from 'lucide-react'

const supabase = createClient()

interface CalculadoraVendaProps {
  imovel: Imovel
  onClose: () => void
  onSalvo?: () => void
}

export default function CalculadoraVenda({ imovel, onClose, onSalvo }: CalculadoraVendaProps) {
  const [valorVenda, setValorVenda] = useState(String(imovel.valor ?? ''))
  const [valorAquisicao, setValorAquisicao] = useState(
    imovel.valor_aquisicao != null ? String(imovel.valor_aquisicao) : ''
  )
  const [dataAquisicao, setDataAquisicao] = useState(imovel.data_aquisicao || '')
  const [saldoDevedor, setSaldoDevedor] = useState(
    imovel.saldo_devedor_financiamento != null ? String(imovel.saldo_devedor_financiamento) : ''
  )
  const [comissaoPercentual, setComissaoPercentual] = useState(
    String(imovel.comissao_percentual ?? 6)
  )
  const [imovelUnico, setImovelUnico] = useState(!!imovel.imovel_unico_proprietario)
  const [isencaoUsada, setIsencaoUsada] = useState(!!imovel.isencao_usada_ultimos_5_anos)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  const resultado = useMemo(() => calcularVendaImovel({
    valorVenda: Number(valorVenda) || 0,
    valorAquisicao: valorAquisicao !== '' ? Number(valorAquisicao) : null,
    dataAquisicao: dataAquisicao || null,
    saldoDevedorFinanciamento: saldoDevedor !== '' ? Number(saldoDevedor) : null,
    comissaoPercentual: comissaoPercentual !== '' ? Number(comissaoPercentual) : null,
    imovelUnicoProprietario: imovelUnico,
    isencaoUsadaUltimos5Anos: isencaoUsada,
  }), [valorVenda, valorAquisicao, dataAquisicao, saldoDevedor, comissaoPercentual, imovelUnico, isencaoUsada])

  const salvarNoImovel = async () => {
    setSalvando(true)
    setSalvo(false)
    const { error } = await (supabase.from('imoveis') as any).update({
      valor_aquisicao: valorAquisicao !== '' ? Number(valorAquisicao) : null,
      data_aquisicao: dataAquisicao || null,
      saldo_devedor_financiamento: saldoDevedor !== '' ? Number(saldoDevedor) : null,
      comissao_percentual: comissaoPercentual !== '' ? Number(comissaoPercentual) : 6,
      imovel_unico_proprietario: imovelUnico,
      isencao_usada_ultimos_5_anos: isencaoUsada,
    }).eq('id', imovel.id)
    setSalvando(false)
    if (!error) {
      setSalvo(true)
      onSalvo?.()
      setTimeout(() => setSalvo(false), 2500)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-xl px-3 py-2.5">
        <Info size={14} className="mt-0.5 flex-shrink-0" />
        Estimativa simplificada para apoiar a negociação — não substitui orientação contábil para confirmar isenções e custos dedutíveis antes do fechamento.
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Preço de venda (R$)</label>
          <input type="number" className="input" value={valorVenda} onChange={e => setValorVenda(e.target.value)} />
        </div>
        <div>
          <label className="label">Comissão do corretor (%)</label>
          <input type="number" step="0.5" className="input" value={comissaoPercentual} onChange={e => setComissaoPercentual(e.target.value)} />
          <p className="text-xs text-slate-400 mt-1">Referência CRECI-SP para imóveis urbanos: 6% a 8%.</p>
        </div>
        <div>
          <label className="label">Saldo devedor de financiamento (R$)</label>
          <input type="number" className="input" placeholder="0" value={saldoDevedor} onChange={e => setSaldoDevedor(e.target.value)} />
        </div>
        <div />
        <div>
          <label className="label">Valor de aquisição original (R$)</label>
          <input type="number" className="input" placeholder="Quanto o proprietário pagou" value={valorAquisicao} onChange={e => setValorAquisicao(e.target.value)} />
        </div>
        <div>
          <label className="label">Data de aquisição</label>
          <input type="date" className="input" value={dataAquisicao} onChange={e => setDataAquisicao(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={imovelUnico} onChange={e => setImovelUnico(e.target.checked)} className="rounded" />
          É o único imóvel do proprietário
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={isencaoUsada} onChange={e => setIsencaoUsada(e.target.checked)} className="rounded" />
          Já usou a isenção de imóvel único nos últimos 5 anos
        </label>
      </div>

      {/* Resultado */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Calculator size={16} className="text-blue-600" />
          <h3 className="font-semibold text-slate-800 text-sm">Demonstrativo</h3>
        </div>

        <LinhaResultado label="Preço de venda" valor={resultado.valorVenda} />
        <LinhaResultado label={`Comissão do corretor (${resultado.comissaoPercentual}%)`} valor={-resultado.comissaoValor} />
        {resultado.saldoDevedorFinanciamento > 0 && (
          <LinhaResultado label="Saldo devedor de financiamento" valor={-resultado.saldoDevedorFinanciamento} />
        )}

        {resultado.ganhoCapital != null ? (
          <>
            <LinhaResultado label="Ganho de capital apurado" valor={resultado.ganhoCapital} neutro />
            {resultado.isento ? (
              <div className="flex items-start gap-1.5 text-xs text-green-700 bg-green-50 rounded-lg px-2.5 py-1.5 my-1">
                <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" /> {resultado.motivoIsencao}
              </div>
            ) : (
              <LinhaResultado label="IR sobre ganho de capital" valor={-resultado.irValor} />
            )}
          </>
        ) : (
          <p className="text-xs text-slate-400 italic py-1">
            Informe o valor de aquisição para apurar o ganho de capital e o IR devido.
          </p>
        )}

        {resultado.alertaReinvestimento && (
          <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 my-1">
            <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
            Se o valor for reinvestido em outro imóvel residencial em até 180 dias, pode haver isenção do IR — confirmar com contador.
          </div>
        )}

        <div className="border-t border-slate-200 pt-2 mt-2 flex items-center justify-between">
          <span className="font-semibold text-slate-800">Valor líquido estimado</span>
          <span className="font-bold text-lg text-blue-600">{formatCurrency(resultado.valorLiquido)}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <button onClick={onClose} className="btn-secondary">Fechar</button>
        <button onClick={salvarNoImovel} disabled={salvando} className="btn-primary">
          {salvando ? <Loader2 size={16} className="animate-spin" /> : salvo ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {salvando ? 'Salvando...' : salvo ? 'Salvo!' : 'Salvar dados no imóvel'}
        </button>
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
