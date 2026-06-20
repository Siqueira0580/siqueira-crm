import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { verifyAdmin } from '@/lib/admin-auth'

// GET — lista o histórico de ações administrativas (auditoria)
export async function GET(req: NextRequest) {
  const caller = await verifyAdmin(req)
  if (!caller) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 500)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('admin_audit_log')
    .select('id, admin_email, acao, alvo_user_id, alvo_email, detalhes, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ logs: data || [] })
}
