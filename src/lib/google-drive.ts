// Integração server-side com Google Drive via Service Account (sem popup OAuth).
// Usada pelo cron automático e pelo botão manual na aba Sistema.
//
// Variáveis de ambiente necessárias:
//   GOOGLE_SERVICE_ACCOUNT_KEY  — conteúdo completo do JSON da service account (uma linha)
//   GOOGLE_DRIVE_FOLDER_ID      — ID da pasta de destino no Drive
//
// A pasta do Drive deve ser compartilhada com o e-mail da service account
// (campo "client_email" no JSON) com permissão de Editor.

import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase-admin'
import { TABELAS_BACKUP as TABELAS } from '@/lib/backup-tabelas'

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1LKGdiX5txHRAtiocusVGE66U_dXWnegm'

// Gera um JWT assinado e troca por um access token do Google
async function getServiceAccountToken(): Promise<string> {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY não configurado')

  const key = JSON.parse(keyJson)
  const now = Math.floor(Date.now() / 1000)

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const claim  = Buffer.from(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url')

  const signingInput = `${header}.${claim}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(signingInput)
  const signature = signer.sign(key.private_key, 'base64url')

  const jwt = `${signingInput}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error_description || 'Erro ao autenticar service account Google')
  }

  const data = await res.json()
  return data.access_token
}

// Gera o backup completo e faz upload para a pasta do Drive
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
    gerado_em: new Date().toISOString(),
    gerado_por: 'cron-automatico',
    tabelas: resultado,
    ...(Object.keys(erros).length > 0 ? { erros } : {}),
  }, null, 2)

  const dataHora = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const fileName = `backup-siqueira-crm-${dataHora}.json`

  // 2. Autentica service account
  const token = await getServiceAccountToken()

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
