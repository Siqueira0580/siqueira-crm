// Integração server-side com Google Drive via OAuth2 Refresh Token.
// Não usa Service Account — usa a sua própria conta Google.
//
// Variáveis de ambiente necessárias (Vercel → Settings → Environment Variables):
//   GOOGLE_CLIENT_ID      — ID do cliente OAuth (do Google Cloud Console)
//   GOOGLE_CLIENT_SECRET  — Segredo do cliente OAuth (do Google Cloud Console)
//   GOOGLE_REFRESH_TOKEN  — Refresh token obtido uma única vez via OAuth Playground
//
// Como obter o refresh token: veja instruções em /api/admin/google-drive-setup

import { createAdminClient } from '@/lib/supabase-admin'
import { TABELAS_BACKUP as TABELAS } from '@/lib/backup-tabelas'

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1LKGdiX5txHRAtiocusVGE66U_dXWnegm'

async function getAccessToken(): Promise<string> {
  const clientId     = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REFRESH_TOKEN no Vercel.'
    )
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error_description || 'Erro ao renovar token Google')
  }

  const data = await res.json()
  return data.access_token
}

export async function uploadBackupToDrive(): Promise<{ fileName: string; webViewLink: string }> {
  // 1. Gera o JSON de backup
  const admin = createAdminClient()
  const resultado: Record<string, any> = {}
  const erros: Record<string, string> = {}

  for (const tabela of TABELAS) {
    const { data, error } = await admin.from(tabela).select('*')
    if (error) erros[tabela] = error.message
    else resultado[tabela] = data
  }

  const payload = JSON.stringify({
    gerado_em:  new Date().toISOString(),
    gerado_por: 'cron-automatico',
    tabelas:    resultado,
    ...(Object.keys(erros).length > 0 ? { erros } : {}),
  }, null, 2)

  const dataHora  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const fileName  = `backup-siqueira-crm-${dataHora}.json`

  // 2. Obtém access token via refresh token
  const token = await getAccessToken()

  // 3. Upload multipart para o Drive
  const form = new FormData()
  form.append(
    'metadata',
    new Blob([JSON.stringify({ name: fileName, mimeType: 'application/json', parents: [FOLDER_ID] })], { type: 'application/json' })
  )
  form.append('file', new Blob([payload], { type: 'application/json' }))

  const up = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
  )

  if (!up.ok) {
    const err = await up.json()
    throw new Error(err.error?.message || 'Erro ao enviar para o Google Drive')
  }

  const driveFile = await up.json()
  return { fileName, webViewLink: driveFile.webViewLink || '' }
}
