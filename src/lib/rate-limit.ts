// ⚠️ SERVER-ONLY — rate limiting persistente usando a tabela public.rate_limits.
// Diferente de um Map em memória, isto funciona corretamente em ambiente serverless
// (Vercel), onde cada invocação pode rodar numa instância diferente e perderia
// qualquer contador guardado só em memória do processo.
import { createAdminClient } from '@/lib/supabase-admin'

interface CheckRateLimitParams {
  chave: string
  limite: number
  janelaMs: number
}

/**
 * Verifica e incrementa o contador de uma chave (ex: "recuperar-senha:IP" ou
 * "analise-comportamento:userId"). Retorna true se a ação pode seguir, false se
 * o limite foi atingido dentro da janela de tempo.
 */
export async function checkRateLimit({ chave, limite, janelaMs }: CheckRateLimitParams): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const agora = new Date()

    const { data: existente } = await admin
      .from('rate_limits')
      .select('contagem, expira_em')
      .eq('chave', chave)
      .maybeSingle()

    if (!existente || new Date((existente as any).expira_em).getTime() <= agora.getTime()) {
      // Janela nova ou expirada — reinicia o contador
      await admin.from('rate_limits').upsert({
        chave,
        contagem: 1,
        expira_em: new Date(agora.getTime() + janelaMs).toISOString(),
      })
      return true
    }

    if ((existente as any).contagem >= limite) {
      return false
    }

    await admin
      .from('rate_limits')
      .update({ contagem: (existente as any).contagem + 1 })
      .eq('chave', chave)

    return true
  } catch (err: any) {
    // Falha no rate limit não deve travar a funcionalidade principal —
    // mas também não deve abrir a porta: em caso de erro, permite a ação
    // (mesma postura de "fail open" que o restante do sistema usa para logs).
    console.error('[checkRateLimit] erro:', err?.message)
    return true
  }
}
