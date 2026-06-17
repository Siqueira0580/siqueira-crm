import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://apgiisgbvualsvujfpdd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwZ2lpc2didnVhbHN2dWpmcGRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUxNTkwOCwiZXhwIjoyMDk3MDkxOTA4fQ.Sc8UHbifKLG7sVOcBtNpZpds-sO0AJuXiNqNcPUcZFA',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Busca primeiro usuário
const { data: profiles, error: pErr } = await supabase
  .from('profiles')
  .select('id')
  .limit(1)

if (pErr || !profiles?.length) {
  console.error('Erro ao buscar perfil:', pErr)
  process.exit(1)
}

const userId = profiles[0].id
console.log('user_id encontrado:', userId)

// Remove teste anterior se existir
await supabase
  .from('clientes')
  .delete()
  .like('nome', '%TESTE%')

// Insere cliente de teste
const { data, error } = await supabase.from('clientes').insert({
  user_id: userId,
  nome: '⚠️ TESTE — Carlos Eduardo Mendonça',
  telefone: '(11) 98765-4321',
  email: 'carlos.teste@siqueira-crm.dev',
  faixa_renda: 18000,
  etapa_funil: 'visita_agendada',
  notas: 'PERFIL DE TESTE criado automaticamente para validar análise de IA. Todos os campos preenchidos. Urgência real: contrato de aluguel vence em junho/2025.',
  cpf: '123.456.789-00',
  rg: '12.345.678-9',
  genero: 'Masculino',
  // Endereço
  endereco_tipo: 'residencial_atual',
  cep: '04543-907',
  logradouro: 'Av. Brigadeiro Faria Lima',
  numero: '3900',
  complemento: 'Apto 142 Torre A',
  bairro: 'Itaim Bibi',
  cidade: 'São Paulo',
  estado: 'SP',
  // Moradia atual
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
  moradia_observacao: 'Apartamento em condomínio fechado com portaria 24h. Barulho de vizinhos é frequente. Filho mais velho precisa de espaço para brincar.',
  possui_outros_imoveis: false,
  // Pessoal
  estado_civil: 'casado',
  data_nascimento: '1985-03-15',
  cidade_nascimento: 'Ribeirão Preto',
  estado_nascimento: 'SP',
  filhos_quantidade: 2,
  filhos_detalhes: [
    { genero: 'menino', nome: 'Pedro', idade: 8 },
    { genero: 'menina', nome: 'Ana', idade: 5 }
  ],
  conjuge_nome: 'Fernanda Mendonça',
  conjuge_profissao: 'Psicóloga',
  conjuge_renda: 8500,
  // Preferências
  tipo_imovel: 'casa',
  objetivo: 'morar',
  zona_interesse: 'Sul',
  orcamento_min: 850000,
  orcamento_max: 1200000,
  quartos_desejados: 3,
  necessidades: ['Quintal', 'Área gourmet', 'Piscina', 'Próximo a escola', 'Condomínio fechado'],
  // Histórico
  historico: [
    {
      data: '2024-11-10',
      tipo: 'ligacao',
      descricao: 'Primeiro contato via indicação. Demonstrou forte interesse em casas no Morumbi/Vila Nova Conceição. Urgência: quer sair do aluguel em até 6 meses. Mencionou que o filho mais velho está crescendo e precisa de quintal.'
    },
    {
      data: '2024-12-05',
      tipo: 'visita',
      descricao: 'Visitou 3 casas no Brooklin junto com a esposa Fernanda. Aprovaram a planta da casa 2 (3 suítes), mas acharam o quintal pequeno para as crianças brincarem. A Fernanda comentou que precisaria de espaço para atendimento domiciliar de pacientes.'
    },
    {
      data: '2025-01-18',
      tipo: 'nota',
      descricao: 'Contrato de aluguel atual vence em junho/2025. Pressão para decidir está aumentando. Carlos mencionou que está em processo de promoção no trabalho — renda pode subir para R$ 22.000 até março.'
    },
    {
      data: '2025-02-20',
      tipo: 'email',
      descricao: 'Enviou e-mail perguntando sobre financiamento. Quer entender se consegue dar 30% de entrada com venda de um carro (R$ 85.000), FGTS (R$ 42.000) e reserva financeira. Demonstrou preferência por condomínios no Jardim Marajoara.'
    },
    {
      data: '2025-03-08',
      tipo: 'ligacao',
      descricao: 'Ligou animado: recebeu a promoção. Renda subiu para R$ 21.500. Perguntou sobre casas com área gourmet coberta — a esposa quer receber a família aos domingos. Confirmou interesse em fechar até maio.'
    }
  ]
}).select().single()

if (error) {
  console.error('Erro ao inserir:', error)
  process.exit(1)
}

console.log('✅ Cliente de teste criado com sucesso!')
console.log('ID:', data.id)
console.log('Nome:', data.nome)
