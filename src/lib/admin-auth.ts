// ⚠️ SERVER-ONLY — verificação de identidade do administrador fixo para rotas /api/admin/*
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const FIXED_ADMIN_EMAIL = 'duda.siqueira2@gmail.com'

// Verifica o token JWT enviado pelo cliente no header Authorization.
// Retorna o usuário autenticado se ele for o administrador fixo, ou null.
export async function verifyAdmin(req: NextRequest) {
  try {
    const auth = req.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) return null

    const token = auth.slice(7)
    if (!token) return null

    const admin = createAdminClient()

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
