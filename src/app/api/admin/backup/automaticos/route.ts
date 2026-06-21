import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { verifyAdmin } from '@/lib/admin-auth'

// GET — lista os backups gerados automaticamente (cron semanal) com link de download temporário
export async function GET(req: NextRequest) {
  const caller = await verifyAdmin(req)
  if (!caller) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const admin = createAdminClient()

  const { data: arquivos, error } = await admin.storage
    .from('backups')
    .list('automatico', { sortBy: { column: 'created_at', order: 'desc' } })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const lista = await Promise.all(
    (arquivos || [])
      .filter(f => f.name.endsWith('.json'))
      .map(async f => {
        const caminho = `automatico/${f.name}`
        const { data: signed } = await admin.storage
          .from('backups')
          .createSignedUrl(caminho, 60 * 10) // válido por 10 minutos
        return {
          nome: f.name,
          criado_em: f.created_at,
          tamanho: f.metadata?.size ?? null,
          url: signed?.signedUrl || null,
        }
      })
  )

  return NextResponse.json({ backups: lista })
}
