import { useState } from 'react'
import { api } from '../lib/api'
import type { Share } from '../lib/types'

export function ShareModal({ fileId, shares, onClose }: { fileId: number; shares?: Share[]; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [maxDownloads, setMaxDownloads] = useState('')
  const [created, setCreated] = useState<Share | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const create = async () => {
    setBusy(true)
    setError('')
    try {
      const share = await api.createShare(fileId, {
        password: password || undefined,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        max_downloads: maxDownloads ? Number(maxDownloads) : undefined,
      })
      setCreated(share)
    } catch (e: any) {
      setError(e.response?.data?.message || e.message)
    } finally {
      setBusy(false)
    }
  }

  const link = created ? `${window.location.origin}/s/${created.token}` : ''

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div className="card" style={{ width: 460, maxWidth: '90vw' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Share file</h2>
          <button className="ghost" onClick={onClose}>✕</button>
        </div>

        {!created ? (
          <>
            <input type="password" placeholder="Optional password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <label className="muted" style={{ fontSize: 12 }}>Expires at</label>
            <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            <label className="muted" style={{ fontSize: 12 }}>Max downloads</label>
            <input type="number" placeholder="Unlimited" value={maxDownloads} onChange={(e) => setMaxDownloads(e.target.value)} />
            {error && <div className="error">{error}</div>}
            <button disabled={busy} onClick={create}>{busy ? 'Creating…' : 'Create link'}</button>
          </>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 13 }}>Anyone with this link can download the (still-encrypted) file. Recipients need the passphrase to decrypt.</p>
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
            <div className="row">
              <button onClick={() => navigator.clipboard.writeText(link)}>Copy</button>
              <a href={link} target="_blank" rel="noreferrer"><button className="ghost">Open</button></a>
            </div>
          </>
        )}

        {shares && shares.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Active shares</div>
            {shares.map((s) => (
              <div key={s.id} className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                /s/{s.token.slice(0, 10)}… · {s.download_count}/{s.max_downloads ?? '∞'} downloads
                {s.expires_at && ` · expires ${new Date(s.expires_at).toLocaleDateString()}`}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
