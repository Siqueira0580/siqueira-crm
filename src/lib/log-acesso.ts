// ⚠️ SERVER-ONLY — registra histórico de login em public.logs_acesso (somente via service role)
import { createAdminClient } from '@/lib/supabase-admin'

interface RegistrarAcessoParams {
  userId?: string | null
  email: string
  nome?: string | null
  ip?: string | null
  userAgent?: string | null
  metodo?: 'senha' | 'google'
  sucesso?: boolean
}

export async function registrarAcesso({ userId, email, nome, ip, userAgent, metodo = 'senha', sucesso = true }: RegistrarAcessoParams) {
  try {
    const admin = createAdminClient()
    await admin.from('logs_acesso').insert({
      user_id: userId || null,
      email,
      nome: nome || null,
      ip: ip || null,
      user_agent: userAgent || null,
      metodo,
      sucesso,
    })
  } catch (err: any) {
    // Nunca deve bloquear o login por falha no registro do log
    console.error('[registrarAcesso] falha ao gravar log de acesso:', err?.message)
  }
}

// Extrai o IP real do request, considerando proxies (Vercel/Next.js)
export function obterIpDoRequest(req: Request): string | null {
  const headers = req.headers
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const real = headers.get('x-real-ip')
  if (real) return real
  return null
}
