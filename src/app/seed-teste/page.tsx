'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function SeedTeste() {
  const [status, setStatus] = useState('Aguardando...')
  const [done, setDone] = useState(false)
  const [id, setId] = useState('')

  useEffect(() => {
    async function run() {
      setStatus('Verificando sessão...')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('❌ Não autenticado. Faça login no CRM primeiro.'); return }

      setStatus('Removendo teste anterior...')
      await supabase.from('clientes').delete().like('nome', '%TESTE%')

      setStatus('Criando perfil de teste...')
      const { data, error } = await supabase.from('clientes').insert({
        user_id: user.id,
        nome: '⚠️ TESTE — Carlos Eduardo Mendonça',
        telefone: '(11) 98765-4321',
        email: 'carlos.teste@siqueira-crm.dev',
        faixa_renda: 18000,
        etapa_funil: 'visita_agendada',
        notas: 'PERFIL DE TESTE para validar análise de IA. Urgência: contrato de aluguel vence em junho/2025. Renda subiu para R$ 21.500 após promoção em março.',
        cpf: '123.456.789-00',
        rg: '12.345.678-9',
        genero: 'Masculino',
        endereco_tipo: 'residencial_atual',
        cep: '04543-907',
        logradouro: 'Av. Brigadeiro Faria Lima',
        numero: '3900',
        complemento: 'Apto 142 Torre A',
        bairro: 'Itaim Bibi',
        cidade: 'São Paulo',
        estado: 'SP',
        moradia_atual_tipo: 'alugado',
        moradia_atual_valor: 4200,
        moradia_quartos: 2,
        moradia_suites: 1,
        moradia_banheiros: 2,
        moradia_salas: 1,
        moradia_cozinhas: 1,
        moradia_varandas: 1,
        moradia_vagas_garagem: 1,
        moradia_quintal: false,
        moradia_area_servico: true,
        moradia_home_office: true,
        moradia_piscina: false,
        moradia_area_gourmet: false,
        moradia_observacao: 'Apto em condomínio fechado, portaria 24h. Barulho de vizinhos frequente. Filho de 8 anos precisa de espaço.',
        possui_outros_imoveis: false,
        estado_civil: 'casado',
        data_nascimento: '1985-03-15',
        cidade_nascimento: 'Ribeirão Preto',
        estado_nascimento: 'SP',
        filhos_quantidade: 2,
        filhos_detalhes: [
          { genero: 'menino', nome: 'Pedro', idade: 8 },
          { genero: 'menina', nome: 'Ana', idade: 5 },
        ],
        conjuge_nome: 'Fernanda Mendonça',
        conjuge_profissao: 'Psicóloga',
        conjuge_renda: 8500,
        tipo_imovel: 'casa',
        objetivo: 'morar',
        zona_interesse: 'Sul',
        orcamento_min: 850000,
        orcamento_max: 1200000,
        quartos_desejados: 3,
        necessidades: ['Quintal', 'Área gourmet', 'Piscina', 'Próximo a escola', 'Condomínio fechado'],
        historico: [
          { data: '2024-11-10', tipo: 'ligacao', descricao: 'Primeiro contato via indicação do Dr. Marcos Silva. Forte interesse em casas no Morumbi/Vila Nova Conceição. Quer sair do aluguel em até 6 meses. Filho mais velho precisa de quintal.' },
          { data: '2024-12-05', tipo: 'visita', descricao: 'Visitou 3 casas no Brooklin com a esposa Fernanda. Aprovaram planta da casa 2 (3 suítes), mas quintal pequeno. Fernanda precisa de cômodo tranquilo para atender pacientes em casa.' },
          { data: '2025-01-18', tipo: 'nota', descricao: 'Contrato de aluguel vence em junho/2025. Pressão para decidir aumentando. Promoção pendente pode elevar renda para R$ 22.000.' },
          { data: '2025-02-20', tipo: 'email', descricao: 'Perguntou sobre financiamento. Quer dar 30% de entrada: carro (R$ 85k) + FGTS (R$ 42k) + reserva. Preferência por Jardim Marajoara e Jardim Panorama.' },
          { data: '2025-03-08', tipo: 'ligacao', descricao: 'Recebeu promoção. Renda atual: R$ 21.500. Quer área gourmet coberta — Fernanda recebe família aos domingos. Meta: fechar até maio/2025.' },
        ],
      }).select().single()

      if (error) { setStatus('❌ Erro: ' + error.message); return }

      setId(data.id)
      setDone(true)
      setStatus('✅ Perfil de teste criado com sucesso!')
    }
    run()
  }, [])

  return (
    <div style={{ fontFamily: 'monospace', padding: 40, maxWidth: 600 }}>
      <h2>Seed — Perfil de Teste</h2>
      <p>{status}</p>
      {done && (
        <>
          <p><strong>ID:</strong> {id}</p>
          <p><strong>Nome:</strong> ⚠️ TESTE — Carlos Eduardo Mendonça</p>
          <br />
          <a href="/clientes" style={{ background: '#4f46e5', color: 'white', padding: '10px 20px', borderRadius: 8, textDecoration: 'none' }}>
            → Ver lista de clientes
          </a>
        </>
      )}
    </div>
  )
}
