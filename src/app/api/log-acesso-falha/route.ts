import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { registrarAcesso, obterIpDoRequest } from '@/lib/log-acesso'
import { registrarAuditoria } from '@/lib/audit-log'
import { enviarAlertaAdmin } from '@/lib/email-alerta'

// Bloqueio automático temporário contra força bruta: depois de N falhas seguidas
// na mesma conta dentro da janela de tempo abaixo, a conta é bloqueada por um período
// curto (auto-expira — o Supabase Auth libera o login sozinho quando o prazo passa).
const LIMITE_FALHAS = 5
const JANELA_MIN = 15
const DURACAO_BLOQUEIO = '15m'

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

    const userId = (profile as any).id
    const ip = obterIpDoRequest(req)

    await registrarAcesso({
      userId,
      email: (profile as any).email || email,
      nome: (profile as any).nome || null,
      ip,
      userAgent: req.headers.get('user-agent'),
      metodo: 'senha',
      sucesso: false,
    })

    // Verifica se a conta já bateu o limite de falhas na janela recente — se sim, bloqueia.
    try {
      const desde = new Date()
      desde.setMinutes(desde.getMinutes() - JANELA_MIN)

      const { count } = await admin
        .from('logs_acesso')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('sucesso', false)
        .gte('created_at', desde.toISOString())

      if ((count || 0) >= LIMITE_FALHAS) {
        const { data: userData } = await admin.auth.admin.getUserById(userId)
        const jaBloqueado = userData?.user?.banned_until && new Date(userData.user.banned_until).getTime() > Date.now()

        if (!jaBloqueado) {
          await admin.auth.admin.updateUserById(userId, { ban_duration: DURACAO_BLOQUEIO })

          await registrarAuditoria(
            admin,
            { id: null, email: 'sistema (automático)' },
            'bloqueio_automatico',
            { id: userId, email: (profile as any).email || email },
            { motivo: `${count} tentativas de login falhas em ${JANELA_MIN} minutos`, duracao: DURACAO_BLOQUEIO, ip }
          )

          await enviarAlertaAdmin(
            'Conta bloqueada automaticamente por tentativas de login',
            [
              `<strong>Conta:</strong> ${(profile as any).email || email}`,
              `<strong>Tentativas falhas:</strong> ${count} em ${JANELA_MIN} minutos`,
              `<strong>Último IP:</strong> ${ip || 'não identificado'}`,
              `<strong>Bloqueio:</strong> 15 minutos (libera automaticamente)`,
            ]
          )
        }
      }
    } catch (blockErr: any) {
      // Falha na lógica de bloqueio automático não deve impedir a resposta normal
      console.error('[log-acesso-falha] erro no bloqueio automático:', blockErr?.message)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[log-acesso-falha POST] erro:', err?.message)
    return NextResponse.json({ success: true })
  }
}
