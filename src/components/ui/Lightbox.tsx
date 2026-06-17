'use client'
import { useEffect, useCallback, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

interface LightboxProps {
  fotos: { url: string; descricao?: string }[]
  index: number
  onClose: () => void
  onNavigate: (idx: number) => void
}

export default function Lightbox({ fotos, index, onClose, onNavigate }: LightboxProps) {
  const startX = useRef<number | null>(null)

  const prev = useCallback(() => {
    onNavigate((index - 1 + fotos.length) % fotos.length)
  }, [index, fotos.length, onNavigate])

  const next = useCallback(() => {
    onNavigate((index + 1) % fotos.length)
  }, [index, fotos.length, onNavigate])

  // Teclado: ← → Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      onClose()
      if (e.key === 'ArrowLeft')   prev()
      if (e.key === 'ArrowRight')  next()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose, prev, next])

  // Swipe touch
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null) return
    const dx = e.changedTouches[0].clientX - startX.current
    if (Math.abs(dx) > 50) dx > 0 ? prev() : next()
    startX.current = null
  }

  const foto = fotos[index]
  if (!foto) return null

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <ZoomIn size={16} className="text-white/60" />
          <span className="text-white/80 text-sm font-medium">
            {index + 1} / {fotos.length}
          </span>
          {foto.descricao && (
            <span className="text-white/60 text-sm">— {foto.descricao}</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          title="Fechar (Esc)"
        >
          <X size={18} className="text-white" />
        </button>
      </div>

      {/* Imagem principal */}
      <div className="flex-1 flex items-center justify-center px-16 min-h-0 relative">
        <img
          key={foto.url}
          src={foto.url}
          alt={foto.descricao || `Foto ${index + 1}`}
          className="max-h-full max-w-full object-contain select-none"
          draggable={false}
        />

        {/* Botões prev/next */}
        {fotos.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev() }}
              className="absolute left-3 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-all group"
              title="Anterior (←)"
            >
              <ChevronLeft size={24} className="text-white group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next() }}
              className="absolute right-3 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-all group"
              title="Próxima (→)"
            >
              <ChevronRight size={24} className="text-white group-hover:scale-110 transition-transform" />
            </button>
          </>
        )}
      </div>

      {/* Miniaturas */}
      {fotos.length > 1 && (
        <div className="flex-shrink-0 flex gap-2 px-4 py-3 overflow-x-auto justify-center">
          {fotos.map((f, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); onNavigate(i) }}
              className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                i === index ? 'border-blue-400 scale-110' : 'border-white/20 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={f.url} alt="" className="w-full h-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
