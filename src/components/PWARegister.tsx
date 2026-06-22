'use client'
import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Força verificação de uma versão mais nova do SW imediatamente
        registration.update().catch(() => {})

        // Se já existe um worker esperando (versão nova), ativa na hora
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nova versão instalada — recarrega para usar o SW atualizado
              window.location.reload()
            }
          })
        })
      })
      .catch((err) => console.warn('SW registration failed:', err))
  }, [])

  return null
}
