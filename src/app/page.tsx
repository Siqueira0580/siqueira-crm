'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import {
  LogIn, ChevronLeft, ChevronRight, MapPin, Phone, User,
  Home, Building2, Briefcase, CheckCircle2, Loader2, X, Menu
} from 'lucide-react'

const supabase = createClient()

// Fallback usado apenas se nenhuma imagem tiver sido configurada em /admin/imagens-home
const HERO_FALLBACK = [{ url: '', label: 'Encontre o imóvel dos seus sonhos' }]
const GALLERY_FALLBACK: { url: string; label: string }[] = []

const TIPO_MORADIA = ['Apartamento', 'Casa', 'Cobertura', 'Studio / Loft', 'Sala Comercial', 'Galpão / Industrial', 'Terreno']
const TIPO_INTERESSE = ['Aluguel', 'Compra', 'Investimento / Negócios', 'Avaliação do meu imóvel']

export default function LandingPage() {
  const [heroIdx, setHeroIdx] = useState(0)
  const [galleryIdx, setGalleryIdx] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [heroImages, setHeroImages] = useState(HERO_FALLBACK)
  const [galleryImages, setGalleryImages] = useState(GALLERY_FALLBACK)
  const [form, setForm] = useState({
    nome: '', telefone: '', cidade: '', tipo_moradia: '', tipo_interesse: '', mensagem: ''
  })
  const [aceitou, setAceitou] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const formRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Carrega as imagens configuradas em /admin/imagens-home
  useEffect(() => {
    const loadBanners = async () => {
      const { data } = await supabase
        .from('banners_home')
        .select('foto_url, titulo, tipo, ordem')
        .eq('ativo', true)
        .order('ordem', { ascending: true })

      if (data && data.length > 0) {
        const hero = (data as any[])
          .filter(b => b.tipo === 'hero')
          .map(b => ({ url: b.foto_url, label: b.titulo || 'Siqueira Inteligência Imobiliária' }))
        const destaque = (data as any[])
          .filter(b => b.tipo === 'destaque')
          .map(b => ({ url: b.foto_url, label: b.titulo || 'Imóvel disponível' }))

        if (hero.length > 0) setHeroImages(hero)
        if (destaque.length > 0) setGalleryImages(destaque)
      }
    }
    loadBanners()
  }, [])

  // Auto-advance hero
  useEffect(() => {
    if (heroImages.length <= 1) return
    intervalRef.current = setInterval(() => {
      setHeroIdx(i => (i + 1) % heroImages.length)
    }, 5000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [heroImages.length])

  const prevHero = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setHeroIdx(i => (i - 1 + heroImages.length) % heroImages.length)
  }
  const nextHero = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setHeroIdx(i => (i + 1) % heroImages.length)
  }

  const visibleGallery = () => {
    if (galleryImages.length === 0) return []
    const items = []
    for (let i = 0; i < Math.min(3, galleryImages.length); i++) {
      items.push(galleryImages[(galleryIdx + i) % galleryImages.length])
    }
    return items
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome || !form.telefone) {
      setError('Nome e telefone são obrigatórios.')
      return
    }
    if (!aceitou) {
      setError('Você precisa aceitar os Termos de Uso e a Política de Privacidade.')
      return
    }
    setSending(true)
    setError('')
    const { error: dbErr } = await supabase.from('landing_leads').insert({
      nome: form.nome,
      telefone: form.telefone,
      cidade: form.cidade || null,
      tipo_moradia: form.tipo_moradia || null,
      tipo_interesse: form.tipo_interesse || null,
      mensagem: form.mensagem || null,
      aceite_termos: true,
      aceite_termos_at: new Date().toISOString(),
    } as any)
    setSending(false)
    if (dbErr) {
      setError('Erro ao enviar. Tente novamente.')
    } else {
      setSent(true)
      setForm({ nome: '', telefone: '', cidade: '', tipo_moradia: '', tipo_interesse: '', mensagem: '' })
    }
  }

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ─── NAV ─── */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-blue-600 flex items-center justify-center">
              <Image src="/logo.png" alt="Logo" width={56} height={56} className="object-contain" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-lg leading-tight">Siqueira</p>
              <p className="text-blue-600 text-sm leading-tight">Inteligência Imobiliária</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button onClick={scrollToForm} className="text-sm text-slate-600 hover:text-blue-600 transition-colors">
              Encontre seu imóvel
            </button>
            <button onClick={scrollToForm} className="text-sm text-slate-600 hover:text-blue-600 transition-colors">
              Contato
            </button>
            <Link
              href="/login"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow"
            >
              <LogIn size={15} /> Área do Corretor
            </Link>
          </div>

          <button className="md:hidden p-2 text-slate-600" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 space-y-3">
            <button onClick={() => { setMenuOpen(false); scrollToForm() }} className="block text-slate-700 text-sm">
              Encontre seu imóvel
            </button>
            <button onClick={() => { setMenuOpen(false); scrollToForm() }} className="block text-slate-700 text-sm">
              Contato
            </button>
            <Link href="/login" className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-xl w-fit">
              <LogIn size={14} /> Área do Corretor
            </Link>
          </div>
        )}
      </nav>

      {/* ─── HERO CAROUSEL ─── */}
      <section className="relative h-screen min-h-[600px] max-h-[900px] overflow-hidden bg-gradient-to-br from-slate-800 via-blue-950 to-slate-900">
        {heroImages.map((img, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === heroIdx ? 'opacity-100' : 'opacity-0'}`}
          >
            {img.url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/70" />
          </div>
        ))}

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 pt-16">
          <span className="inline-block bg-blue-600/90 text-white text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
            {heroImages[heroIdx]?.label}
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-4 max-w-3xl drop-shadow-lg">
            Encontre o imóvel<br />
            <span className="text-blue-400">dos seus sonhos</span>
          </h1>
          <p className="text-white/80 text-lg md:text-xl max-w-xl mb-8 drop-shadow">
            Apartamentos, casas e imóveis comerciais com a inteligência que você precisa para decidir melhor.
          </p>
          <button
            onClick={scrollToForm}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-2xl text-base shadow-xl transition-all hover:scale-105"
          >
            Quero ser contactado →
          </button>
        </div>

        {heroImages.length > 1 && (
          <>
            <button
              onClick={prevHero}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 backdrop-blur text-white rounded-full p-3 transition-all"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={nextHero}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 backdrop-blur text-white rounded-full p-3 transition-all"
            >
              <ChevronRight size={22} />
            </button>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {heroImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIdx(i)}
                  className={`rounded-full transition-all ${i === heroIdx ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ─── STATS ─── */}
      <section className="bg-blue-600 py-10">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { n: '500+', label: 'Imóveis disponíveis' },
            { n: '1.200+', label: 'Clientes atendidos' },
            { n: '15', label: 'Anos de experiência' },
            { n: '98%', label: 'Satisfação' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-white">{s.n}</p>
              <p className="text-blue-200 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── GALLERY CAROUSEL ─── */}
      {galleryImages.length > 0 && (
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-800">Imóveis em Destaque</h2>
            <p className="text-slate-500 mt-2">Seleção exclusiva para os melhores perfis</p>
          </div>

          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {visibleGallery().map((img, i) => (
                <div
                  key={img.url + i}
                  className="group relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer"
                  style={{ height: 280 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <p className="font-semibold text-sm">{img.label}</p>
                    <button
                      onClick={scrollToForm}
                      className="mt-1 text-xs bg-blue-600 px-3 py-1 rounded-full hover:bg-blue-500 transition-colors"
                    >
                      Tenho interesse
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {galleryImages.length > 3 && (
              <div className="flex justify-center gap-3 mt-6">
                <button
                  onClick={() => setGalleryIdx(i => (i - 1 + galleryImages.length) % galleryImages.length)}
                  className="bg-white border border-slate-200 shadow text-slate-600 rounded-full p-2.5 hover:bg-blue-50 hover:border-blue-300 transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setGalleryIdx(i => (i + 1) % galleryImages.length)}
                  className="bg-white border border-slate-200 shadow text-slate-600 rounded-full p-2.5 hover:bg-blue-50 hover:border-blue-300 transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
      )}

      {/* ─── FEATURES ─── */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800">Porque a Siqueira Inteligência Imobiliária?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Home size={28} className="text-blue-600" />, title: 'Para morar', desc: 'Encontre a casa ou apartamento ideal para você e sua família, com o atendimento personalizado que merece.' },
              { icon: <Building2 size={28} className="text-blue-600" />, title: 'Para investir', desc: 'Imóveis com alto potencial de valorização e rentabilidade. Nossos corretores guiam cada passo do investimento.' },
              { icon: <Briefcase size={28} className="text-blue-600" />, title: 'Para negócios', desc: 'Salas comerciais, galpões e espaços para o seu negócio crescer, nas melhores localizações.' },
            ].map(f => (
              <div key={f.title} className="text-center p-6 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">{f.icon}</div>
                <h3 className="font-bold text-slate-800 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LEAD FORM ─── */}
      <section ref={formRef} className="py-20 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white">Fale com um corretor</h2>
            <p className="text-blue-300 mt-2">Preencha seus dados e entraremos em contato em breve</p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8">
            {sent ? (
              <div className="text-center py-8">
                <CheckCircle2 size={56} className="text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Recebemos seu contato!</h3>
                <p className="text-slate-500">Um de nossos corretores entrará em contato em breve.</p>
                <button onClick={() => setSent(false)} className="mt-6 text-sm text-blue-600 hover:underline">
                  Enviar outro contato
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <User size={13} className="inline mr-1" /> Nome completo *
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
                      placeholder="Seu nome"
                      value={form.nome}
                      onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <Phone size={13} className="inline mr-1" /> Telefone / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
                      placeholder="(00) 00000-0000"
                      value={form.telefone}
                      onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    <MapPin size={13} className="inline mr-1" /> Cidade de interesse
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
                    placeholder="Ex: São Paulo, Campinas..."
                    value={form.cidade}
                    onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <Building2 size={13} className="inline mr-1" /> Tipo de imóvel
                    </label>
                    <select
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white transition-all"
                      value={form.tipo_moradia}
                      onChange={e => setForm(f => ({ ...f, tipo_moradia: e.target.value }))}
                    >
                      <option value="">Selecione...</option>
                      {TIPO_MORADIA.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <Briefcase size={13} className="inline mr-1" /> Objetivo
                    </label>
                    <select
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white transition-all"
                      value={form.tipo_interesse}
                      onChange={e => setForm(f => ({ ...f, tipo_interesse: e.target.value }))}
                    >
                      <option value="">Selecione...</option>
                      {TIPO_INTERESSE.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Mensagem (opcional)</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none transition-all"
                    placeholder="Conte mais sobre o que você procura..."
                    value={form.mensagem}
                    onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))}
                  />
                </div>

                {/* Aceite de termos */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={aceitou}
                      onChange={e => setAceitou(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${aceitou ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white group-hover:border-blue-400'}`}>
                      {aceitou && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-600 leading-relaxed">
                    Li e aceito os{' '}
                    <Link href="/termos" target="_blank" className="text-blue-600 hover:underline font-medium">
                      Termos de Uso
                    </Link>{' '}
                    e a{' '}
                    <Link href="/privacidade" target="_blank" className="text-blue-600 hover:underline font-medium">
                      Política de Privacidade
                    </Link>
                    , incluindo o tratamento dos meus dados pessoais conforme a LGPD.
                  </span>
                </label>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={sending || !aceitou}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  {sending && <Loader2 size={18} className="animate-spin" />}
                  {sending ? 'Enviando...' : 'Quero ser contactado'}
                </button>

                <p className="text-xs text-center text-slate-400">
                  Seus dados estão seguros conosco. Não enviamos spam.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-slate-900 py-8 text-center space-y-2">
        <p className="text-slate-400 text-sm">
          © {new Date().getFullYear()} Siqueira Inteligência Imobiliária. Todos os direitos reservados.
        </p>
        <div className="flex items-center justify-center gap-4 text-xs">
          <Link href="/termos" className="text-slate-500 hover:text-slate-300 transition-colors">Termos de Uso</Link>
          <span className="text-slate-700">·</span>
          <Link href="/privacidade" className="text-slate-500 hover:text-slate-300 transition-colors">Política de Privacidade</Link>
        </div>
        <Link href="/login" className="inline-flex items-center gap-1.5 text-blue-500 hover:text-blue-300 text-xs transition-colors">
          <LogIn size={12} /> Acesso restrito — Área do Corretor
        </Link>
      </footer>
    </div>
  )
}
