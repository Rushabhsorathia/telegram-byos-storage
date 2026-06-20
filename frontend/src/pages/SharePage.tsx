import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, http } from '../lib/api'
import { decryptBlob } from '../lib/crypto'
import { DownloadDecryptor } from '../components/DownloadDecryptor'

export default function SharePage() {
  const { token } = useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['share', token],
    queryFn: () => http.get(`/api/shares/${token}`).then((r) => r.data),
    enabled: !!token,
  })
  const [pass, setPass] = useState('')

  if (isLoading) return <div className="muted center" style={{ marginTop: 60 }}>Loading shared file…</div>
  if (!data) return <div className="muted center" style={{ marginTop: 60 }}>Share not found.</div>

  const file = data.file

  return (
    <div style={{ maxWidth: 520, margin: '60px auto' }}>
      <div className="card">
        <h2>{file.original_name}</h2>
        <p className="muted">{(file.size_bytes / 1024 / 1024).toFixed(1)} MB · encrypted</p>
        {data.requires_password && (
          <input type="password" placeholder="Share password" value={pass} onChange={(e) => setPass(e.target.value)} />
        )}
        <DownloadDecryptor token={token!} fileName={file.original_name} password={pass} iv={file.encryption_iv} />
      </div>
      <p className="muted center" style={{ fontSize: 12, marginTop: 16 }}>
        Recipients need the file's encryption key/passphrase to decrypt. This link delivers ciphertext only.
      </p>
    </div>
  )
}
