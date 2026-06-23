import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { verifyAdmin, FIXED_ADMIN_EMAIL } from '@/lib/admin-auth'
import { registrarAuditoria } from '@/lib/audit-log'
import { enviarAlertaAdmin } from '@/lib/email-alerta'

/** Gera uma senha provisória legível (sem caracteres ambíguos: O, 0, I, l, 1) */
function gerarSenhaProvisoria(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let senha = ''
  for (let i = 0; i < 10; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return senha
}

/** Envia email de boas-vindas com senha provisória via Resend */
async function enviarBoasVindas(para: string, nome: string, senhaProvisoria: string, siteUrl: string) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY não configurada nas variáveis de ambiente')

  const FROM_EMAIL = process.env.EMAIL_FROM || 'Siqueira CRM <noreply@siqueirainteligencia.com.br>'

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
        <tr><td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:32px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Siqueira CRM</h1>
                <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">Inteligência Imobiliária</p>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 16px;color:#1e3a5f;font-size:18px;">Bem-vindo(a), ${nome}!</h2>
                <p style="margin:0 0 12px;color:#475569;font-size:14px;line-height:1.6;">
                  Sua conta no <strong>Siqueira CRM</strong> foi criada com sucesso.
                  Use as credenciais abaixo para acessar o sistema:
                </p>

                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin:24px 0;">
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:13px;">
                      <strong style="color:#1e3a5f;">E-mail:</strong> ${para}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 0 6px;color:#64748b;font-size:13px;">
                      <strong style="color:#1e3a5f;">Senha provisória:</strong>
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align:center;padding:12px 0;">
                      <span style="font-size:26px;font-weight:700;letter-spacing:6px;color:#1e3a5f;background:#eff6ff;border:2px solid #bfdbfe;border-radius:8px;padding:10px 20px;display:inline-block;">${senhaProvisoria}</span>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
                  No primeiro acesso, você será solicitado a criar uma <strong>senha definitiva</strong>.
                </p>

                <div style="text-align:center;margin:0 0 32px;">
                  <a href="${siteUrl}/login"
                     style="display:inline-block;background:#2563eb;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                    Acessar o sistema →
                  </a>
                </div>

                <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;">
                <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
                  Este acesso foi criado por um administrador da Siqueira Inteligência Imobiliária.
                  Em caso de dúvidas, entre em contato com sua equipe.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [para],
      subject: 'Seu acesso ao Siqueira CRM — senha provisória',
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Falha ao enviar e-mail de boas-vindas: ${err}`)
  }
}

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get('origin') || 'http://localhost:3000'

  // Gera senha provisória e cria o usuário já com e-mail confirmado
  const senhaProvisoria = gerarSenhaProvisoria()

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: senhaProvisoria,
    email_confirm: true,
    user_metadata: { nome, telefone, must_change_password: true },
  })

  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 })

  // Salva perfil com role e telefone
  const { error: profileError } = await admin.from('profiles').upsert({
    id: created.user.id,
    email,
    nome,
    role,
    telefone,
  })
  if (profileError) {
    console.error('[admin/users POST] profiles upsert error:', profileError.message)
    return NextResponse.json({ error: 'Usuário criado, mas falhou ao salvar perfil: ' + profileError.message }, { status: 500 })
  }

  // Envia e-mail com senha provisória via Resend
  try {
    await enviarBoasVindas(email, nome, senhaProvisoria, siteUrl)
  } catch (emailErr: any) {
    console.error('[admin/users POST] falha ao enviar e-mail de boas-vindas:', emailErr?.message)
    // Não bloqueia — usuário foi criado; admin pode resetar senha manualmente
  }

  await registrarAuditoria(admin, caller, 'criar_usuario', { id: created.user.id, email }, { nome, role })

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

  return NextResponse.json({ success: true, user: created.user })
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
