'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Database, Download, Upload, Loader2, AlertCircle, ShieldCheck, Info, RotateCcw, CheckCircle, X, Clock, FileJson, Cloud, ExternalLink, ChevronDown, ChevronUp,
} from 'lucide-react'
import { NOME_TABELA, isTabelaRestauravel } from '@/lib/backup-tabelas'
import TabSistemaDashboard from './TabSistemaDashboard'

const supabase = createClient()

async function apiHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` }
}

interface BackupCarregado {
  nomeArquivo: string
  geradoEm?: string
  tabelas: Record<string, any[]>
}

export default function TabSistema() {
  const [contagens, setContagens] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [baixando, setBaixando] = useState(false)
  const [erroBackup, setErroBackup] = useState('')

  // Restauração
  const fileRef = useRef<HTMLInputElement>(null)
  const [backup, setBackup] = useState<BackupCarregado | null>(null)
  const [erroArquivo, setErroArquivo] = useState('')
  const [tabelaEscolhida, setTabelaEscolhida] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [textoConfirmacao, setTextoConfirmacao] = useState('')
  const [restaurando, setRestaurando] = useState(false)
  const [erroRestaurar, setErroRestaurar] = useState('')
  const [resultadoRestaurar, setResultadoRestaurar] = useState<{ tabela: string; registros: number } | null>(null)

  // Backups automáticos
  const [backupsAuto, setBackupsAuto] = useState<{ nome: string; criado_em: string; tamanho: number | null; url: string | null }[]>([])
  const [loadingAuto, setLoadingAuto] = useState(true)
  const [erroAuto, setErroAuto] = useState('')

  // Google Drive
  const [gdrive, setGdrive] = useState<'idle' | 'gerando' | 'autorizando' | 'enviando' | 'ok' | 'erro'>('idle')
  const [erroGdrive, setErroGdrive] = useState('')
  const [urlGdrive, setUrlGdrive] = useState('')
  const [mostrarSetupDrive, setMostrarSetupDrive] = useState(false)
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  useEffect(() => { loadResumo(); loadBackupsAuto() }, [])

  const loadBackupsAuto = async () => {
    setLoadingAuto(true)
    setErroAuto('')
    try {
      const headers = await apiHeaders()
      const res = await fetch('/api/admin/backup/automaticos', { headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBackupsAuto(data.backups || [])
    } catch (err: any) {
      setErroAuto(err.message || 'Erro ao carregar backups automáticos')
    } finally {
      setLoadingAuto(false)
    }
  }

  const loadResumo = async () => {
    setLoading(true)
    setErro('')
    try {
      const headers = await apiHeaders()
      const res = await fetch('/api/admin/backup/resumo', { headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setContagens(data.contagens || {})
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar resumo do banco')
    } finally {
      setLoading(false)
    }
  }

  const baixarBackup = async () => {
    setBaixando(true)
    setErroBackup('')
    try {
      const headers = await apiHeaders()
      const res = await fetch('/api/admin/backup', { headers })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao gerar backup')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dataHora = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      a.href = url
      a.download = `backup-siqueira-crm-${dataHora}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setErroBackup(err.message || 'Erro ao baixar backup')
    } finally {
      setBaixando(false)
    }
  }

  const totalRegistros = Object.values(contagens).reduce((acc: number, v) => acc + (v || 0), 0)

  const getGoogleToken = (): Promise<string> =>
    new Promise((resolve, reject) => {
      if (!googleClientId) { reject(new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID não configurado.')); return }
      const initClient = () => {
        const tc = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'https://www.googleapis.com/auth/drive.file',
          callback: (r: any) => r.error ? reject(new Error(r.error_description || r.error)) : resolve(r.access_token),
          error_callback: (e: any) => reject(new Error(e.message || 'Autorização cancelada ou negada')),
        })
        tc.requestAccessToken({ prompt: '' })
      }
      if ((window as any).google?.accounts?.oauth2) { initClient(); return }
      const s = document.createElement('script')
      s.src = 'https://accounts.google.com/gsi/client'
      s.onload = initClient
      s.onerror = () => reject(new Error('Falha ao carregar o SDK do Google'))
      document.head.appendChild(s)
    })

  const salvarNoDrive = async () => {
    setGdrive('gerando')
    setErroGdrive('')
    setUrlGdrive('')
    try {
      // 1. Gera o backup
      const headers = await apiHeaders()
      const res = await fetch('/api/admin/backup', { headers })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Erro ao gerar backup')
      }
      const blob = await res.blob()
      const dataHora = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const fileName = `backup-siqueira-crm-${dataHora}.json`

      // 2. Autoriza com Google (abre popup)
      setGdrive('autorizando')
      const token = await getGoogleToken()

      // 3. Envia para o Drive via multipart upload
      setGdrive('enviando')
      const form = new FormData()
      form.append('metadata', new Blob([JSON.stringify({ name: fileName, mimeType: 'application/json', parents: ['1LKGdiX5txHRAtiocusVGE66U_dXWnegm'] })], { type: 'application/json' }))
      form.append('file', blob)

      const up = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
      )
      if (!up.ok) {
        const err = await up.json()
        throw new Error(err.error?.message || 'Erro ao enviar para o Google Drive')
      }
      const driveFile = await up.json()
      setUrlGdrive(driveFile.webViewLink || '')
      setGdrive('ok')
    } catch (err: any) {
      setErroGdrive(err.message || 'Erro ao salvar no Google Drive')
      setGdrive('erro')
    }
  }

  const selecionarArquivo = (file: File | null) => {
    setErroArquivo('')
    setBackup(null)
    setTabelaEscolhida('')
    setResultadoRestaurar(null)
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string)
        if (!json?.tabelas || typeof json.tabelas !== 'object') {
          throw new Error('Este arquivo não parece ser um backup válido do Siqueira CRM.')
        }
        setBackup({ nomeArquivo: file.name, geradoEm: json.gerado_em, tabelas: json.tabelas })
      } catch (err: any) {
        setErroArquivo(err.message || 'Erro ao ler o arquivo. Verifique se é um backup .json válido.')
      }
    }
    reader.onerror = () => setErroArquivo('Erro ao ler o arquivo.')
    reader.readAsText(file)
  }

  const tabelasDoBackup = backup
    ? Object.keys(backup.tabelas).filter(t => isTabelaRestauravel(t) && Array.isArray(backup.tabelas[t]))
    : []

  const registrosNoBackup = tabelaEscolhida ? (backup?.tabelas[tabelaEscolhida]?.length ?? 0) : 0
  const registrosAtuais = tabelaEscolhida ? (contagens[tabelaEscolhida] ?? 0) : 0

  const confirmarRestauracao = () => {
    setErroRestaurar('')
    setTextoConfirmacao('')
    setConfirmando(true)
  }

  const executarRestauracao = async () => {
    if (!backup || !tabelaEscolhida) return
    setRestaurando(true)
    setErroRestaurar('')
    try {
      const headers = await apiHeaders()
      const res = await fetch('/api/admin/backup/restore', {
        method: 'POST',
        headers,
        body: JSON.stringify({ tabela: tabelaEscolhida, dados: backup.tabelas[tabelaEscolhida] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setConfirmando(false)
      setResultadoRestaurar({ tabela: tabelaEscolhida, registros: data.registros })
      loadResumo()
    } catch (err: any) {
      setErroRestaurar(err.message || 'Erro ao restaurar')
    } finally {
      setRestaurando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Database size={18} className="text-indigo-600" />
          Gerenciador de Sistema
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">Visão geral do banco de dados, backup e restauração manual.</p>
      </div>

      {/* Dashboard de resumos */}
      {loading ? (
        <div className="card flex items-center justify-center py-10 gap-3 text-slate-400">
          <Loader2 size={20} className="animate-spin" /> Carregando dashboard...
        </div>
      ) : erro ? (
        <div className="card flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {erro}
        </div>
      ) : (
        <TabSistemaDashboard contagens={contagens} />
      )}

      {/* Backup */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-medium text-slate-700">Backup manual</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-lg">
              Gera um arquivo .json com todos os dados do sistema ({totalRegistros} registros no total).
              Guarde em local seguro — o arquivo não deve ser compartilhado, pois contém dados pessoais de clientes.
            </p>
          </div>
          <button onClick={baixarBackup} disabled={baixando} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            {baixando ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {baixando ? 'Gerando...' : 'Baixar backup'}
          </button>
        </div>
        {erroBackup && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mt-4">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {erroBackup}
          </div>
        )}
      </div>

      {/* Google Drive */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-medium text-slate-700 flex items-center gap-2">
              <Cloud size={16} className="text-blue-500" /> Salvar backup no Google Drive
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-lg">
              Gera o backup e envia automaticamente para o seu Google Drive. Uma janela do Google abrirá pedindo autorização — o arquivo ficará visível só para você.
            </p>
          </div>
          {googleClientId ? (
            <button
              onClick={salvarNoDrive}
              disabled={gdrive === 'gerando' || gdrive === 'autorizando' || gdrive === 'enviando'}
              className="flex items-center gap-2 whitespace-nowrap bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm"
            >
              {gdrive === 'gerando' || gdrive === 'autorizando' || gdrive === 'enviando' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {gdrive === 'gerando' ? 'Gerando backup...' : gdrive === 'autorizando' ? 'Aguardando autorização...' : 'Enviando...'}
                </>
              ) : (
                <><Cloud size={16} /> Salvar no Drive</>
              )}
            </button>
          ) : (
            <button
              onClick={() => setMostrarSetupDrive(v => !v)}
              className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl hover:bg-amber-100 transition-colors"
            >
              <AlertCircle size={13} /> Configuração necessária
              {mostrarSetupDrive ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>

        {/* Instruções de setup */}
        {!googleClientId && mostrarSetupDrive && (
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 space-y-2">
            <p className="font-medium text-slate-800">Para ativar, siga estes passos:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
              <li>Acesse <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink size={11} /></a> e crie um projeto.</li>
              <li>Ative a <strong>Google Drive API</strong> (APIs e Serviços → Biblioteca).</li>
              <li>Em <strong>Credenciais</strong>, crie uma credencial do tipo <em>ID do cliente OAuth 2.0</em> → <em>Aplicativo Web</em>.</li>
              <li>Em <em>Origens JavaScript autorizadas</em>, adicione o domínio do Vercel (ex: <code className="bg-slate-200 px-1 rounded">https://seu-app.vercel.app</code>) e <code className="bg-slate-200 px-1 rounded">http://localhost:3000</code> para desenvolvimento.</li>
              <li>Copie o <strong>ID do cliente</strong> gerado.</li>
              <li>No painel do Vercel, vá em <em>Settings → Environment Variables</em> e adicione:<br />
                <code className="bg-slate-200 px-1 rounded font-mono">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> = seu ID do cliente
              </li>
              <li>Faça um novo deploy para a variável entrar em vigor.</li>
            </ol>
          </div>
        )}

        {gdrive === 'ok' && (
          <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 mt-4">
            <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>
              Backup salvo no Google Drive com sucesso!{' '}
              {urlGdrive && (
                <a href={urlGdrive} target="_blank" rel="noopener noreferrer" className="underline font-medium inline-flex items-center gap-1">
                  Abrir arquivo <ExternalLink size={12} />
                </a>
              )}
            </span>
          </div>
        )}
        {gdrive === 'erro' && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mt-4">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {erroGdrive}
          </div>
        )}
      </div>

      {/* Backups automáticos */}
      <div className="card">
        <h3 className="font-medium text-slate-700 flex items-center gap-2">
          <Clock size={16} className="text-indigo-600" /> Backups automáticos
        </h3>
        <p className="text-sm text-slate-500 mt-1 max-w-lg">
          Toda segunda-feira às 03h um backup completo é gerado e guardado automaticamente, sem precisar de ninguém clicar em nada.
          Os links abaixo expiram em 10 minutos por segurança.
        </p>

        {loadingAuto ? (
          <div className="flex items-center justify-center py-8 gap-3 text-slate-400">
            <Loader2 size={18} className="animate-spin" /> Carregando...
          </div>
        ) : erroAuto ? (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mt-4">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {erroAuto}
          </div>
        ) : backupsAuto.length === 0 ? (
          <p className="text-sm text-slate-400 mt-4">Nenhum backup automático gerado ainda — o primeiro será criado na próxima segunda-feira.</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {backupsAuto.map(b => (
              <div key={b.nome} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <FileJson size={14} className="text-slate-400" />
                  {b.nome}
                  <span className="text-xs text-slate-400">
                    {b.criado_em && new Date(b.criado_em).toLocaleString('pt-BR')}
                  </span>
                </div>
                {b.url ? (
                  <a href={b.url} className="text-indigo-600 hover:underline text-xs font-medium flex items-center gap-1">
                    <Download size={13} /> Baixar
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">Link indisponível</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restauração */}
      <div className="card">
        <h3 className="font-medium text-slate-700">Restaurar a partir de um backup</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-lg">
          Envie um arquivo .json gerado pelo botão acima. A restauração é por tabela e nunca apaga dados —
          apenas atualiza os registros que já existem e adiciona os que faltam, usando o ID de cada registro do backup.
        </p>

        <div className="mt-4">
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            onChange={e => selecionarArquivo(e.target.files?.[0] || null)}
            className="input"
          />
        </div>

        {erroArquivo && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mt-4">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {erroArquivo}
          </div>
        )}

        {backup && (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-slate-500">
              Arquivo: <span className="font-medium text-slate-700">{backup.nomeArquivo}</span>
              {backup.geradoEm && <> · gerado em {new Date(backup.geradoEm).toLocaleString('pt-BR')}</>}
            </p>

            <div>
              <label className="label">Qual tabela restaurar?</label>
              <select className="input" value={tabelaEscolhida} onChange={e => { setTabelaEscolhida(e.target.value); setResultadoRestaurar(null) }}>
                <option value="">Selecione...</option>
                {tabelasDoBackup.map(t => (
                  <option key={t} value={t}>{NOME_TABELA[t] || t}</option>
                ))}
              </select>
              {tabelasDoBackup.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">Nenhuma tabela restaurável encontrada neste arquivo.</p>
              )}
            </div>

            {tabelaEscolhida && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-sm rounded-xl px-4 py-3">
                <Info size={15} className="mt-0.5 flex-shrink-0" />
                <span>
                  O backup tem <span className="font-semibold">{registrosNoBackup}</span> registro(s) de {NOME_TABELA[tabelaEscolhida] || tabelaEscolhida}.
                  Atualmente existem <span className="font-semibold">{registrosAtuais}</span> no banco.
                  Nada será apagado — só atualizado/adicionado.
                </span>
              </div>
            )}

            {resultadoRestaurar && (
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
                <CheckCircle size={15} className="mt-0.5 flex-shrink-0" />
                {resultadoRestaurar.registros} registro(s) de {NOME_TABELA[resultadoRestaurar.tabela] || resultadoRestaurar.tabela} restaurado(s) com sucesso.
              </div>
            )}

            <button
              onClick={confirmarRestauracao}
              disabled={!tabelaEscolhida}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <Upload size={15} /> Restaurar esta tabela
            </button>
          </div>
        )}
      </div>

      {/* Segurança */}
      <div className="card">
        <h3 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
          <ShieldCheck size={16} className="text-indigo-600" /> Segurança da conta
        </h3>
        <ul className="text-sm text-slate-600 space-y-2">
          <li>• Apenas <span className="font-medium">duda.siqueira2@gmail.com</span> tem acesso de administrador completo.</li>
          <li>• Bloquear um usuário impede login imediatamente; sessões já abertas expiram em até 1 hora.</li>
          <li>• Toda ação administrativa (criar, editar, excluir, bloquear, restaurar) fica registrada na aba Acessos.</li>
        </ul>
      </div>

      {/* MODAL: CONFIRMAR RESTAURAÇÃO */}
      {confirmando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <RotateCcw size={18} className="text-amber-600" /> Confirmar restauração
              </h2>
              <button onClick={() => setConfirmando(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Você vai restaurar <span className="font-medium text-slate-700">{registrosNoBackup} registro(s)</span> em{' '}
              <span className="font-medium text-slate-700">{NOME_TABELA[tabelaEscolhida] || tabelaEscolhida}</span>.
              Para confirmar, digite o nome da tabela: <span className="font-mono font-semibold">{tabelaEscolhida}</span>
            </p>
            <input
              className="input"
              placeholder={tabelaEscolhida}
              value={textoConfirmacao}
              onChange={e => setTextoConfirmacao(e.target.value)}
            />
            {erroRestaurar && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mt-3">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {erroRestaurar}
              </div>
            )}
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmando(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button
                onClick={executarRestauracao}
                disabled={restaurando || textoConfirmacao !== tabelaEscolhida}
                className="flex-1 justify-center flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm"
              >
                {restaurando && <Loader2 size={14} className="animate-spin" />}
                Restaurar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
