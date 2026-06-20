import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { verifyAdmin } from '@/lib/admin-auth'

// GET — lista o histórico de acessos (login), com filtros opcionais por usuário e período
// Query params: user_id, desde (ISO date), limit (default 200, máx 1000)
export async function GET(req: NextRequest) {
  const caller = await verifyAdmin(req)
  if (!caller) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  const desde = searchParams.get('desde')
  const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10) || 200, 1000)

  const admin = createAdminClient()

  let query = admin
    .from('logs_acesso')
    .select('id, user_id, email, nome, ip, user_agent, metodo, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (userId) query = query.eq('user_id', userId)
  if (desde) query = query.gte('created_at', desde)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ logs: data || [] })
}
