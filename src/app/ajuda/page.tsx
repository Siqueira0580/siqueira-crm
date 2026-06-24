'use client'
import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import PrimeiroAcessoWizard from '@/components/wizard/PrimeiroAcessoWizard'
import {
  HelpCircle, BookOpen, Calculator, Users, Building2, FileText,
  TrendingUp, Brain, Radar, ChevronDown, ChevronUp, Sparkles,
  Send, LayoutDashboard, Shield, ArrowRight, Info, AlertCircle,
  CheckCircle2, BarChart3,
} from 'lucide-react'

// ─────────────────────────────────────────
// Tipos auxiliares
// ─────────────────────────────────────────
interface SecaoProps {
  id: string
  titulo: string
  icon: React.ReactNode
  children: React.ReactNode
}

interface FaqItemProps {
  pergunta: string
  resposta: React.ReactNode
}

// ─────────────────────────────────────────
// Componentes de layout da página
// ─────────────────────────────────────────
function Secao({ titulo, icon, children }: SecaoProps) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 border-b border-slate-200">
        <span className="text-blue-600">{icon}</span>
        <h2 className="text-base font-semibold text-slate-800">{titulo}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  )
}

function FaqItem({ pergunta, resposta }: FaqItemProps) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setAberto(a => !a)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-sm font-medium text-slate-800">{pergunta}</span>
        {aberto ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
      </button>
      {aberto && (
        <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
          {resposta}
        </div>
      )}
    </div>
  )
}

function ModuloCard({ icon, titulo, descricao, passos }: { icon: React.ReactNode; titulo: string; descricao: string; passos: string[] }) {
  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-blue-600">{icon}</span>
        <h3 className="font-semibold text-slate-800 text-sm">{titulo}</h3>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{descricao}</p>
      <ul className="space-y-1.5">
        {passos.map((p, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
            <ArrowRight size={12} className="text-blue-400 mt-0.5 flex-shrink-0" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Destaque({ tipo, children }: { tipo: 'info' | 'aviso' | 'dica'; children: React.ReactNode }) {
  const estilos = {
    info:  { bg: 'bg-blue-50 border-blue-200',  icon: <Info size={14} className="text-blue-600 mt-0.5 flex-shrink-0" /> },
    aviso: { bg: 'bg-amber-50 border-amber-200', icon: <AlertCircle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" /> },
    dica:  { bg: 'bg-green-50 border-green-200', icon: <CheckCircle2 size={14} className="text-green-600 mt-0.5 flex-shrink-0" /> },
  }
  const e = estilos[tipo]
  return (
    <div className={`flex items-start gap-2 text-sm border rounded-xl px-3.5 py-3 ${e.bg}`}>
      {e.icon}
      <span className="text-slate-700 leading-relaxed">{children}</span>
    </div>
  )
}

// ─────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────
export default function AjudaPage() {
  const [showWizard, setShowWizard] = useState(false)

  return (
    <AppLayout title="Ajuda">
      {showWizard && <PrimeiroAcessoWizard onConcluir={() => setShowWizard(false)} />}

      <div className="max-w-4xl mx-auto space-y-6">

        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold mb-1">Central de Ajuda</h1>
            <p className="text-blue-100 text-sm leading-relaxed max-w-lg">
              Tudo o que você precisa para usar o Siqueira CRM com máxima eficiência — navegação, módulos e guia completo de cálculo financeiro.
            </p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors border border-white/30 flex-shrink-0"
          >
            <Sparkles size={15} /> Rever tutorial
          </button>
        </div>

        {/* ── Navegação rápida ───────────────────── */}
        <Secao id="navegacao" titulo="Navegação no sistema" icon={<LayoutDashboard size={18} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: <LayoutDashboard size={16} />, nome: 'Dashboard',    desc: 'Visão geral: clientes, imóveis, visitas e propostas do mês.' },
              { icon: <Users size={16} />,           nome: 'Clientes',     desc: 'Cadastre, edite e consulte o perfil completo de cada cliente.' },
              { icon: <Building2 size={16} />,       nome: 'Imóveis',      desc: 'Catálogo de imóveis com fotos, valores e status.' },
              { icon: <BarChart3 size={16} />,       nome: 'Visitas',      desc: 'Agendamento e histórico de visitas por imóvel/cliente.' },
              { icon: <TrendingUp size={16} />,      nome: 'Pipeline',     desc: 'Funil de negociações em Kanban — arraste entre etapas.' },
              { icon: <FileText size={16} />,        nome: 'Propostas',    desc: 'Histórico de simulações geradas, com reenvio e edição.' },
              { icon: <Brain size={16} />,           nome: 'Análise IA',   desc: 'Score comportamental e insights sobre cada cliente.' },
              { icon: <Radar size={16} />,           nome: 'Radar',        desc: 'Identifica leads quentes com base em inatividade e score.' },
              { icon: <Send size={16} />,            nome: 'Captação',     desc: 'Recursos e modelos para captação de novos imóveis.' },
              { icon: <Shield size={16} />,          nome: 'Admin',        desc: 'Usuários, permissões e configurações (apenas admin).' },
            ].map(item => (
              <div key={item.nome} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.nome}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Secao>

        {/* ── Módulos principais ─────────────────── */}
        <Secao id="modulos" titulo="Como usar os módulos principais" icon={<BookOpen size={18} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ModuloCard
              icon={<Users size={16} />}
              titulo="Clientes"
              descricao="Ponto de partida de toda negociação. Cadastre o perfil financeiro e os objetivos do cliente para receber sugestões automáticas de imóveis."
              passos={[
                'Clique em Clientes → Novo cliente',
                'Preencha nome, contato e renda',
                'Defina objetivos: morar, investir ou alugar',
                'Selecione tipo de imóvel e zona preferida',
                'Use a aba Simulador no perfil para calcular financiamentos',
              ]}
            />
            <ModuloCard
              icon={<Building2 size={16} />}
              titulo="Imóveis"
              descricao="Gerencie o catálogo com fotos, valores e características. O sistema usa esses dados para matching automático com clientes."
              passos={[
                'Clique em Imóveis → Novo imóvel',
                'Informe tipo, valor, bairro e cidade',
                'Adicione descrição e fotos',
                'Defina o status: disponível, reservado ou vendido',
                'Imóveis disponíveis aparecem no matching de clientes',
              ]}
            />
            <ModuloCard
              icon={<FileText size={16} />}
              titulo="Simulador e Propostas"
              descricao="No perfil do cliente, simule a compra de qualquer imóvel e gere uma proposta em PDF para enviar."
              passos={[
                'Abra o perfil do cliente → aba Simulador',
                'Selecione o imóvel e ajuste os parâmetros',
                'Clique em Calcular para ver o resultado',
                'Salve a proposta → PDF gerado automaticamente',
                'Envie por WhatsApp ou e-mail direto do sistema',
              ]}
            />
            <ModuloCard
              icon={<TrendingUp size={16} />}
              titulo="Pipeline"
              descricao="Visualize todas as negociações ativas em um funil Kanban com 7 etapas, do primeiro contato ao fechamento."
              passos={[
                'Lead Novo → Contato Iniciado → Visita Agendada',
                'Proposta Enviada → Negociação → Fechado / Perdido',
                'Arraste cards entre colunas para atualizar etapa',
                'Clique em um card para ver o histórico completo',
                'Leads em "Perdido" podem ser reativados',
              ]}
            />
          </div>
        </Secao>

        {/* ── Guia de cálculo ────────────────────── */}
        <Secao id="calculo" titulo="Guia de cálculo financeiro" icon={<Calculator size={18} />}>
          <div className="space-y-5">

            <Destaque tipo="info">
              Os cálculos são estimativas para apoiar a negociação e não substituem a simulação oficial do banco ou cartório antes do fechamento.
            </Destaque>

            {/* Sistemas de amortização */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Sistemas de amortização</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">S</span>
                    <p className="font-semibold text-sm text-slate-800">SAC — Sistema de Amortização Constante</p>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    A amortização do principal é constante em todos os meses. Os juros diminuem com o tempo porque o saldo devedor cai a cada parcela. Resultado: <strong>parcelas decrescentes</strong> — a primeira é a mais cara.
                  </p>
                  <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600 font-mono">
                    Amortização = Saldo ÷ Prazo<br />
                    Juros = Saldo × Taxa mensal<br />
                    Parcela = Amortização + Juros
                  </div>
                  <Destaque tipo="dica">Recomendado para quem tem renda para suportar a parcela inicial maior e quer pagar menos no total.</Destaque>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">P</span>
                    <p className="font-semibold text-sm text-slate-800">PRICE — Sistema Francês</p>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    A parcela é fixa durante todo o financiamento. Nos primeiros meses, a maior parte da parcela são juros; no fim do prazo, a maior parte é amortização. Resultado: <strong>parcela constante</strong>.
                  </p>
                  <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600 font-mono">
                    i = taxa mensal<br />
                    Parcela = PV × i ÷ (1 − (1+i)^−n)<br />
                    PV = valor financiado
                  </div>
                  <Destaque tipo="dica">Recomendado para quem precisa de previsibilidade no orçamento mensal.</Destaque>
                </div>
              </div>
            </div>

            {/* ITBI */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">ITBI — Imposto de Transmissão de Bens Imóveis</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <p className="leading-relaxed">
                  O ITBI é um imposto municipal cobrado na transferência do imóvel. A alíquota varia de 2% a 4% dependendo do município. O simulador usa <strong>3% como padrão</strong>, mas você pode ajustar.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  {[
                    { titulo: 'SFH / PAR / HIS', desc: 'Sistema Financeiro da Habitação, Programa de Arrendamento Residencial ou Habitação de Interesse Social. A parcela financiada fica isenta de ITBI; incide apenas sobre a entrada (valor acima do financiado).', badge: 'Isenção parcial', cor: 'bg-green-100 text-green-700' },
                    { titulo: 'Compra convencional', desc: 'ITBI calculado sobre o valor total do imóvel (ou valor venal, o que for maior, a critério do município).', badge: 'ITBI integral', cor: 'bg-blue-100 text-blue-700' },
                    { titulo: 'Alíquota padrão usada', desc: 'O simulador usa 3% sobre o valor do imóvel, que é a alíquota mais comum nas capitais brasileiras.', badge: '3%', cor: 'bg-slate-100 text-slate-700' },
                  ].map(c => (
                    <div key={c.titulo} className="border border-slate-200 rounded-xl p-3 space-y-1.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.cor}`}>{c.badge}</span>
                      <p className="text-xs font-semibold text-slate-800">{c.titulo}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{c.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cartório */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Cartório e Registro</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                Os custos de cartório e registro variam por estado e valor do imóvel (tabela de emolumentos). O simulador usa <strong>1,5% como padrão</strong>, ajustável. Incluem:
              </p>
              <ul className="space-y-1.5">
                {[
                  'Escritura pública de compra e venda (ou instrumento particular para financiamentos bancários)',
                  'Registro do imóvel no Cartório de Registro de Imóveis',
                  'Averbação do financiamento (quando houver)',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <CheckCircle2 size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Comprometimento de renda */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Comprometimento de renda</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                O Banco Central limita o comprometimento da renda bruta familiar em financiamentos do SFH a <strong>30%</strong>. O simulador exibe um alerta (ícone laranja) quando a parcela inicial ultrapassa esse limite em relação à renda cadastrada no perfil do cliente. Valores acima de 30% não impedem a simulação, mas sinalizam risco de reprovação pelo banco.
              </p>
            </div>

            {/* Resumo fórmulas */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Resumo dos custos calculados</p>
              <div className="space-y-1.5 text-xs text-slate-700 font-mono">
                <p>Valor financiado = Valor imóvel − Entrada</p>
                <p>ITBI = Valor imóvel × Alíquota ITBI (ex.: 3%)</p>
                <p>Cartório = Valor imóvel × % cartório (ex.: 1,5%)</p>
                <p>Custo total fechamento = Entrada + ITBI + Cartório</p>
                <p>Parcela SAC inicial = (Financiado ÷ Prazo) + (Financiado × Taxa mensal)</p>
                <p>Parcela PRICE = Financiado × i ÷ (1 − (1+i)^−n)</p>
              </div>
            </div>
          </div>
        </Secao>

        {/* ── FAQ ───────────────────────────────────── */}
        <Secao id="faq" titulo="Perguntas frequentes" icon={<HelpCircle size={18} />}>
          <div className="space-y-2">
            <FaqItem
              pergunta="Como faço para gerar uma proposta em PDF?"
              resposta={
                <p>Abra o perfil do cliente → aba <strong>Simulador</strong> → selecione o imóvel e ajuste os parâmetros → clique em <strong>Calcular</strong> → depois em <strong>Salvar proposta</strong>. O PDF é gerado no seu navegador e você pode baixar ou enviar por WhatsApp/e-mail diretamente.</p>
              }
            />
            <FaqItem
              pergunta="O wizard de boas-vindas voltou a aparecer — como isso acontece?"
              resposta={
                <p>O wizard só aparece se a opção "Não mostrar mais" ainda não foi salva. Se você está em um dispositivo novo ou a preferência não foi gravada, ele pode reaparecer. Clique em <strong>Não mostrar mais</strong> ou conclua o tutorial para que o sistema salve sua preferência.</p>
              }
            />
            <FaqItem
              pergunta="Qual a diferença entre SAC e PRICE na prática?"
              resposta={
                <div className="space-y-2">
                  <p><strong>SAC:</strong> parcela maior no começo, menor no fim. Você paga menos juros no total.</p>
                  <p><strong>PRICE:</strong> parcela fixa do início ao fim. Facilita o planejamento mensal, mas o custo total de juros é maior.</p>
                  <p>Para imóveis de maior valor, o SAC costuma ser preferido por bancos, pois a dívida cai mais rápido.</p>
                </div>
              }
            />
            <FaqItem
              pergunta="O ITBI sempre é pago pelo comprador?"
              resposta={
                <p>Sim, por lei o ITBI é de responsabilidade do comprador, salvo acordo em contrário registrado em contrato. A alíquota e a base de cálculo variam por município — verifique sempre com a prefeitura local antes de fechar negócio.</p>
              }
            />
            <FaqItem
              pergunta="Como funciona o matching automático de clientes e imóveis?"
              resposta={
                <p>No perfil do cliente → aba <strong>Matching</strong>, o sistema pontua cada imóvel disponível com base em: tipo de imóvel, orçamento (renda × 30% × prazo), número de quartos, zona preferida e comodidades. O imóvel com maior pontuação é o mais compatível com o perfil.</p>
              }
            />
            <FaqItem
              pergunta="Posso editar uma proposta depois de salvar?"
              resposta={
                <p>Sim. Na página <strong>Propostas</strong>, clique no ícone de lápis em qualquer proposta. Você pode alterar entrada, prazo, taxa de juros, sistema e adicionar observações. O PDF anterior é invalidado automaticamente ao salvar — gere um novo PDF após a edição.</p>
              }
            />
            <FaqItem
              pergunta="O sistema acessa a renda cadastrada do cliente para calcular o comprometimento?"
              resposta={
                <p>Sim. Se o cliente tem <strong>renda familiar</strong> cadastrada no perfil, o simulador calcula o percentual que a parcela representa e exibe um alerta quando ultrapassa 30%, que é o limite do Banco Central para financiamentos SFH.</p>
              }
            />
            <FaqItem
              pergunta="Como bloquear o acesso de um corretor?"
              resposta={
                <p>Acesse <strong>Admin → Usuários</strong> → localize o corretor → clique em <strong>Bloquear</strong>. O acesso é suspenso imediatamente em todos os dispositivos. Para reativar, clique em Desbloquear.</p>
              }
            />
          </div>
        </Secao>

        {/* Rodapé */}
        <div className="text-center text-xs text-slate-400 pb-4">
          Siqueira Inteligência Imobiliária — sistema de gestão interno.
        </div>
      </div>
    </AppLayout>
  )
}
