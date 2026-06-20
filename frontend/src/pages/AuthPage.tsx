import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { deriveMasterKey } from '../lib/crypto'
import { useSession } from '../lib/store'
import { Icon } from '../components/Icon'

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
        nav('/drive')
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
    <div className="center-card">
      <div className="brand-hero">
        <div className="logo-lg"><Icon name="logo" size={26} /></div>
        <h1>Telegram Storage</h1>
        <p>Your files, your Telegram. Encrypted in the browser.</p>
      </div>
      <div className="card">
        <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          )}
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          {mode === 'register' && (
            <>
              <input type="password" placeholder="Confirm password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
              <div className="divider" />
              <input type="password" placeholder="Encryption passphrase" value={form.passphrase} onChange={(e) => setForm({ ...form, passphrase: e.target.value })} />
              <p className="hint">Derives your master key locally with AES-256. There is no recovery — keep it safe.</p>
            </>
          )}
          {error && <div className="error">{error}</div>}
          <button disabled={busy} style={{ width: '100%', marginTop: 6 }}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <div className="center muted" style={{ marginTop: 16 }}>
          {mode === 'login' ? 'No account yet?' : 'Already registered?'}{' '}
          <a onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} style={{ cursor: 'pointer' }}>
            {mode === 'login' ? 'Register' : 'Sign in'}
          </a>
        </div>
      </div>
    </div>
  )
}
