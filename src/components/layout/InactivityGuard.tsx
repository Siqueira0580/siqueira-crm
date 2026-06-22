'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ShieldAlert } from 'lucide-react'

const supabase = createClient()

// Tempo total de inatividade até encerrar a sessão automaticamente
const TIMEOUT_MS = 15 * 60 * 1000 // 15 minutos
// Quanto antes do limite mostrar o aviso com contagem regressiva
const AVISO_ANTES_MS = 30 * 1000 // 30 segundos

// Chave usada no localStorage — guarda o timestamp da última atividade.
// Por quê localStorage (e não só uma variável em memória):
// 1) O AppLayout (e este componente dentro dele) é remontado a cada navegação entre
//    páginas internas, porque não é um layout.tsx persistente do Next.js — é incluído
//    dentro de cada page.tsx. Um contador só em memória (useRef) reiniciava do zero em
//    toda remontagem, o que tornava o recurso difícil de confiar e de testar.
// 2) localStorage é compartilhado entre abas da mesma origem — atividade em uma aba
//    conta para a sessão como um todo, em vez de cada aba ter seu próprio relógio.
const STORAGE_KEY = 'crm_ultima_atividade'

const EVENTOS_ATIVIDADE = [
  'mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'touchmove', 'click', 'wheel',
] as const

function lerUltimaAtividade(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    const n = v ? parseInt(v, 10) : NaN
    return Number.isFinite(n) ? n : Date.now()
  } catch {
    return Date.now()
  }
}

function gravarUltimaAtividade(t: number) {
  try { localStorage.setItem(STORAGE_KEY, String(t)) } catch { /* ignora (modo privado etc.) */ }
}

// Encerra a sessão automaticamente após um período sem uso — proteção extra para quem
// esquece a tela aberta com dados de clientes visíveis. Montado dentro do AppLayout.
export default function InactivityGuard() {
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null)
  const ultimaAtividadeRef = useRef<number>(Date.now())

  useEffect(() => {
    // Recupera o timestamp persistido — pode já existir de uma montagem anterior
    // (navegação dentro do sistema) ou de outra aba aberta.
    ultimaAtividadeRef.current = lerUltimaAtividade()

    const registrarAtividade = () => {
      const agora = Date.now()
      ultimaAtividadeRef.current = agora
      gravarUltimaAtividade(agora)
      setSegundosRestantes(null)
    }

    EVENTOS_ATIVIDADE.forEach(evento =>
      window.addEventListener(evento, registrarAtividade, { passive: true })
    )

    // Sincroniza com atividade registrada em outra aba
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const t = parseInt(e.newValue, 10)
        if (Number.isFinite(t)) {
          ultimaAtividadeRef.current = t
          setSegundosRestantes(null)
        }
      }
    }
    window.addEventListener('storage', onStorage)

    let encerrando = false
    const encerrarSessao = async () => {
      if (encerrando) return
      encerrando = true
      try {
        await supabase.auth.signOut({ scope: 'global' })
      } catch (err) {
        // Mesmo se o signOut falhar (rede, token já inválido etc.), ainda assim
        // forçamos a saída abaixo — nunca deve travar o usuário logado por erro silencioso.
        console.error('[InactivityGuard] erro ao encerrar sessão:', err)
      } finally {
        try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignora */ }
        // Navegação "dura" (em vez de router.push) garante que nenhum estado em memória
        // (intervalos, assinaturas realtime etc.) sobreviva ao logout forçado.
        window.location.href = '/login?error=inatividade'
      }
    }

    const verificar = () => {
      if (encerrando) return
      const decorrido = Date.now() - ultimaAtividadeRef.current
      const restante = TIMEOUT_MS - decorrido

      if (restante <= 0) {
        encerrarSessao()
      } else if (restante <= AVISO_ANTES_MS) {
        setSegundosRestantes(Math.ceil(restante / 1000))
      } else {
        setSegundosRestantes(null)
      }
    }

    const intervalo = setInterval(verificar, 1000)

    // Quando o app volta a ficar visível (ex.: usuário trocou de app no celular/tablet
    // e voltou, ou desbloqueou a tela), reavalia na hora — o setInterval costuma ficar
    // pausado ou muito atrasado em segundo plano em navegadores mobile.
    const onVisible = () => { if (document.visibilityState === 'visible') verificar() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', verificar)

    // Verificação imediata ao montar (cobre o caso de o limite já ter passado
    // entre uma remontagem e outra, ou ao reabrir uma aba que ficou em segundo plano)
    verificar()

    return () => {
      EVENTOS_ATIVIDADE.forEach(evento => window.removeEventListener(evento, registrarAtividade))
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', verificar)
      clearInterval(intervalo)
    }
  }, [])

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
          onClick={() => {
            const agora = Date.now()
            ultimaAtividadeRef.current = agora
            gravarUltimaAtividade(agora)
            setSegundosRestantes(null)
          }}
          className="btn-primary w-full justify-center mt-6"
        >
          Continuar conectado
        </button>
      </div>
    </div>
  )
}
