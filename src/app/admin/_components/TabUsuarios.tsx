'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Users, Plus, Pencil, Trash2, RotateCcw,
  Loader2, AlertCircle, Crown, Mail, CheckCircle, Lock, Unlock, History,
} from 'lucide-react'

const supabase = createClient()
const FIXED_ADMIN = 'duda.siqueira2@gmail.com'

interface User {
  id: string
  email: string
  nome: string
  role: string
  telefone: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  bloqueado: boolean
}

type Modal =
  | { type: 'create' }
  | { type: 'edit'; user: User }
  | { type: 'delete'; user: User }
  | { type: 'bloquear'; user: User; bloquear: boolean }
  | { type: 'success'; message: string; detail?: string }
  | null

async function apiHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token || ''}`,
  }
}

export default function TabUsuarios({ onVerAcessos }: { onVerAcessos: (userId: string, nome: string) => void }) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Modal>(null)
  const [saving, setSaving] = useState(false)
  const [erroModal, setErroModal] = useState('')
  const [erroLista, setErroLista] = useState('')

  const [createForm, setCreateForm] = useState({ email: '', nome: '', telefone: '', role: 'corretor' })
  const [editForm, setEditForm] = useState({ nome: '', telefone: '', role: 'corretor' })

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setLoading(true)
    setErroLista('')
    try {
      const headers = await apiHeaders()
      const res = await fetch('/api/admin/users', { headers })
      const data = await res.json()
      if (!res.ok) {
        setErroLista(data.error || `Erro ${res.status} ao carregar usuários`)
      } else {
        setUsers(data.users || [])
      }
    } catch (err: any) {
      setErroLista('Falha de conexão com a API. Verifique o servidor.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErroModal('')
    try {
      const headers = await apiHeaders()
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers,
        body: JSON.stringify(createForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setModal({
        type: 'success',
        message: 'Usuário criado com sucesso!',
        detail: `Um e-mail com link de acesso foi enviado para ${createForm.email}.`,
      })
      setCreateForm({ email: '', nome: '', telefone: '', role: 'corretor' })
      loadUsers()
    } catch (err: any) {
      setErroModal(err.message || 'Erro ao criar usuário')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (modal?.type !== 'edit') return
    setSaving(true)
    setErroModal('')
    try {
      const headers = await apiHeaders()
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: modal.user.id, ...editForm }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setModal(null)
      loadUsers()
    } catch (err: any) {
      setErroModal(err.message || 'Erro ao editar usuário')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async (userId: string, email: string) => {
    setSaving(true)
    try {
      const headers = await apiHeaders()
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: userId, reset_password: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setModal({
        type: 'success',
        message: 'E-mail de redefinição enviado!',
        detail: `Um link para redefinir a senha foi enviado para ${email}.`,
      })
    } catch (err: any) {
      alert(err.message || 'Erro ao redefinir senha')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (modal?.type !== 'delete') return
    setSaving(true)
    try {
      const headers = await apiHeaders()
      const res = await fetch(`/api/admin/users?id=${modal.user.id}`, { method: 'DELETE', headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setModal(null)
      loadUsers()
    } catch (err: any) {
      setErroModal(err.message || 'Erro ao excluir usuário')
    } finally {
      setSaving(false)
    }
  }

  const handleBloquear = async () => {
    if (modal?.type !== 'bloquear') return
    setSaving(true)
    setErroModal('')
    try {
      const headers = await apiHeaders()
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: modal.user.id, bloquear: modal.bloquear }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setModal(null)
      loadUsers()
    } catch (err: any) {
      setErroModal(err.message || 'Erro ao alterar bloqueio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-800">Usuários do CRM</h2>
          <p className="text-sm text-slate-500 mt-0.5">Crie, edite, bloqueie e gerencie os acessos da equipe.</p>
        </div>
        <button
          onClick={() => { setErroModal(''); setModal({ type: 'create' }) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Novo Usuário
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
            Carregando usuários...
          </div>
        ) : erroLista ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <AlertCircle size={36} className="text-red-400" />
            <div>
              <p className="font-semibold text-slate-700">Erro ao carregar usuários</p>
              <p className="text-sm text-red-600 mt-1 max-w-md">{erroLista}</p>
            </div>
            <button onClick={loadUsers} className="btn-secondary flex items-center gap-2">
              <RotateCcw size={15} /> Tentar novamente
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Nome', 'E-mail', 'WhatsApp', 'Perfil', 'Status', 'Último acesso', 'Ações'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isFixed = u.email === FIXED_ADMIN
                  return (
                    <tr key={u.id} className={`border-b border-slate-50 hover:bg-slate-50 ${u.bloqueado ? 'bg-red-50/40' : ''}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {isFixed && <Crown size={14} className="text-amber-500 flex-shrink-0" aria-label="Administrador fixo" />}
                          <span className="font-medium text-slate-800">{u.nome || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{u.email}</td>
                      <td className="py-3 px-4 text-slate-500">{u.telefone || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {u.role === 'admin' ? 'Admin' : 'Corretor'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.bloqueado ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {u.bloqueado ? 'Bloqueado' : 'Ativo'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {u.last_sign_in_at
                          ? new Date(u.last_sign_in_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                          : 'Nunca'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button title="Ver histórico de acessos"
                            onClick={() => onVerAcessos(u.id, u.nome || u.email)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
                            <History size={15} />
                          </button>
                          <button title="Editar"
                            onClick={() => { setErroModal(''); setEditForm({ nome: u.nome, telefone: u.telefone, role: u.role }); setModal({ type: 'edit', user: u }) }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
                            <Pencil size={15} />
                          </button>
                          <button title="Reenviar e-mail de acesso"
                            onClick={() => handleResetPassword(u.id, u.email)}
                            disabled={saving}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors">
                            <Mail size={15} />
                          </button>
                          {!isFixed && (
                            <button title={u.bloqueado ? 'Desbloquear acesso' : 'Bloquear acesso'}
                              onClick={() => { setErroModal(''); setModal({ type: 'bloquear', user: u, bloquear: !u.bloqueado }) }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                u.bloqueado ? 'hover:bg-green-50 text-slate-500 hover:text-green-600' : 'hover:bg-amber-50 text-slate-500 hover:text-amber-600'
                              }`}>
                              {u.bloqueado ? <Unlock size={15} /> : <Lock size={15} />}
                            </button>
                          )}
                          {!isFixed && (
                            <button title="Excluir"
                              onClick={() => { setErroModal(''); setModal({ type: 'delete', user: u }) }}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Users size={36} className="mx-auto mb-3 opacity-40" />
                <p>Nenhum usuário encontrado</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: CRIAR */}
      {modal?.type === 'create' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Novo Usuário</h2>
              <button onClick={() => setModal(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {erroModal && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {erroModal}
                </div>
              )}
              <div>
                <label className="label">Nome completo *</label>
                <input className="input" value={createForm.nome}
                  onChange={e => setCreateForm(p => ({ ...p, nome: e.target.value }))} required />
              </div>
              <div>
                <label className="label">E-mail *</label>
                <input className="input" type="email" value={createForm.email}
                  onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} required />
              </div>
              <div>
                <label className="label">WhatsApp</label>
                <input className="input" type="tel" placeholder="(11) 99999-0000" value={createForm.telefone}
                  onChange={e => setCreateForm(p => ({ ...p, telefone: e.target.value }))} />
              </div>
              <div>
                <label className="label">Perfil</label>
                <select className="input" value={createForm.role}
                  onChange={e => setCreateForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="corretor">Corretor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <p className="text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex items-start gap-2">
                <Mail size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />
                Um e-mail com link de acesso será enviado automaticamente para o usuário.
              </p>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center gap-2">
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  Criar e Enviar Convite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR */}
      {modal?.type === 'edit' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Editar Usuário</h2>
              <button onClick={() => setModal(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">✕</button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              {erroModal && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {erroModal}
                </div>
              )}
              <div>
                <label className="label">Nome completo</label>
                <input className="input" value={editForm.nome}
                  onChange={e => setEditForm(p => ({ ...p, nome: e.target.value }))} />
              </div>
              <div>
                <label className="label">E-mail</label>
                <input className="input bg-slate-50 text-slate-400 cursor-not-allowed" value={modal.user.email} disabled />
                <p className="text-xs text-slate-400 mt-1">O e-mail não pode ser alterado</p>
              </div>
              <div>
                <label className="label">WhatsApp</label>
                <input className="input" type="tel" placeholder="(11) 99999-0000" value={editForm.telefone}
                  onChange={e => setEditForm(p => ({ ...p, telefone: e.target.value }))} />
              </div>
              {modal.user.email !== FIXED_ADMIN && (
                <div>
                  <label className="label">Perfil</label>
                  <select className="input" value={editForm.role}
                    onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}>
                    <option value="corretor">Corretor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center gap-2">
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUIR */}
      {modal?.type === 'delete' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={22} className="text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Excluir usuário?</h2>
              <p className="text-slate-500 text-sm mt-2">
                <span className="font-medium text-slate-700">{modal.user.nome || modal.user.email}</span> perderá
                todo o acesso ao sistema. Esta ação não pode ser desfeita.
              </p>
              {erroModal && <p className="mt-3 text-sm text-red-600">{erroModal}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={handleDelete} disabled={saving}
                className="flex-1 justify-center flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm disabled:opacity-60">
                {saving && <Loader2 size={14} className="animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BLOQUEAR / DESBLOQUEAR */}
      {modal?.type === 'bloquear' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${modal.bloquear ? 'bg-amber-100' : 'bg-green-100'}`}>
                {modal.bloquear ? <Lock size={22} className="text-amber-600" /> : <Unlock size={22} className="text-green-600" />}
              </div>
              <h2 className="text-lg font-semibold text-slate-800">
                {modal.bloquear ? 'Bloquear usuário?' : 'Desbloquear usuário?'}
              </h2>
              <p className="text-slate-500 text-sm mt-2">
                {modal.bloquear ? (
                  <>
                    <span className="font-medium text-slate-700">{modal.user.nome || modal.user.email}</span> não conseguirá
                    mais entrar no sistema. Sessões já abertas continuam válidas por até 1 hora, até expirarem.
                  </>
                ) : (
                  <>
                    <span className="font-medium text-slate-700">{modal.user.nome || modal.user.email}</span> poderá
                    fazer login normalmente novamente.
                  </>
                )}
              </p>
              {erroModal && <p className="mt-3 text-sm text-red-600">{erroModal}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={handleBloquear} disabled={saving}
                className={`flex-1 justify-center flex items-center gap-2 text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm disabled:opacity-60 ${
                  modal.bloquear ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'
                }`}>
                {saving && <Loader2 size={14} className="animate-spin" />}
                {modal.bloquear ? 'Bloquear' : 'Desbloquear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUCESSO */}
      {modal?.type === 'success' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-800">{modal.message}</h2>
            {modal.detail && <p className="text-slate-500 text-sm mt-2">{modal.detail}</p>}
            <button onClick={() => setModal(null)} className="btn-primary w-full justify-center mt-6">
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
