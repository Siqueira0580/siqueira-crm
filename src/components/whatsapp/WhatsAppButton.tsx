'use client'
import { useState, useRef, useEffect } from 'react'
import { MessageCircle, ChevronDown } from 'lucide-react'
import { getWhatsAppTemplates } from '@/lib/whatsapp-templates'
import type { Cliente, Imovel } from '@/types'

interface WhatsAppButtonProps {
  cliente: Cliente
  imovel?: Partial<Imovel>
  className?: string
  compact?: boolean
}

export default function WhatsAppButton({ cliente, imovel, className = '', compact = false }: WhatsAppButtonProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!cliente.telefone) return null

  const templates = getWhatsAppTemplates(cliente, imovel)
  const numero = cliente.telefone.replace(/\D/g, '')

  const sendMessage = (message: string) => {
    window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(message)}`, '_blank')
    setOpen(false)
  }

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      {compact ? (
        <button
          onClick={() => setOpen(o => !o)}
          className="btn-secondary flex-1 justify-center text-green-700 border-green-200 hover:bg-green-50 text-xs py-1.5"
        >
          <MessageCircle size={13} />
          WhatsApp
          <ChevronDown size={11} />
        </button>
      ) : (
        <button
          onClick={() => setOpen(o => !o)}
          className="btn-primary bg-green-600 hover:bg-green-700 gap-1"
        >
          <MessageCircle size={16} />
          WhatsApp
          <ChevronDown size={14} />
        </button>
      )}

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[220px]">
          <p className="text-xs text-slate-400 px-3 py-1.5 border-b border-slate-100 font-medium">
            Escolher mensagem
          </p>
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => sendMessage(t.message)}
              className="w-full text-left text-sm px-3 py-2 hover:bg-slate-50 text-slate-700 transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
