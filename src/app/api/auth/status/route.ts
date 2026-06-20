import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// GET — verifica se o usuário autenticado (pelo token enviado) está bloqueado.
// Usado pelo AppLayout em toda navegação para encerrar a sessão de usuários bloqueados
// mesmo que o access token ainda não tenha expirado.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Token ausente' }, { status: 401 })
  }
  const token = auth.slice(7)

  const admin = createAdminClient()
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  const bannedUntil = (user as any).banned_until ? new Date((user as any).banned_until) : null
  const bloqueado = !!bannedUntil && bannedUntil.getTime() > Date.now()

  return NextResponse.json({ bloqueado })
}
