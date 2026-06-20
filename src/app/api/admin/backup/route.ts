import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { verifyAdmin } from '@/lib/admin-auth'
import { TABELAS_BACKUP as TABELAS } from '@/lib/backup-tabelas'

// GET — gera e retorna um arquivo .json com todas as tabelas do sistema, para download manual.
// Não há restauração automática por aqui: o arquivo deve ser usado por alguém com acesso
// técnico ao Supabase em caso de necessidade de restaurar dados.
export async function GET(req: NextRequest) {
  const caller = await verifyAdmin(req)
  if (!caller) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const admin = createAdminClient()
  const resultado: Record<string, any> = {}
  const erros: Record<string, string> = {}

  for (const tabela of TABELAS) {
    const { data, error } = await admin.from(tabela).select('*')
    if (error) {
      erros[tabela] = error.message
    } else {
      resultado[tabela] = data
    }
  }

  const payload = {
    gerado_em: new Date().toISOString(),
    gerado_por: caller.email,
    tabelas: resultado,
    ...(Object.keys(erros).length > 0 ? { erros } : {}),
  }

  const dataHora = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `backup-siqueira-crm-${dataHora}.json`

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
