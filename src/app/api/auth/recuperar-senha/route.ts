import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// Rate limiting simples em memória: máx. 3 tentativas por IP a cada 15 minutos
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutos

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

/** Gera uma senha provisória legível (sem caracteres ambíguos como O, 0, I, l, 1) */
function gerarSenhaProvisoria(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let senha = ''
  for (let i = 0; i < 8; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return senha
}

async function enviarEmail(para: string, senhaProvisoria: string, siteUrl: string) {
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

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:32px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Siqueira CRM</h1>
                <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">Inteligência Imobiliária</p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 16px;color:#1e3a5f;font-size:18px;">Recuperação de acesso</h2>
                <p style="margin:0 0 12px;color:#475569;font-size:14px;line-height:1.6;">
                  Recebemos uma solicitação de recuperação de senha para sua conta.
                  Sua <strong>senha provisória</strong> é:
                </p>

                <!-- Senha em destaque -->
                <div style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:10px;padding:20px;text-align:center;margin:24px 0;">
                  <p style="margin:0 0 6px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Senha provisória</p>
                  <span style="font-size:28px;font-weight:700;letter-spacing:6px;color:#1e3a5f;">${senhaProvisoria}</span>
                </div>

                <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
                  Use esta senha para entrar no sistema. Após o login, você será solicitado
                  a criar uma <strong>senha definitiva</strong>.
                </p>

                <!-- Botão -->
                <div style="text-align:center;margin:0 0 32px;">
                  <a href="${siteUrl}/login"
                     style="display:inline-block;background:#2563eb;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                    Acessar o sistema →
                  </a>
                </div>

                <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;">
                <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
                  Se você não solicitou a recuperação de senha, ignore este e-mail.
                  Sua senha atual permanece inalterada até que você faça login com a senha provisória.
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
      subject: 'Sua senha provisória — Siqueira CRM',
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Falha ao enviar e-mail: ${err}`)
  }
}

export async function POST(req: NextRequest) {
  // Rate limiting por IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.' },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    const email: string | undefined = body?.email

    if (!email) {
      return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // Busca o usuário pelo e-mail
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })
    if (listError) throw listError

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    // Retorna sucesso mesmo se não encontrado (evita enumeração de e-mails)
    if (!user) {
      return NextResponse.json({ ok: true })
    }

    // Gera senha provisória
    const senhaProvisoria = gerarSenhaProvisoria()

    // Atualiza senha e marca que deve redefinir no próximo login
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: senhaProvisoria,
      user_metadata: {
        ...user.user_metadata,
        must_change_password: true,
      },
    })
    if (updateError) throw updateError

    // Envia o e-mail com a senha provisória
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://siqueira-crm-five.vercel.app'
    await enviarEmail(email, senhaProvisoria, siteUrl)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[recuperar-senha]', err.message)
    return NextResponse.json(
      { error: err.message || 'Erro interno. Tente novamente.' },
      { status: 500 }
    )
  }
}
