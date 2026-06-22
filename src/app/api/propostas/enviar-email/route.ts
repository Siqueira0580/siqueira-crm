import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { enviarEmailProposta } from '@/lib/email-proposta'

// POST — envia o PDF de uma proposta (já salva em `propostas`) por e-mail ao cliente.
// O PDF é gerado no navegador (jsPDF) e chega aqui em base64; esta rota só valida
// que a proposta pertence ao usuário autenticado, busca o e-mail do cliente e
// dispara via Resend. Mesma autenticação por Bearer token usada em /api/log-acesso.
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token ausente' }, { status: 401 })
    }
    const token = auth.slice(7)
    const admin = createAdminClient()
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const { propostaId, pdfBase64, filename } = await req.json()
    if (!propostaId || !pdfBase64) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    // Busca a proposta garantindo que pertence ao usuário autenticado (defesa em
    // profundidade — o client admin ignora RLS, então o filtro abaixo é obrigatório).
    const { data: proposta, error: propostaError } = await admin
      .from('propostas')
      .select('id, user_id, cliente_id, imovel_id')
      .eq('id', propostaId)
      .eq('user_id', user.id)
      .single()

    if (propostaError || !proposta) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 })
    }

    const { data: cliente } = await admin
      .from('clientes')
      .select('nome, email')
      .eq('id', (proposta as any).cliente_id)
      .single()

    if (!(cliente as any)?.email) {
      return NextResponse.json({ error: 'Cliente sem e-mail cadastrado' }, { status: 400 })
    }

    const { data: imovel } = (proposta as any).imovel_id
      ? await admin.from('imoveis').select('titulo').eq('id', (proposta as any).imovel_id).single()
      : { data: null }

    const resultado = await enviarEmailProposta({
      destinatarioEmail: (cliente as any).email,
      destinatarioNome: (cliente as any).nome,
      imovelTitulo: (imovel as any)?.titulo || 'imóvel selecionado',
      pdfBase64,
      filename: filename || 'proposta.pdf',
    })

    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.erro || 'Falha ao enviar e-mail' }, { status: 502 })
    }

    await admin.from('propostas').update({ enviado_email_em: new Date().toISOString() }).eq('id', propostaId)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[propostas/enviar-email] erro:', err?.message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
