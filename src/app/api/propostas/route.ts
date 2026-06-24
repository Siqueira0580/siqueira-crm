import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// Identifica o usuário pelo Bearer token e retorna { user, isAdmin }
async function autenticar(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const admin = createAdminClient()
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) return null

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin =
    (profile as any)?.role === 'admin' ||
    user.email === process.env.FIXED_ADMIN_EMAIL ||
    user.email === 'duda.siqueira2@gmail.com'

  return { user, isAdmin }
}

// GET — lista propostas com dados de cliente, imóvel e corretor
// Admin vê todas; corretor vê só as suas
export async function GET(req: NextRequest) {
  try {
    const auth = await autenticar(req)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const admin = createAdminClient()

    let query = (admin.from('propostas') as any)
      .select(`
        id, user_id, cliente_id, imovel_id, tipo,
        dados_simulacao, valor_imovel, valor_entrada,
        valor_financiado, parcela_inicial,
        pdf_url, enviado_whatsapp_em, enviado_email_em,
        created_at, updated_at
      `)
      .order('created_at', { ascending: false })

    if (!auth.isAdmin) {
      query = query.eq('user_id', auth.user.id)
    }

    const { data: propostas, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!propostas || propostas.length === 0) {
      return NextResponse.json({ propostas: [] })
    }

    // Busca clientes e imóveis em paralelo
    const clienteIds = [...new Set(propostas.map((p: any) => p.cliente_id).filter(Boolean))]
    const imovelIds  = [...new Set(propostas.map((p: any) => p.imovel_id).filter(Boolean))]
    const userIds    = [...new Set(propostas.map((p: any) => p.user_id).filter(Boolean))]

    const [{ data: clientes }, { data: imoveis }, { data: profiles }] = await Promise.all([
      clienteIds.length
        ? admin.from('clientes').select('id, nome, email, telefone').in('id', clienteIds)
        : { data: [] },
      imovelIds.length
        ? admin.from('imoveis').select('id, titulo, valor, bairro, cidade').in('id', imovelIds)
        : { data: [] },
      userIds.length
        ? admin.from('profiles').select('id, nome').in('id', userIds)
        : { data: [] },
    ])

    const clienteMap  = Object.fromEntries((clientes  || []).map((c: any) => [c.id, c]))
    const imovelMap   = Object.fromEntries((imoveis   || []).map((i: any) => [i.id, i]))
    const profileMap  = Object.fromEntries((profiles  || []).map((p: any) => [p.id, p]))

    const resultado = propostas.map((p: any) => ({
      ...p,
      cliente:  clienteMap[p.cliente_id]  || null,
      imovel:   imovelMap[p.imovel_id]    || null,
      corretor: profileMap[p.user_id]     || null,
    }))

    return NextResponse.json({ propostas: resultado })
  } catch (err: any) {
    console.error('[GET /api/propostas]', err?.message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE — exclui uma proposta (somente dono ou admin)
export async function DELETE(req: NextRequest) {
  try {
    const auth = await autenticar(req)
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

    const admin = createAdminClient()

    // Verifica propriedade
    const { data: proposta, error: fetchErr } = await (admin.from('propostas') as any)
      .select('id, user_id, pdf_url')
      .eq('id', id)
      .single()

    if (fetchErr || !proposta) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 })
    }
    if (!auth.isAdmin && proposta.user_id !== auth.user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Remove PDF do storage se existir
    if (proposta.pdf_url) {
      const path = `${id}.pdf`
      await admin.storage.from('propostas').remove([path])
    }

    const { error: delErr } = await (admin.from('propostas') as any).delete().eq('id', id)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[DELETE /api/propostas]', err?.message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
