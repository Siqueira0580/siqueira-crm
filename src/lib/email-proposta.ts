// ⚠️ SERVER-ONLY — envia a proposta em PDF por e-mail ao cliente, via Resend.
// Usa as mesmas variáveis de ambiente já configuradas para os alertas de
// segurança (RESEND_API_KEY, EMAIL_FROM). Diferente de email-alerta.ts (que só
// envia para o admin fixo), esta função envia para o e-mail do cliente.

interface EnviarEmailPropostaParams {
  destinatarioEmail: string
  destinatarioNome: string
  imovelTitulo: string
  pdfBase64: string
  filename: string
}

function templateEmailProposta(nomeCliente: string, imovelTitulo: string) {
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
                <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Siqueira Inteligência Imobiliária</h1>
                <p style="margin:4px 0 0;color:#bfdbfe;font-size:12px;">Proposta de Compra</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px;">
                <p style="margin:0 0 16px;color:#1e293b;font-size:14px;">Olá, ${nomeCliente}!</p>
                <p style="margin:0 0 16px;color:#475569;font-size:13px;line-height:1.6;">
                  Em anexo está a simulação financeira para o imóvel <strong>${imovelTitulo}</strong>, com o detalhamento de ITBI, cartório, financiamento e parcelas estimadas.
                </p>
                <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.5;">
                  Qualquer dúvida, estamos à disposição para conversar.
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

export async function enviarEmailProposta({
  destinatarioEmail, destinatarioNome, imovelTitulo, pdfBase64, filename,
}: EnviarEmailPropostaParams): Promise<{ ok: boolean; erro?: string }> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    return { ok: false, erro: 'RESEND_API_KEY não configurada no servidor.' }
  }
  const FROM_EMAIL = process.env.EMAIL_FROM || 'Siqueira CRM <noreply@siqueirainteligencia.com.br>'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [destinatarioEmail],
        subject: `Proposta de compra — ${imovelTitulo}`,
        html: templateEmailProposta(destinatarioNome, imovelTitulo),
        attachments: [{ filename, content: pdfBase64 }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return { ok: false, erro: err }
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, erro: err?.message || 'Erro desconhecido ao enviar e-mail.' }
  }
}
