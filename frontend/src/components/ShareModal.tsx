import { useState } from 'react'
import { api } from '../lib/api'
import type { Share } from '../lib/types'
import { Icon } from './Icon'

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
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="spread" style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>Share file</h2>
          <button className="ghost" style={{ padding: 8, width: 34 }} onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        {!created ? (
          <>
            <label>Optional password</label>
            <input type="password" placeholder="No password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <label>Expires at</label>
            <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            <label>Max downloads</label>
            <input type="number" placeholder="Unlimited" value={maxDownloads} onChange={(e) => setMaxDownloads(e.target.value)} />
            {error && <div className="error">{error}</div>}
            <button disabled={busy} onClick={create} style={{ width: '100%' }}>{busy ? 'Creating…' : <><Icon name="link" size={16} /> Create share link</>}</button>
          </>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 13 }}>Anyone with this link can download the (still-encrypted) file. Recipients need the passphrase to decrypt.</p>
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
            <div className="row">
              <button onClick={() => navigator.clipboard.writeText(link)}><Icon name="check" size={16} /> Copy link</button>
              <a href={link} target="_blank" rel="noreferrer"><button className="ghost"><Icon name="open" size={16} /> Open</button></a>
            </div>
          </>
        )}

        {shares && shares.length > 0 && (
          <>
            <div className="divider" />
            <label>Active shares</label>
            <div className="stack">
              {shares.map((s) => (
                <div key={s.id} className="row" style={{ justifyContent: 'space-between', background: 'var(--surface-2)', padding: '8px 12px', borderRadius: 10 }}>
                  <span className="mono" style={{ fontSize: 12 }}>/{s.token.slice(0, 14)}…</span>
                  <span className="muted" style={{ fontSize: 12 }}>{s.download_count}/{s.max_downloads ?? '∞'} downloads</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
