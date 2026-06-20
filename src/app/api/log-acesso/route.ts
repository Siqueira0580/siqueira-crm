import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { registrarAcesso, obterIpDoRequest } from '@/lib/log-acesso'

// POST — chamado pelo cliente imediatamente após um login com sucesso (e-mail/senha)
// Recebe o token da sessão recém-criada no header Authorization e grava data/hora/IP/dispositivo.
export async function POST(req: NextRequest) {
  try {
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

    const { data: profile } = await admin.from('profiles').select('nome').eq('id', user.id).single()

    await registrarAcesso({
      userId: user.id,
      email: user.email || '',
      nome: (profile as any)?.nome || user.user_metadata?.nome || null,
      ip: obterIpDoRequest(req),
      userAgent: req.headers.get('user-agent'),
      metodo: 'senha',
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[log-acesso POST] erro:', err?.message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
