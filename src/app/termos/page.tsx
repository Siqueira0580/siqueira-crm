import Link from 'next/link'
import { Scale, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Termos de Uso | Siqueira Inteligência Imobiliária',
}

export default function TermosPage() {
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
            <Scale size={16} className="text-blue-600" />
            Siqueira Inteligência Imobiliária
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Title */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Scale size={13} /> Documento Legal
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Termos de Uso</h1>
          <p className="text-slate-500 mt-2 text-sm">Última atualização: {updated}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8 text-slate-700 text-[15px] leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e utilizar os serviços oferecidos pela <strong>Siqueira Inteligência Imobiliária</strong>
              — incluindo seu site, formulários de contato e sistema de gestão — você declara ter lido,
              compreendido e concordado com os presentes Termos de Uso. Caso não concorde com qualquer
              disposição aqui contida, pedimos que não utilize nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">2. Descrição dos Serviços</h2>
            <p>
              A Siqueira Inteligência Imobiliária oferece serviços de intermediação imobiliária, incluindo
              consultoria para compra, venda, locação e avaliação de imóveis residenciais e comerciais.
              A plataforma digital disponibiliza um sistema de gestão de relacionamento com clientes (CRM),
              formulários de captação de leads e canais de comunicação entre corretores e potenciais clientes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">3. Uso Permitido</h2>
            <p>Os usuários se comprometem a utilizar os serviços exclusivamente para fins lícitos e de acordo com:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-slate-600">
              <li>A legislação brasileira vigente, incluindo o Código Civil e o Código de Defesa do Consumidor;</li>
              <li>As normas do CRECI (Conselho Regional de Corretores de Imóveis);</li>
              <li>A Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018);</li>
              <li>As boas práticas do mercado imobiliário.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">4. Obrigações do Usuário</h2>
            <p>Ao utilizar nossos serviços, o usuário se compromete a:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-slate-600">
              <li>Fornecer informações verdadeiras, completas e atualizadas no cadastro e nos formulários;</li>
              <li>Não utilizar dados de terceiros sem autorização;</li>
              <li>Não realizar ações que possam comprometer a segurança da plataforma ou de outros usuários;</li>
              <li>Manter a confidencialidade de suas credenciais de acesso (login e senha);</li>
              <li>Comunicar imediatamente qualquer uso não autorizado de sua conta.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">5. Responsabilidades e Limitações</h2>
            <p>
              A Siqueira Inteligência Imobiliária não se responsabiliza por:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-slate-600">
              <li>Decisões de negócio tomadas com base em informações da plataforma;</li>
              <li>Indisponibilidade temporária do sistema por manutenção ou força maior;</li>
              <li>Ações de terceiros que acessem indevidamente a conta do usuário por negligência do mesmo;</li>
              <li>Variações de mercado imobiliário ou valorização/desvalorização de imóveis.</li>
            </ul>
            <p className="mt-3">
              Toda a intermediação imobiliária é realizada em conformidade com as normas do CRECI e as
              responsabilidades são delimitadas pelo contrato de prestação de serviços firmado entre as partes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">6. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo disponibilizado na plataforma — incluindo textos, imagens, logotipos, software,
              banco de dados e layout — é de propriedade exclusiva da Siqueira Inteligência Imobiliária ou
              de seus licenciantes, sendo protegido pelas leis de propriedade intelectual vigentes.
              É vedada a reprodução, distribuição ou modificação sem autorização expressa e por escrito.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">7. Cookies e Tecnologias de Rastreamento</h2>
            <p>
              Utilizamos cookies e tecnologias similares para garantir o funcionamento da plataforma,
              personalizar a experiência do usuário e coletar métricas de uso. Ao continuar navegando,
              você concorda com o uso dessas tecnologias, conforme detalhado em nossa{' '}
              <Link href="/privacidade" className="text-blue-600 hover:underline">Política de Privacidade</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">8. Modificações dos Termos</h2>
            <p>
              Reservamo-nos o direito de alterar estes Termos de Uso a qualquer momento. As alterações
              entrarão em vigor assim que publicadas na plataforma. O uso continuado após a publicação
              das alterações implica na aceitação dos novos termos. Recomendamos revisar este documento
              periodicamente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">9. Rescisão</h2>
            <p>
              Poderemos suspender ou encerrar o acesso de qualquer usuário que viole estes Termos de Uso,
              sem aviso prévio e sem prejuízo de eventuais medidas legais cabíveis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">10. Legislação Aplicável e Foro</h2>
            <p>
              Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil.
              Para dirimir quaisquer controvérsias decorrentes deste documento, fica eleito o foro da
              comarca onde está registrada a Siqueira Inteligência Imobiliária, com exclusão de qualquer outro.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">11. Contato</h2>
            <p>
              Em caso de dúvidas sobre estes Termos de Uso, entre em contato conosco pelo e-mail
              disponibilizado em nosso site ou pelos canais de atendimento da empresa.
            </p>
          </section>

        </div>

        <div className="mt-6 text-center">
          <Link href="/privacidade" className="text-sm text-blue-600 hover:underline">
            Leia também nossa Política de Privacidade →
          </Link>
        </div>
      </main>
    </div>
  )
}
