'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Página antiga — mantida apenas para não quebrar links/favoritos salvos.
// O conteúdo agora vive em /admin (aba "Usuários").
export default function RedirectUsuarios() {
  const router = useRouter()
  useEffect(() => { router.replace('/admin?tab=usuarios') }, [router])
  return null
}
