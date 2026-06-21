'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ShieldAlert } from 'lucide-react'

const supabase = createClient()

// Tempo total de inatividade até encerrar a sessão automaticamente
const TIMEOUT_MS = 15 * 60 * 1000 // 15 minutos
// Quanto antes do limite mostrar o aviso com contagem regressiva
const AVISO_ANTES_MS = 30 * 1000 // 30 segundos

const EVENTOS_ATIVIDADE = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const

// Encerra a sessão automaticamente após um período sem uso — proteção extra para quem
// esquece a tela aberta com dados de clientes visíveis. Montado uma vez dentro do AppLayout.
export default function InactivityGuard() {
  const router = useRouter()
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null)
  const ultimaAtividadeRef = useRef(Date.now())

  useEffect(() => {
    const registrarAtividade = () => {
      ultimaAtividadeRef.current = Date.now()
      setSegundosRestantes(null)
    }

    EVENTOS_ATIVIDADE.forEach(evento =>
      window.addEventListener(evento, registrarAtividade, { passive: true })
    )

    const encerrarSessao = async () => {
      await supabase.auth.signOut({ scope: 'global' })
      router.push('/login?error=inatividade')
      router.refresh()
    }

    const intervalo = setInterval(() => {
      const decorrido = Date.now() - ultimaAtividadeRef.current
      const restante = TIMEOUT_MS - decorrido

      if (restante <= 0) {
        clearInterval(intervalo)
        encerrarSessao()
      } else if (restante <= AVISO_ANTES_MS) {
        setSegundosRestantes(Math.ceil(restante / 1000))
      }
    }, 1000)

    return () => {
      EVENTOS_ATIVIDADE.forEach(evento => window.removeEventListener(evento, registrarAtividade))
      clearInterval(intervalo)
    }
  }, [router])

  if (segundosRestantes === null) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={22} className="text-amber-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800">Você ainda está aí?</h2>
        <p className="text-slate-500 text-sm mt-2">
          Por segurança, sua sessão será encerrada por inatividade em{' '}
          <span className="font-semibold text-slate-700">{segundosRestantes}s</span>.
        </p>
        <button
          onClick={() => { ultimaAtividadeRef.current = Date.now(); setSegundosRestantes(null) }}
          className="btn-primary w-full justify-center mt-6"
        >
          Continuar conectado
        </button>
      </div>
    </div>
  )
}
