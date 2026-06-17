'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { buscarCep, formatarCep } from '@/lib/cep'
import { COMODIDADES_OPTIONS } from '@/lib/utils'
import type { Imovel } from '@/types'
import { Loader2, MapPin, Upload, X, AlertCircle } from 'lucide-react'

interface ImovelFormProps {
  imovel?: Imovel | null
  onSuccess: () => void
  onCancel: () => void
}

const initial = {
  titulo: '', descricao: '', tipo: 'apartamento', valor: '',
  cep: '', logradouro: '', numero: '', complemento: '',
  bairro: '', cidade: '', estado: '', zona: '',
  quartos: '', banheiros: '', vagas: '', area_m2: '',
  comodidades: [] as string[], status: 'disponivel',
}

// Field e supabase fora do componente
function Field({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1">{children}</div>
}

const supabase = createClient()

export default function ImovelForm({ imovel, onSuccess, onCancel }: ImovelFormProps) {
  const [form, setForm] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loadingCep, setLoadingCep] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fotos, setFotos] = useState<{ url: string; storage_path: string }[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))

  useEffect(() => {
    if (imovel) {
      setForm({
        titulo: imovel.titulo || '',
        descricao: imovel.descricao || '',
        tipo: imovel.tipo || 'apartamento',
        valor: imovel.valor?.toString() || '',
        cep: imovel.cep || '',
        logradouro: imovel.logradouro || '',
        numero: imovel.numero || '',
        complemento: imovel.complemento || '',
        bairro: imovel.bairro || '',
        cidade: imovel.cidade || '',
        estado: imovel.estado || '',
        zona: imovel.zona || '',
        quartos: imovel.quartos?.toString() || '',
        banheiros: imovel.banheiros?.toString() || '',
        vagas: imovel.vagas?.toString() || '',
        area_m2: imovel.area_m2?.toString() || '',
        comodidades: imovel.comodidades || [],
        status: imovel.status || 'disponivel',
      })
      if (imovel.fotos) {
        setFotos(imovel.fotos.map(f => ({ url: f.url, storage_path: f.storage_path || '' })))
      }
    }
  }, [imovel])

  const handleCep = async (value: string) => {
    const formatted = formatarCep(value)
    setForm(prev => ({ ...prev, cep: formatted }))
    if (formatted.replace('-', '').length === 8) {
      setLoadingCep(true)
      const data = await buscarCep(formatted)
      if (data) {
        setForm(prev => ({
          ...prev,
          logradouro: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          estado: data.uf,
        }))
      }
      setLoadingCep(false)
    }
  }

  const handleComodidade = (item: string) => {
    setForm(prev => ({
      ...prev,
      comodidades: prev.comodidades.includes(item)
        ? prev.comodidades.filter(c => c !== item)
        : [...prev.comodidades, item],
    }))
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    setUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Não autenticado')

      const newFotos: { url: string; storage_path: string }[] = []
      for (const file of Array.from(e.target.files)) {
        const ext = file.name.split('.').pop()
        const path = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('imoveis').upload(path, file)
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('imoveis').getPublicUrl(path)
          newFotos.push({ url: publicUrl, storage_path: path })
        }
      }
      setFotos(prev => [...prev, ...newFotos])
    } catch (err: any) {
      setError('Erro no upload: ' + err.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const removeFoto = async (index: number) => {
    const foto = fotos[index]
    if (foto.storage_path) {
      await supabase.storage.from('imoveis').remove([foto.storage_path])
    }
    setFotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw new Error('Erro de sessão: ' + sessionError.message)
      if (!session?.user) throw new Error('Usuário não autenticado. Faça login novamente.')

      const payload = {
        titulo: form.titulo,
        descricao: form.descricao || null,
        tipo: form.tipo,
        valor: Number(form.valor),
        cep: form.cep || null,
        logradouro: form.logradouro || null,
        numero: form.numero || null,
        complemento: form.complemento || null,
        bairro: form.bairro || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        zona: form.zona || null,
        quartos: form.quartos ? Number(form.quartos) : null,
        banheiros: form.banheiros ? Number(form.banheiros) : null,
        vagas: form.vagas ? Number(form.vagas) : null,
        area_m2: form.area_m2 ? Number(form.area_m2) : null,
        comodidades: form.comodidades,
        status: form.status,
      }

      let savedId = imovel?.id

      if (imovel) {
        const { error: updateError } = await supabase.from('imoveis').update(payload).eq('id', imovel.id)
        if (updateError) throw new Error('Erro ao atualizar: ' + updateError.message)
      } else {
        const { data, error: insertError } = await supabase
          .from('imoveis')
          .insert({ ...payload, user_id: session.user.id })
          .select('id')
          .single()
        if (insertError) throw new Error('Erro ao cadastrar: ' + insertError.message)
        savedId = data?.id
      }

      // Salvar fotos
      if (savedId && fotos.length > 0) {
        if (imovel) await supabase.from('fotos_imoveis').delete().eq('imovel_id', savedId)
        await supabase.from('fotos_imoveis').insert(
          fotos.map((f, i) => ({ imovel_id: savedId!, url: f.url, storage_path: f.storage_path, ordem: i }))
        )
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Dados básicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Field>
            <label className="label">Título *</label>
            <input className="input" value={form.titulo} onChange={set('titulo')} required
              placeholder="Ex: Apartamento 3 quartos - Centro" autoComplete="off" />
          </Field>
        </div>
        <Field>
          <label className="label">Tipo</label>
          <select className="input" value={form.tipo} onChange={set('tipo')}>
            <option value="apartamento">Apartamento</option>
            <option value="casa">Casa</option>
            <option value="comercial">Comercial</option>
          </select>
        </Field>
        <Field>
          <label className="label">Valor (R$) *</label>
          <input className="input" type="number" min="0" value={form.valor}
            onChange={set('valor')} required placeholder="Ex: 350000" />
        </Field>
        <Field>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={set('status')}>
            <option value="disponivel">Disponível</option>
            <option value="reservado">Reservado</option>
            <option value="vendido">Vendido</option>
          </select>
        </Field>
        <Field>
          <label className="label">Área (m²)</label>
          <input className="input" type="number" min="0" value={form.area_m2}
            onChange={set('area_m2')} placeholder="Ex: 80" />
        </Field>
      </div>

      {/* Endereço */}
      <div>
        <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
          <MapPin size={14} /> Endereço
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field>
            <label className="label">CEP</label>
            <div className="relative">
              <input className="input pr-8" value={form.cep}
                onChange={e => handleCep(e.target.value)}
                placeholder="00000-000" maxLength={9} />
              {loadingCep && (
                <Loader2 size={14} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
              )}
            </div>
          </Field>
          <div className="md:col-span-2">
            <Field>
              <label className="label">Logradouro</label>
              <input className="input" value={form.logradouro} onChange={set('logradouro')}
                placeholder="Rua, Avenida..." />
            </Field>
          </div>
          <Field>
            <label className="label">Número</label>
            <input className="input" value={form.numero} onChange={set('numero')} />
          </Field>
          <Field>
            <label className="label">Complemento</label>
            <input className="input" value={form.complemento} onChange={set('complemento')}
              placeholder="Apto, Bloco..." />
          </Field>
          <Field>
            <label className="label">Bairro</label>
            <input className="input" value={form.bairro} onChange={set('bairro')} />
          </Field>
          <Field>
            <label className="label">Cidade</label>
            <input className="input" value={form.cidade} onChange={set('cidade')} />
          </Field>
          <Field>
            <label className="label">Estado</label>
            <input className="input" value={form.estado} onChange={set('estado')} maxLength={2} placeholder="SP" />
          </Field>
          <Field>
            <label className="label">Zona</label>
            <select className="input" value={form.zona} onChange={set('zona')}>
              <option value="">Selecionar</option>
              {['Norte','Sul','Leste','Oeste','Centro'].map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* Detalhes */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'quartos',   label: 'Quartos',   placeholder: '3' },
          { key: 'banheiros', label: 'Banheiros',  placeholder: '2' },
          { key: 'vagas',     label: 'Vagas',      placeholder: '1' },
        ].map(({ key, label, placeholder }) => (
          <Field key={key}>
            <label className="label">{label}</label>
            <input className="input" type="number" min="0"
              value={(form as any)[key]} onChange={set(key)} placeholder={placeholder} />
          </Field>
        ))}
      </div>

      {/* Comodidades */}
      <div>
        <label className="label">Comodidades</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {COMODIDADES_OPTIONS.map(item => (
            <button type="button" key={item} onClick={() => handleComodidade(item)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                ${form.comodidades.includes(item)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'}`}>
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Descrição */}
      <Field>
        <label className="label">Descrição</label>
        <textarea className="input min-h-[80px] resize-none" value={form.descricao}
          onChange={set('descricao')} placeholder="Descreva o imóvel..." />
      </Field>

      {/* Fotos */}
      <div>
        <label className="label">Fotos</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {fotos.map((f, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
              <img src={f.url} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => removeFoto(i)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <X size={10} className="text-white" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50">
            {uploading
              ? <Loader2 size={16} className="animate-spin text-slate-400" />
              : <Upload size={16} className="text-slate-400" />}
            <span className="text-xs text-slate-400">{uploading ? 'Enviando...' : 'Adicionar'}</span>
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
          {loading ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : (imovel ? 'Salvar alterações' : 'Cadastrar imóvel')}
        </button>
      </div>
    </form>
  )
}
