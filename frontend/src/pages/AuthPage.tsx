import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { deriveMasterKey } from '../lib/crypto'
import { useSession } from '../lib/store'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', passphrase: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { setUser, setMasterKey } = useSession()
  const nav = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'register') {
        const user = await api.register(form.name, form.email, form.password, form.confirm)
        setUser(user)
        if (form.passphrase) {
          const mk = await deriveMasterKey(form.passphrase)
          await api.saveMasterKey(mk.salt, mk.verifier)
          setMasterKey(mk.raw)
        }
        nav('/dashboard')
      } else {
        const user = await api.login(form.email, form.password, true)
        setUser(user)
        nav(user.crypto_enabled ? '/unlock' : '/dashboard')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '60px auto' }}>
      <div className="card">
        <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          )}
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          {mode === 'register' && (
            <>
              <input type="password" placeholder="Confirm password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
              <input type="password" placeholder="Encryption passphrase (zero-knowledge)" value={form.passphrase} onChange={(e) => setForm({ ...form, passphrase: e.target.value })} />
              <p className="muted" style={{ fontSize: 12, marginTop: -4 }}>Derives your master key locally. Lost = unrecoverable files.</p>
            </>
          )}
          {error && <div className="error">{error}</div>}
          <button disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <div className="center muted" style={{ marginTop: 14 }}>
          {mode === 'login' ? 'No account?' : 'Have an account?'}{' '}
          <a onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} style={{ cursor: 'pointer' }}>
            {mode === 'login' ? 'Register' : 'Sign in'}
          </a>
        </div>
      </div>
    </div>
  )
}
