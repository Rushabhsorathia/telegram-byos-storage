import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { http } from '../lib/api'
import { unlockMasterKey } from '../lib/crypto'
import { useSession } from '../lib/store'
import { Icon } from '../components/Icon'

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
        nav('/drive')
        return
      }
      const key = await unlockMasterKey(pass, setup.master_key_salt, setup.master_key_verifier)
      setMasterKey(key)
      nav('/drive')
    } catch (err: any) {
      setError(err.message || 'Could not unlock')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center-card">
      <div className="brand-hero">
        <div className="logo-lg"><Icon name="key" size={26} /></div>
        <h1>Unlock your vault</h1>
        <p>Enter your passphrase to decrypt file keys for this session.</p>
      </div>
      <div className="card">
        <form onSubmit={unlock}>
          <input type="password" placeholder="Passphrase" value={pass} onChange={(e) => setPass(e.target.value)} autoFocus />
          {error && <div className="error">{error}</div>}
          <div className="row" style={{ marginTop: 4 }}>
            <button disabled={busy}>{busy ? 'Unlocking…' : 'Unlock'}</button>
            <button type="button" className="ghost" onClick={() => { setMasterKey(null); nav('/drive') }}>Skip (view-only)</button>
          </div>
        </form>
      </div>
    </div>
  )
}
