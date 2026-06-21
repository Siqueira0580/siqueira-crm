// ⚠️ SERVER-ONLY — envia e-mails de alerta de segurança para o administrador via Resend.
// Reaproveita as mesmas variáveis de ambiente já usadas em /api/auth/recuperar-senha
// (RESEND_API_KEY, EMAIL_FROM). Nunca deve interromper a ação principal em caso de falha.
import { FIXED_ADMIN_EMAIL } from '@/lib/admin-auth'

function template(titulo: string, linhas: string[], corDestaque = '#dc2626') {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
        <tr><td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:28px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Siqueira CRM</h1>
                <p style="margin:4px 0 0;color:#bfdbfe;font-size:12px;">Alerta de segurança</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px;">
                <h2 style="margin:0 0 16px;color:${corDestaque};font-size:17px;">${titulo}</h2>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                  ${linhas.map(l => `<tr><td style="padding:6px 0;color:#475569;font-size:13px;border-bottom:1px solid #f1f5f9;">${l}</td></tr>`).join('')}
                </table>
                <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.5;">
                  Este é um alerta automático do sistema. Se não reconhecer esta atividade, revise os acessos na aba Administração → Acessos.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `
}

export async function enviarAlertaAdmin(titulo: string, linhas: string[], corDestaque?: string) {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY
    if (!RESEND_API_KEY) {
      console.warn('[email-alerta] RESEND_API_KEY não configurada — alerta não enviado:', titulo)
      return
    }
    const FROM_EMAIL = process.env.EMAIL_FROM || 'Siqueira CRM <noreply@siqueirainteligencia.com.br>'

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [FIXED_ADMIN_EMAIL],
        subject: `[Siqueira CRM] ${titulo}`,
        html: template(titulo, linhas, corDestaque),
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[email-alerta] falha ao enviar:', err)
    }
  } catch (err: any) {
    // Alerta é best-effort — nunca deve quebrar a ação principal (login, bloqueio, etc.)
    console.error('[email-alerta] exceção ao enviar:', err?.message)
  }
}
