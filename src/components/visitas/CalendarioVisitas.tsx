'use client'
import { useState } from 'react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  parseISO, format, addMonths, subMonths, getDay, isToday
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'

interface CalendarioVisitasProps {
  visitas: any[]
  onDayClick: (date: Date, visitas: any[]) => void
  onNovaVisita?: (date: Date) => void
}

function hasConflict(visitas: any[]): boolean {
  const agendadas = visitas
    .filter(v => v.status === 'agendado')
    .map(v => new Date(v.data_hora).getTime())
    .sort()

  for (let i = 0; i < agendadas.length - 1; i++) {
    if (agendadas[i + 1] - agendadas[i] < 60 * 60 * 1000) return true
  }
  return false
}

export default function CalendarioVisitas({ visitas, onDayClick, onNovaVisita }: CalendarioVisitasProps) {
  const [mes, setMes] = useState(new Date())

  const inicio = startOfMonth(mes)
  const fim = endOfMonth(mes)
  const dias = eachDayOfInterval({ start: inicio, end: fim })

  // Padding inicial (domingo = 0)
  const primeiroDia = getDay(inicio)
  const padding = Array.from({ length: primeiroDia })

  const visitasDoDia = (dia: Date) =>
    visitas.filter(v => isSameDay(parseISO(v.data_hora), dia))

  const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="card">
      {/* Navegação */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => setMes(m => subMonths(m, 1))} className="btn-secondary p-2">
          <ChevronLeft size={16} />
        </button>
        <h2 className="text-base font-semibold text-slate-800 capitalize">
          {format(mes, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <button onClick={() => setMes(m => addMonths(m, 1))} className="btn-secondary p-2">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Grade */}
      <div className="grid grid-cols-7 gap-1">
        {/* Header semana */}
        {SEMANA.map(d => (
          <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">
            {d}
          </div>
        ))}

        {/* Padding inicial */}
        {padding.map((_, i) => <div key={`pad-${i}`} />)}

        {/* Dias */}
        {dias.map(dia => {
          const dvs = visitasDoDia(dia)
          const agendadas = dvs.filter(v => v.status === 'agendado')
          const realizadas = dvs.filter(v => v.status === 'realizado')
          const canceladas = dvs.filter(v => v.status === 'cancelado')
          const conflito = dvs.length >= 2 && hasConflict(dvs)
          const hoje = isToday(dia)
          const temVisita = dvs.length > 0

          return (
            <button
              key={dia.toISOString()}
              onClick={() => onDayClick(dia, dvs)}
              className={`relative rounded-lg p-1 min-h-[52px] flex flex-col items-center text-xs transition-all
                ${hoje ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'}
                ${temVisita && !hoje ? 'bg-blue-50 border border-blue-100' : ''}
              `}
            >
              <span className={`font-medium mb-1 ${hoje ? 'text-white' : ''}`}>
                {format(dia, 'd')}
              </span>

              {/* Pontos coloridos */}
              {dvs.length > 0 && (
                <div className="flex flex-wrap justify-center gap-0.5">
                  {agendadas.slice(0, 3).map((_, i) => (
                    <span key={`a${i}`} className={`w-1.5 h-1.5 rounded-full ${hoje ? 'bg-white/80' : 'bg-blue-500'}`} />
                  ))}
                  {realizadas.slice(0, 3).map((_, i) => (
                    <span key={`r${i}`} className={`w-1.5 h-1.5 rounded-full ${hoje ? 'bg-white/80' : 'bg-green-500'}`} />
                  ))}
                  {canceladas.slice(0, 2).map((_, i) => (
                    <span key={`c${i}`} className={`w-1.5 h-1.5 rounded-full ${hoje ? 'bg-white/60' : 'bg-red-400'}`} />
                  ))}
                </div>
              )}

              {/* Conflito */}
              {conflito && (
                <AlertTriangle size={10} className={`mt-0.5 ${hoje ? 'text-amber-200' : 'text-amber-500'}`} />
              )}

              {/* Contador quando >3 visitas */}
              {dvs.length > 3 && (
                <span className={`text-[10px] ${hoje ? 'text-white/70' : 'text-slate-400'}`}>
                  +{dvs.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          Agendada
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          Realizada
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          Cancelada
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={12} className="text-amber-500" />
          Conflito de horário
        </div>
      </div>
    </div>
  )
}
