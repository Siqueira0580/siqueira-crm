import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let client: SupabaseClient<Database> | null = null

// IMPORTANTE: usa createBrowserClient (cookies) em vez de createClient (localStorage).
// O callback OAuth em /auth/callback/route.ts roda no servidor e grava a sessão em
// cookies via createServerClient. Se o cliente usar localStorage, a sessão nunca é
// encontrada após o login com Google e o app trata o usuário como deslogado.
export function createClient(): SupabaseClient<Database> {
  if (!client) {
    client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  }
  return client
}
