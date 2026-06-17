import Link from 'next/link'
import { ShieldCheck, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Política de Privacidade | Siqueira Inteligência Imobiliária',
}

export default function PrivacidadePage() {
  const updated = '15 de junho de 2026'
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 text-sm transition-colors">
            <ArrowLeft size={16} /> Voltar
          </Link>
          <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
            <ShieldCheck size={16} className="text-blue-600" />
            Siqueira Inteligência Imobiliária
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Title */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <ShieldCheck size={13} /> LGPD Compliance
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Política de Privacidade</h1>
          <p className="text-slate-500 mt-2 text-sm">Última atualização: {updated}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8 text-slate-700 text-[15px] leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">1. Sobre esta Política</h2>
            <p>
              Esta Política de Privacidade descreve como a <strong>Siqueira Inteligência Imobiliária</strong>
              coleta, utiliza, armazena, compartilha e protege os dados pessoais de seus clientes,
              visitantes e usuários da plataforma, em conformidade com a
              <strong> Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)</strong>
              e demais normas aplicáveis.
            </p>
            <p className="mt-3">
              Ao utilizar nossos serviços e/ou preencher formulários em nossa plataforma, você consente
              com o tratamento de seus dados conforme descrito neste documento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">2. Controlador dos Dados</h2>
            <div className="bg-slate-50 rounded-xl p-4 text-sm">
              <p><strong>Razão Social:</strong> Siqueira Inteligência Imobiliária</p>
              <p className="mt-1"><strong>Responsável pela proteção de dados (DPO):</strong> A ser designado</p>
              <p className="mt-1"><strong>Contato:</strong> Disponível nos canais oficiais de atendimento</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">3. Dados Coletados</h2>
            <p>Coletamos os seguintes tipos de dados pessoais:</p>

            <div className="mt-3 space-y-3">
              <div className="border border-slate-200 rounded-xl p-4">
                <h3 className="font-semibold text-slate-800 text-sm mb-2">📋 Dados de identificação</h3>
                <p className="text-sm text-slate-600">Nome completo, CPF (quando aplicável), RG, data de nascimento, e-mail, telefone/WhatsApp.</p>
              </div>
              <div className="border border-slate-200 rounded-xl p-4">
                <h3 className="font-semibold text-slate-800 text-sm mb-2">🏠 Dados imobiliários</h3>
                <p className="text-sm text-slate-600">Preferências de imóvel, faixa de orçamento, localização desejada, tipo de transação (compra, venda, locação), histórico de visitas.</p>
              </div>
              <div className="border border-slate-200 rounded-xl p-4">
                <h3 className="font-semibold text-slate-800 text-sm mb-2">💻 Dados de navegação</h3>
                <p className="text-sm text-slate-600">Endereço IP, tipo de dispositivo, navegador, páginas acessadas, duração da sessão (via cookies e tecnologias similares).</p>
              </div>
              <div className="border border-slate-200 rounded-xl p-4">
                <h3 className="font-semibold text-slate-800 text-sm mb-2">💬 Comunicações</h3>
                <p className="text-sm text-slate-600">Mensagens enviadas via formulários, WhatsApp ou e-mail, incluindo histórico de atendimento.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">4. Finalidade do Tratamento</h2>
            <p>Seus dados são tratados para as seguintes finalidades:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-slate-600">
              <li>Prestação dos serviços de intermediação imobiliária contratados;</li>
              <li>Contato comercial e envio de propostas personalizadas de imóveis;</li>
              <li>Gestão do relacionamento com clientes no CRM interno;</li>
              <li>Agendamento e acompanhamento de visitas a imóveis;</li>
              <li>Envio de comunicações informativas, desde que com consentimento;</li>
              <li>Cumprimento de obrigações legais e contratuais;</li>
              <li>Análise e melhoria de nossos serviços e plataforma;</li>
              <li>Prevenção a fraudes e garantia da segurança da informação.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">5. Base Legal para o Tratamento</h2>
            <p>O tratamento dos seus dados pessoais é realizado com base em uma ou mais das seguintes hipóteses legais previstas na LGPD:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-slate-600">
              <li><strong>Consentimento</strong> (Art. 7º, I): para envio de comunicações de marketing;</li>
              <li><strong>Execução de contrato</strong> (Art. 7º, V): para prestação dos serviços imobiliários;</li>
              <li><strong>Cumprimento de obrigação legal</strong> (Art. 7º, II): para atender exigências fiscais e regulatórias;</li>
              <li><strong>Legítimo interesse</strong> (Art. 7º, IX): para melhoria dos serviços e prevenção a fraudes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">6. Compartilhamento de Dados</h2>
            <p>Seus dados pessoais poderão ser compartilhados com:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-slate-600">
              <li><strong>Corretores parceiros</strong> credenciados no CRECI, para fins de intermediação imobiliária;</li>
              <li><strong>Prestadores de serviços tecnológicos</strong> que operam nossa infraestrutura (ex: Supabase para banco de dados), sujeitos a obrigações de confidencialidade;</li>
              <li><strong>Autoridades competentes</strong>, quando exigido por lei ou ordem judicial;</li>
              <li><strong>Cartórios e instituições financeiras</strong>, quando necessário para concretização de transações imobiliárias.</li>
            </ul>
            <p className="mt-3">
              <strong>Não vendemos</strong> seus dados pessoais a terceiros para fins publicitários.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">7. Retenção dos Dados</h2>
            <p>
              Os dados pessoais serão retidos pelo prazo necessário para cumprir as finalidades descritas nesta política,
              observados os seguintes critérios:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-slate-600">
              <li>Dados de leads não convertidos: até <strong>24 meses</strong> após o último contato;</li>
              <li>Dados de clientes com transação concluída: <strong>5 anos</strong>, em conformidade com obrigações fiscais e contratuais;</li>
              <li>Dados de navegação (cookies analíticos): até <strong>13 meses</strong>;</li>
              <li>Registros de aceitação de termos: durante toda a vigência da relação contratual.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">8. Segurança dos Dados</h2>
            <p>
              Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados pessoais contra
              acesso não autorizado, perda, destruição ou divulgação indevida, incluindo:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-slate-600">
              <li>Criptografia de dados em trânsito (TLS/HTTPS) e em repouso;</li>
              <li>Controle de acesso baseado em perfis (RBAC);</li>
              <li>Autenticação segura com tokens de sessão;</li>
              <li>Monitoramento e auditoria de acessos;</li>
              <li>Backups regulares e plano de recuperação de desastres.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">9. Seus Direitos como Titular (LGPD)</h2>
            <p>Nos termos da LGPD, você tem direito a:</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: '👁️', title: 'Acesso', desc: 'Saber quais dados seus possuímos' },
                { icon: '✏️', title: 'Correção', desc: 'Atualizar dados incompletos ou incorretos' },
                { icon: '🗑️', title: 'Eliminação', desc: 'Solicitar exclusão dos seus dados' },
                { icon: '🚫', title: 'Oposição', desc: 'Opor-se ao tratamento em certas hipóteses' },
                { icon: '📦', title: 'Portabilidade', desc: 'Receber seus dados em formato estruturado' },
                { icon: '↩️', title: 'Revogação', desc: 'Retirar o consentimento a qualquer momento' },
              ].map(r => (
                <div key={r.title} className="flex items-start gap-3 border border-slate-200 rounded-xl p-3">
                  <span className="text-xl">{r.icon}</span>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{r.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm">
              Para exercer qualquer um desses direitos, entre em contato conosco pelos canais oficiais.
              Responderemos em até <strong>15 dias úteis</strong>, conforme previsto na LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">10. Cookies</h2>
            <p>
              Utilizamos cookies essenciais (necessários para o funcionamento da plataforma) e, mediante
              consentimento, cookies analíticos para medir o desempenho do site.
              Você pode gerenciar suas preferências de cookies nas configurações do seu navegador.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">11. Alterações nesta Política</h2>
            <p>
              Esta Política de Privacidade pode ser atualizada periodicamente. Sempre que houver alterações
              relevantes, notificaremos os usuários cadastrados por e-mail ou por meio de aviso em destaque
              na plataforma. O uso continuado dos serviços após a publicação das alterações implica
              aceitação da nova versão.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">12. Contato e Canal DPO</h2>
            <p>
              Para dúvidas, solicitações ou reclamações sobre o tratamento dos seus dados pessoais,
              entre em contato com nosso canal de atendimento disponível no site.
              Você também pode contatar a <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong>{' '}
              em <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.gov.br/anpd</a>.
            </p>
          </section>

        </div>

        <div className="mt-6 text-center">
          <Link href="/termos" className="text-sm text-blue-600 hover:underline">
            Leia também nossos Termos de Uso →
          </Link>
        </div>
      </main>
    </div>
  )
}
