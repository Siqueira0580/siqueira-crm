import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { verifyAdmin } from '@/lib/admin-auth'
import { registrarAuditoria } from '@/lib/audit-log'
import { isTabelaRestauravel } from '@/lib/backup-tabelas'

const LIMITE_REGISTROS = 5000

// POST — restaura uma única tabela a partir de um backup gerado por /api/admin/backup.
// Comportamento: MESCLA por ID (upsert). Nunca apaga registros que existam hoje e não
// estejam no backup — só atualiza os que já existem e insere os que faltam.
// Isso evita que uma restauração acidental destrua dados criados depois do backup.
export async function POST(req: NextRequest) {
  const caller = await verifyAdmin(req)
  if (!caller) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const tabela = body?.tabela
  const dados = body?.dados

  if (!tabela || typeof tabela !== 'string') {
    return NextResponse.json({ error: 'Tabela é obrigatória' }, { status: 400 })
  }
  if (!isTabelaRestauravel(tabela)) {
    return NextResponse.json({ error: `A tabela "${tabela}" não pode ser restaurada por aqui.` }, { status: 400 })
  }
  if (!Array.isArray(dados) || dados.length === 0) {
    return NextResponse.json({ error: 'Nenhum registro para restaurar.' }, { status: 400 })
  }
  if (dados.length > LIMITE_REGISTROS) {
    return NextResponse.json({ error: `Muitos registros de uma vez (máx. ${LIMITE_REGISTROS}).` }, { status: 400 })
  }
  if (dados.some((d: any) => !d || typeof d !== 'object' || !d.id)) {
    return NextResponse.json({ error: 'Todos os registros do backup precisam ter um "id".' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error } = await admin.from(tabela).upsert(dados, { onConflict: 'id' })
  if (error) {
    return NextResponse.json({
      error: `Falha ao restaurar "${tabela}": ${error.message}. Nada foi alterado nas outras tabelas.`,
    }, { status: 500 })
  }

  await registrarAuditoria(admin, caller, 'restaurar_tabela', undefined, { tabela, registros: dados.length })

  return NextResponse.json({ success: true, registros: dados.length })
}
