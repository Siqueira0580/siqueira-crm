import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { registrarAcesso, obterIpDoRequest } from '@/lib/log-acesso'

// POST — chamado pelo cliente quando um login com e-mail/senha falha.
// Não exige sessão (o usuário, por definição, não conseguiu autenticar).
// Só registra um e-mail que de fato pertence a uma conta cadastrada, para não
// virar uma forma fácil de poluir a tabela com e-mails aleatórios.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email || email.length > 200) {
      return NextResponse.json({ success: true }) // resposta neutra, sem detalhes
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('id, nome, email')
      .ilike('email', email)
      .maybeSingle()

    if (!profile) {
      // E-mail não corresponde a nenhuma conta — não registra (evita lixo/abuso na tabela)
      return NextResponse.json({ success: true })
    }

    await registrarAcesso({
      userId: (profile as any).id,
      email: (profile as any).email || email,
      nome: (profile as any).nome || null,
      ip: obterIpDoRequest(req),
      userAgent: req.headers.get('user-agent'),
      metodo: 'senha',
      sucesso: false,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[log-acesso-falha POST] erro:', err?.message)
    return NextResponse.json({ success: true })
  }
}
