import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { verifyAdmin, FIXED_ADMIN_EMAIL } from '@/lib/admin-auth'
import { registrarAuditoria } from '@/lib/audit-log'
import { enviarAlertaAdmin } from '@/lib/email-alerta'

// Duração usada para bloquear um usuário (Supabase Auth não tem "ban permanente" nativo,
// então usamos um período bem longo). Para desbloquear, usamos ban_duration: 'none'.
const BAN_DURATION = '876000h' // 100 anos

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

    const users = (data?.users || []).map((u: any) => {
      const bannedUntil = u.banned_until ? new Date(u.banned_until) : null
      const bloqueado = !!bannedUntil && bannedUntil.getTime() > Date.now()
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        nome: profileMap[u.id]?.nome || u.user_metadata?.nome || '',
        role: profileMap[u.id]?.role || 'corretor',
        telefone: profileMap[u.id]?.telefone || '',
        bloqueado,
      }
    })

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
  const { error: profileError } = await admin.from('profiles').upsert({
    id: invited.user.id,
    email,
    nome,
    role,
    telefone,
  })
  if (profileError) {
    console.error('[admin/users POST] profiles upsert error:', profileError.message)
    return NextResponse.json({ error: 'Usuário convidado, mas falhou ao salvar perfil: ' + profileError.message }, { status: 500 })
  }

  await registrarAuditoria(admin, caller, 'criar_usuario', { id: invited.user.id, email }, { nome, role })

  if (role === 'admin') {
    await enviarAlertaAdmin(
      'Novo administrador criado',
      [
        `<strong>E-mail:</strong> ${email}`,
        `<strong>Nome:</strong> ${nome}`,
        `<strong>Criado por:</strong> ${caller.email}`,
      ]
    )
  }

  return NextResponse.json({ success: true, user: invited.user })
}

// PUT — edita nome, role, telefone; ou reseta senha
export async function PUT(req: NextRequest) {
  const caller = await verifyAdmin(req)
  if (!caller) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const body = await req.json()
  const { id, nome, role, telefone, reset_password, bloquear } = body
  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

  const admin = createAdminClient()

  // Protege role do admin fixo
  const { data: existing } = await admin.auth.admin.getUserById(id)
  if (existing?.user?.email === FIXED_ADMIN_EMAIL && role && role !== 'admin') {
    return NextResponse.json({ error: 'O administrador fixo não pode ter o perfil alterado' }, { status: 403 })
  }
  if (existing?.user?.email === FIXED_ADMIN_EMAIL && bloquear !== undefined) {
    return NextResponse.json({ error: 'O administrador fixo não pode ser bloqueado' }, { status: 403 })
  }

  // Bloquear / desbloquear acesso (ban nativo do Supabase Auth — impede login e refresh de sessão)
  if (bloquear !== undefined) {
    const { error: banError } = await admin.auth.admin.updateUserById(id, {
      ban_duration: bloquear ? BAN_DURATION : 'none',
    })
    if (banError) {
      console.error('[admin/users PUT] ban error:', banError.message)
      return NextResponse.json({ error: 'Erro ao alterar bloqueio: ' + banError.message }, { status: 500 })
    }
    await registrarAuditoria(
      admin, caller,
      bloquear ? 'bloquear_usuario' : 'desbloquear_usuario',
      { id, email: existing?.user?.email }
    )

    await enviarAlertaAdmin(
      bloquear ? 'Usuário bloqueado' : 'Usuário desbloqueado',
      [
        `<strong>Conta:</strong> ${existing?.user?.email || id}`,
        `<strong>Ação realizada por:</strong> ${caller.email}`,
      ],
      bloquear ? '#dc2626' : '#16a34a'
    )

    return NextResponse.json({ success: true })
  }

  if (reset_password) {
    const origin = req.headers.get('origin') || 'http://localhost:3000'
    // Envia e-mail de redefinição de senha
    await admin.auth.resetPasswordForEmail(existing?.user?.email || '', {
      redirectTo: `${origin}/redefinir-senha`,
    })
    await registrarAuditoria(admin, caller, 'resetar_senha', { id, email: existing?.user?.email })
    return NextResponse.json({ success: true, email_sent: true })
  }

  if (nome) {
    const { error: metaError } = await admin.auth.admin.updateUserById(id, { user_metadata: { nome } })
    if (metaError) {
      console.error('[admin/users PUT] updateUserById error:', metaError.message)
      return NextResponse.json({ error: 'Erro ao atualizar nome do usuário: ' + metaError.message }, { status: 500 })
    }
  }

  const profileUpdate: Record<string, string> = {}
  if (nome) profileUpdate.nome = nome
  if (role) profileUpdate.role = role
  if (telefone !== undefined) profileUpdate.telefone = telefone

  if (Object.keys(profileUpdate).length > 0) {
    const { error: profileError } = await admin.from('profiles').update(profileUpdate).eq('id', id)
    if (profileError) {
      console.error('[admin/users PUT] profiles update error:', profileError.message)
      return NextResponse.json({ error: 'Erro ao salvar perfil: ' + profileError.message }, { status: 500 })
    }
    await registrarAuditoria(admin, caller, 'editar_usuario', { id, email: existing?.user?.email }, profileUpdate)

    if (profileUpdate.role === 'admin') {
      await enviarAlertaAdmin(
        'Usuário promovido a administrador',
        [
          `<strong>Conta:</strong> ${existing?.user?.email || id}`,
          `<strong>Alterado por:</strong> ${caller.email}`,
        ]
      )
    }
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

  await registrarAuditoria(admin, caller, 'excluir_usuario', { id, email: existing?.user?.email })

  return NextResponse.json({ success: true })
}
