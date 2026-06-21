// ⚠️ SERVER-ONLY — grava entradas em public.admin_audit_log (somente via service role)
import { createAdminClient } from '@/lib/supabase-admin'

interface Caller {
  id: string | null // null = ação automática do sistema (não vinculada a um admin específico)
  email?: string | null
}

interface Alvo {
  id?: string | null
  email?: string | null
}

// Grava uma entrada de auditoria — nunca deve interromper a ação principal em caso de falha
export async function registrarAuditoria(
  admin: ReturnType<typeof createAdminClient>,
  caller: Caller,
  acao: string,
  alvo?: Alvo,
  detalhes?: Record<string, any>
) {
  try {
    await admin.from('admin_audit_log').insert({
      admin_id: caller.id || null,
      admin_email: caller.email || '',
      acao,
      alvo_user_id: alvo?.id || null,
      alvo_email: alvo?.email || null,
      detalhes: detalhes || {},
    })
  } catch (err: any) {
    console.error('[registrarAuditoria] falha ao gravar auditoria:', err?.message)
  }
}
