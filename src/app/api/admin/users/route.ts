import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

const FIXED_ADMIN_EMAIL = 'duda.siqueira2@gmail.com'

// Verifica o token JWT enviado pelo cliente no header Authorization
async function verifyAdmin(req: NextRequest) {
  try {
    const auth = req.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) return null

    const token = auth.slice(7)
    if (!token) return null

    const admin = createAdminClient()

    // Verifica o token com o admin client (server-side, bypass RLS)
    const { data: { user }, error } = await admin.auth.getUser(token)
    if (error) {
      console.error('[verifyAdmin] getUser error:', error.message)
      return null
    }
    if (!user) return null
    if (user.email !== FIXED_ADMIN_EMAIL) return null
    return user
  } catch (err: any) {
    console.error('[verifyAdmin] exception:', err?.message)
    return null
  }
}

// GET — lista todos os usuários
export async function GET(req: NextRequest) {
  try {
    const caller = await verifyAdmin(req)
    if (!caller) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const admin = createAdminClient()

    // Busca todos os usuários (paginação explícita para compatibilidade com todas as versões)
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id, nome, role, avatar_url, telefone')

    if (profilesError) {
      console.error('[admin/users GET] profiles error:', profilesError.message)
    }

    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]))

    const users = (data?.users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      email_confirmed_at: u.email_confirmed_at,
      nome: profileMap[u.id]?.nome || u.user_metadata?.nome || '',
      role: profileMap[u.id]?.role || 'corretor',
      telefone: profileMap[u.id]?.telefone || '',
    }))

    return NextResponse.json({ users })
  } catch (err: any) {
    console.error('[admin/users GET] erro inesperado:', err?.message)
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 })
  }
}

// POST — cria usuário e envia convite por e-mail
export async function POST(req: NextRequest) {
  const caller = await verifyAdmin(req)
  if (!caller) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const body = await req.json()
  const { email, nome, role = 'corretor', telefone = '' } = body

  if (!email || !nome) {
    return NextResponse.json({ error: 'E-mail e nome são obrigatórios' }, { status: 400 })
  }

  const admin = createAdminClient()
  const origin = req.headers.get('origin') || 'http://localhost:3000'

  // Envia convite — cria o usuário E dispara e-mail automaticamente
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nome, telefone },
    redirectTo: `${origin}/redefinir-senha`,
  })

  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 400 })

  // Salva perfil com role e telefone
  await admin.from('profiles').upsert({
    id: invited.user.id,
    email,
    nome,
    role,
    telefone,
  })

  return NextResponse.json({ success: true, user: invited.user })
}

// PUT — edita nome, role, telefone; ou reseta senha
export async function PUT(req: NextRequest) {
  const caller = await verifyAdmin(req)
  if (!caller) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const body = await req.json()
  const { id, nome, role, telefone, reset_password } = body
  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

  const admin = createAdminClient()

  // Protege role do admin fixo
  const { data: existing } = await admin.auth.admin.getUserById(id)
  if (existing?.user?.email === FIXED_ADMIN_EMAIL && role && role !== 'admin') {
    return NextResponse.json({ error: 'O administrador fixo não pode ter o perfil alterado' }, { status: 403 })
  }

  if (reset_password) {
    const origin = req.headers.get('origin') || 'http://localhost:3000'
    // Envia e-mail de redefinição de senha
    await admin.auth.resetPasswordForEmail(existing?.user?.email || '', {
      redirectTo: `${origin}/redefinir-senha`,
    })
    return NextResponse.json({ success: true, email_sent: true })
  }

  if (nome) {
    await admin.auth.admin.updateUserById(id, { user_metadata: { nome } })
  }

  const profileUpdate: Record<string, string> = {}
  if (nome) profileUpdate.nome = nome
  if (role) profileUpdate.role = role
  if (telefone !== undefined) profileUpdate.telefone = telefone

  if (Object.keys(profileUpdate).length > 0) {
    await admin.from('profiles').update(profileUpdate).eq('id', id)
  }

  return NextResponse.json({ success: true })
}

// DELETE — remove usuário (admin fixo não pode ser excluído)
export async function DELETE(req: NextRequest) {
  const caller = await verifyAdmin(req)
  if (!caller) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

  const admin = createAdminClient()

  const { data: existing } = await admin.auth.admin.getUserById(id)
  if (existing?.user?.email === FIXED_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'O administrador fixo não pode ser excluído' }, { status: 403 })
  }

  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('profiles').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
