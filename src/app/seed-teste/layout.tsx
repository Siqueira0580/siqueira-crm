// Proteção de produção: esta rota só existe em ambiente de desenvolvimento
import { redirect } from 'next/navigation'

export default function SeedTesteLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') {
    redirect('/dashboard')
  }
  return <>{children}</>
}
