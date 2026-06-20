import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, http } from '../lib/api'
import { decryptBlob } from '../lib/crypto'
import { DownloadDecryptor } from '../components/DownloadDecryptor'
import { Icon, fileIconName } from '../components/Icon'

export default function SharePage() {
  const { token } = useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['share', token],
    queryFn: () => http.get(`/api/shares/${token}`).then((r) => r.data),
    enabled: !!token,
  })
  const [pass, setPass] = useState('')

  if (isLoading) return <div className="center-card"><div className="card center muted">Loading shared file…</div></div>
  if (!data) return <div className="center-card"><div className="card center"><div className="empty" style={{ padding: 24 }}><div className="empty-ic"><Icon name="alert" size={36} /></div>Share not found.</div></div></div>

  const file = data.file

  return (
    <div className="center-card">
      <div className="brand-hero">
        <div className="logo-lg"><Icon name="link" size={26} /></div>
        <h1>Shared file</h1>
        <p>Someone shared an encrypted file with you.</p>
      </div>
      <div className="card">
        <div className="row" style={{ margin: 0, gap: 12, marginBottom: 16 }}>
          <span className="file-icon" style={{ width: 44, height: 44 }}><Icon name={fileIconName(file.mime_type, file.original_name)} size={22} /></span>
          <div className="col" style={{ gap: 2 }}>
            <span style={{ fontWeight: 700 }}>{file.original_name}</span>
            <span className="muted" style={{ fontSize: 13 }}>{(file.size_bytes / 1024 / 1024).toFixed(1)} MB · encrypted</span>
          </div>
        </div>
        {data.requires_password && (
          <>
            <label>Share password</label>
            <input type="password" placeholder="Password" value={pass} onChange={(e) => setPass(e.target.value)} />
          </>
        )}
        <DownloadDecryptor token={token!} fileName={file.original_name} password={pass} iv={file.encryption_iv} />
      </div>
      <p className="center muted" style={{ fontSize: 12, marginTop: 16 }}>
        This link delivers ciphertext only — you'll need the file's passphrase to decrypt.
      </p>
    </div>
  )
}
