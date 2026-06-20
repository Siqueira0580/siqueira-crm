'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Página antiga — mantida apenas para não quebrar links/favoritos salvos.
// O conteúdo agora vive em /admin (aba "Perfil da Home").
export default function RedirectImagensHome() {
  const router = useRouter()
  useEffect(() => { router.replace('/admin?tab=home') }, [router])
  return null
}
