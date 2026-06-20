import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, http } from '../lib/api'
import { useSession } from '../lib/store'
import { decryptBlob } from '../lib/crypto'
import { metaFromApi } from '../lib/uploader'
import { ShareModal } from '../components/ShareModal'

function fmtBytes(n: number) {
  if (!n) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(n) / Math.log(1024))
  return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`
}

export default function FileDetailPage() {
  const { id } = useParams()
  const fileId = Number(id)
  const { crypto } = useSession()
  const qc = useQueryClient()
  const { data: file } = useQuery({ queryKey: ['file', fileId], queryFn: () => api.getFile(fileId) })
  const [shareOpen, setShareOpen] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const download = async () => {
    if (!file) return
    setBusy('Downloading')
    setError('')
    try {
      const res = await http.get(api.downloadUrl(file.id), { responseType: 'blob' })
      setBusy('Decrypting')
      const meta = metaFromApi(file)
      const decrypted = await decryptBlob(res.data, meta!, crypto.masterKey ?? undefined, file.original_name)
      const url = URL.createObjectURL(decrypted)
      const a = document.createElement('a')
      a.href = url
      a.download = file.original_name
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e.message || 'Download failed')
    } finally {
      setBusy('')
    }
  }

  const remove = async () => {
    if (!confirm('Delete this file and all its Telegram chunks?')) return
    await api.deleteFile(file.id)
    qc.invalidateQueries({ queryKey: ['files'] })
    window.location.href = '/dashboard'
  }

  if (!file) return <div className="muted">Loading…</div>

  return (
    <div>
      <h2>{file.original_name}</h2>
      <div className="card">
        <div className="muted" style={{ fontSize: 13 }}>
          {fmtBytes(file.size_bytes)} · {file.status} · {file.total_chunks} chunks
          {file.failure_reason && <div className="error">{file.failure_reason}</div>}
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <button disabled={file.status !== 'complete' || !!busy} onClick={download}>
            {busy || 'Download & decrypt'}
          </button>
          <button className="ghost" disabled={file.status !== 'complete'} onClick={() => setShareOpen(true)}>Share</button>
          <button className="danger" onClick={remove}>Delete</button>
        </div>
        {error && <div className="error">{error}</div>}
      </div>

      {shareOpen && <ShareModal fileId={file.id} onClose={() => setShareOpen(false)} shares={file.shares} />}
    </div>
  )
}
