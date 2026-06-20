// Lista única de tabelas incluídas no backup/restauração do sistema.
// Sem dependências de servidor — pode ser importado tanto por rotas de API quanto por componentes de cliente.

export const TABELAS_BACKUP = [
  'profiles',
  'clientes',
  'imoveis',
  'fotos_imoveis',
  'visitas',
  'matching',
  'notificacoes',
  'landing_leads',
  'analises_comportamento',
  'banners_home',
  'logs_acesso',
  'admin_audit_log',
] as const

export type TabelaBackup = typeof TABELAS_BACKUP[number]

export const NOME_TABELA: Record<string, string> = {
  profiles: 'Usuários (perfis)',
  clientes: 'Clientes',
  imoveis: 'Imóveis',
  fotos_imoveis: 'Fotos de imóveis',
  visitas: 'Visitas',
  matching: 'Matching',
  notificacoes: 'Notificações',
  landing_leads: 'Leads do site',
  analises_comportamento: 'Análises de IA',
  banners_home: 'Imagens da home',
  logs_acesso: 'Histórico de acessos',
  admin_audit_log: 'Auditoria administrativa',
}

// Tabelas que não devem ser restauradas manualmente pelo painel (são geradas pelo próprio sistema
// e restaurá-las poderia reintroduzir registros de auditoria/acesso inconsistentes com o estado atual).
export const TABELAS_NAO_RESTAURAVEIS: TabelaBackup[] = ['logs_acesso', 'admin_audit_log']

export function isTabelaRestauravel(tabela: string): tabela is TabelaBackup {
  return (TABELAS_BACKUP as readonly string[]).includes(tabela) &&
    !TABELAS_NAO_RESTAURAVEIS.includes(tabela as TabelaBackup)
}
