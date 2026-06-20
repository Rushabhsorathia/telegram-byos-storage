import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { http } from '../lib/api'
import { unlockMasterKey } from '../lib/crypto'
import { useSession } from '../lib/store'

export default function CryptoUnlockPage() {
  const { user, setMasterKey } = useSession()
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()

  const { data: setup } = useQuery({
    queryKey: ['crypto-setup'],
    queryFn: () => http.get('/api/crypto/setup').then((r) => r.data),
    enabled: !!user,
  })

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (!setup?.master_key_salt || !setup?.master_key_verifier) {
        setMasterKey(null)
        nav('/dashboard')
        return
      }
      const key = await unlockMasterKey(pass, setup.master_key_salt, setup.master_key_verifier)
      setMasterKey(key)
      nav('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Could not unlock')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '60px auto' }}>
      <div className="card">
        <h2>Unlock your vault</h2>
        <p className="muted">Enter your encryption passphrase to decrypt file keys in this session.</p>
        <form onSubmit={unlock}>
          <input type="password" placeholder="Passphrase" value={pass} onChange={(e) => setPass(e.target.value)} autoFocus />
          {error && <div className="error">{error}</div>}
          <div className="row">
            <button disabled={busy}>{busy ? 'Unlocking…' : 'Unlock'}</button>
            <button type="button" className="ghost" onClick={() => { setMasterKey(null); nav('/dashboard') }}>Skip (view-only)</button>
          </div>
        </form>
      </div>
    </div>
  )
}
