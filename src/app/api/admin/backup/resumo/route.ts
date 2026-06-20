import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { verifyAdmin } from '@/lib/admin-auth'
import { TABELAS_BACKUP as TABELAS } from '@/lib/backup-tabelas'

// GET — retorna a contagem de registros de cada tabela, para exibir um resumo do banco
// antes de baixar o backup completo (sem trafegar os dados em si).
export async function GET(req: NextRequest) {
  const caller = await verifyAdmin(req)
  if (!caller) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const admin = createAdminClient()
  const contagens: Record<string, number | null> = {}

  await Promise.all(TABELAS.map(async (tabela) => {
    const { count, error } = await admin.from(tabela).select('*', { count: 'exact', head: true })
    contagens[tabela] = error ? null : (count ?? 0)
  }))

  return NextResponse.json({ contagens })
}
