// Cron job: gera backup completo e salva na pasta do Google Drive.
// Agendado toda segunda-feira às 03h30 UTC via vercel.json.
// Também pode ser disparado manualmente via POST autenticado pela aba Sistema.

import { NextRequest, NextResponse } from 'next/server'
import { uploadBackupToDrive } from '@/lib/google-drive'
import { verifyAdmin } from '@/lib/admin-auth'

// GET — chamado automaticamente pelo Vercel Cron (com header Authorization: Bearer CRON_SECRET)
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const result = await uploadBackupToDrive()
    console.log('[cron] Backup Drive enviado:', result.fileName)
    return NextResponse.json({ ok: true, ...result })
  } catch (err: any) {
    console.error('[cron] Erro no backup Drive:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — disparado manualmente pelo admin na aba Sistema
export async function POST(req: NextRequest) {
  const caller = await verifyAdmin(req)
  if (!caller) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const result = await uploadBackupToDrive()
    return NextResponse.json({ ok: true, ...result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
