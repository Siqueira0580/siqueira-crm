import { redirect } from 'next/navigation'

interface Props { params: { corretorId: string } }

export default function CaptacaoPage({ params }: Props) {
  redirect(`/formulario-captacao-leads.html?corretor=${params.corretorId}`)
}
