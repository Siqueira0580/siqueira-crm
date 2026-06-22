export type UserRole = 'corretor' | 'admin'
export type TipoImovel = 'casa' | 'apartamento' | 'comercial' | 'qualquer'
export type Objetivo = 'morar' | 'investir' | 'alugar'
export type Zona = 'Norte' | 'Sul' | 'Leste' | 'Oeste' | 'Centro'
export type StatusImovel = 'disponivel' | 'vendido' | 'reservado'
export type StatusVisita = 'agendado' | 'realizado' | 'cancelado'
export type EtapaFunil =
  | 'lead_novo' | 'contato_iniciado' | 'visita_agendada'
  | 'proposta_enviada' | 'negociacao' | 'fechado' | 'perdido'
export type ClasseEconomica = 'baixa' | 'media' | 'alta'
export type PerfilComprador = 'investidor' | 'primeira_compra' | 'upgrade' | 'locacao_futura'

export interface Profile {
  id: string
  nome: string
  email: string
  role: UserRole
  avatar_url?: string
  telefone?: string
  created_at: string
}

export interface HistoricoItem {
  data: string
  tipo: 'nota' | 'ligacao' | 'email' | 'visita' | 'proposta' | 'sistema'
  descricao: string
}

export type EstadoCivil = 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'uniao_estavel' | 'outro'
export type MoradiaAtualTipo = 'alugado' | 'proprio' | 'financiado' | 'familiar' | 'outro'
export type FilhoGenero = 'menino' | 'menina' | 'outro'

export interface FilhoDetalhe {
  nome?: string
  genero: FilhoGenero
  idade?: number
}

export interface Cliente {
  id: string
  user_id: string
  nome: string
  telefone?: string
  email?: string
  faixa_renda?: number
  tipo_imovel?: TipoImovel
  objetivo?: Objetivo
  zona_interesse?: Zona
  cidade?: string
  orcamento_min?: number
  orcamento_max?: number
  quartos_desejados?: number
  necessidades?: string[]
  classe_economica?: ClasseEconomica
  perfil_comprador?: PerfilComprador
  score_potencial?: number
  etapa_funil: EtapaFunil
  notas?: string
  historico?: HistoricoItem[]
  // Endereço
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  estado?: string
  // Documentos
  cpf?: string
  rg?: string
  genero?: string
  // Dados pessoais
  estado_civil?: EstadoCivil
  data_nascimento?: string
  cidade_nascimento?: string
  estado_nascimento?: string
  filhos_quantidade?: number
  filhos_detalhes?: FilhoDetalhe[]
  conjuge_nome?: string
  conjuge_profissao?: string
  conjuge_renda?: number
  // Endereço (unificado)
  endereco_tipo?: 'residencial_atual' | 'veraneio' | 'outro'
  moradia_atual_tipo?: MoradiaAtualTipo
  moradia_atual_valor?: number
  moradia_quartos?: number
  moradia_suites?: number
  moradia_banheiros?: number
  moradia_salas?: number
  moradia_cozinhas?: number
  moradia_varandas?: number
  moradia_vagas_garagem?: number
  moradia_quintal?: boolean
  moradia_area_servico?: boolean
  moradia_home_office?: boolean
  moradia_piscina?: boolean
  moradia_area_gourmet?: boolean
  moradia_observacao?: string
  possui_outros_imoveis?: boolean
  created_at: string
  updated_at: string
}

export interface Imovel {
  id: string
  user_id: string
  titulo: string
  descricao?: string
  tipo?: TipoImovel
  valor: number
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  zona?: Zona
  quartos?: number
  banheiros?: number
  vagas?: number
  area_m2?: number
  comodidades?: string[]
  status: StatusImovel
  fotos?: FotoImovel[]
  created_at: string
  updated_at: string
  // Campos usados pela calculadora de venda (valor líquido ao vendedor)
  valor_aquisicao?: number | null
  data_aquisicao?: string | null
  saldo_devedor_financiamento?: number | null
  comissao_percentual?: number | null
  imovel_unico_proprietario?: boolean | null
  isencao_usada_ultimos_5_anos?: boolean | null
}

export interface FotoImovel {
  id: string
  imovel_id: string
  url: string
  storage_path?: string
  descricao?: string
  ordem: number
  created_at: string
}

export interface Visita {
  id: string
  cliente_id: string
  imovel_id: string
  user_id: string
  data_hora: string
  status: StatusVisita
  observacoes?: string
  notas?: string
  cliente?: Cliente
  imovel?: Imovel
  created_at: string
  updated_at: string
}

export interface Matching {
  id: string
  cliente_id: string
  imovel_id: string
  score: number
  detalhes?: {
    tipo: number
    orcamento: number
    quartos: number
    zona: number
    comodidades: number
  }
  imovel?: Imovel
  created_at: string
}

export interface Notificacao {
  id: string
  user_id: string
  titulo: string
  mensagem?: string
  tipo?: string
  lida: boolean
  referencia_id?: string
  referencia_tipo?: string
  created_at: string
}

export type TipoProposta = 'compra' | 'venda'

export interface Proposta {
  id: string
  user_id: string
  cliente_id: string
  imovel_id?: string | null
  tipo: TipoProposta
  dados_simulacao: any
  valor_imovel?: number | null
  valor_entrada?: number | null
  valor_financiado?: number | null
  parcela_inicial?: number | null
  pdf_url?: string | null
  enviado_whatsapp_em?: string | null
  enviado_email_em?: string | null
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  totalLeads: number
  clientesAtivos: number
  imoveisDisponiveis: number
  visitasAgendadas: number
  taxaConversao: number
  leadsPorEtapa: Record<EtapaFunil, number>
  recentClientes: any[]
}
