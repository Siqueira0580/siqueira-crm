'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeCtx {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeCtx>({ theme: 'light', toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    // Lê preferência salva ou detecta preferência do sistema
    const saved = localStorage.getItem('crm-theme') as Theme | null
    const initial: Theme = saved
      ? saved
      : window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'

    setTheme(initial)
    applyTheme(initial)
  }, [])

  const applyTheme = (t: Theme) => {
    document.documentElement.classList.toggle('dark', t === 'dark')
  }

  const toggle = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('crm-theme', next)
    applyTheme(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
