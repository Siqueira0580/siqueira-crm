import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// PATCH — marca onboarding_completo = true para o usuário autenticado
export async function PATCH(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const token = auth.slice(7)
  const admin = createAdminClient()

  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { error: updErr } = await admin
    .from('profiles')
    .update({ onboarding_completo: true })
    .eq('id', user.id)

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
