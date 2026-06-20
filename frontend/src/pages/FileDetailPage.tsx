import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, http } from '../lib/api'
import { useSession } from '../lib/store'
import { decryptBlob } from '../lib/crypto'
import { metaFromApi } from '../lib/uploader'
import { Icon, fileIconName } from '../components/Icon'
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
    window.location.href = '/drive'
  }

  if (!file) return <div className="muted">Loading…</div>

  return (
    <div>
      <div className="section-title">
        <div className="row" style={{ margin: 0, gap: 14 }}>
          <span className="file-icon" style={{ width: 44, height: 44 }}><Icon name={fileIconName(file.mime_type, file.original_name)} size={22} /></span>
          <div className="col" style={{ gap: 2 }}>
            <h2 style={{ margin: 0 }}>{file.original_name}</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              {fmtBytes(file.size_bytes)} · {file.total_chunks} chunks · stored on Telegram
            </span>
          </div>
        </div>
        <span className={`tag ${file.status === 'complete' ? 'active' : file.status === 'failed' ? 'failed' : 'pending'}`}>
          <span className={`dot ${file.status === 'complete' ? 'active' : file.status === 'failed' ? 'failed' : 'pending'}`} />
          {file.status}
        </span>
      </div>

      <div className="card">
        {file.failure_reason && <div className="error" style={{ marginBottom: 12 }}>{file.failure_reason}</div>}
        <div className="spread">
          <div className="muted" style={{ fontSize: 13, maxWidth: 480 }}>
            Downloads stream the ciphertext from your Telegram channel and decrypt it locally in the browser.
          </div>
          <div className="row">
            <button className="primary" disabled={file.status !== 'complete' || !!busy} onClick={download}>
              {busy ? <>{busy}</> : <><Icon name="download" size={16} /> Download & decrypt</>}
            </button>
            <button className="ghost" disabled={file.status !== 'complete'} onClick={() => setShareOpen(true)}><Icon name="share" size={16} /> Share</button>
            <button className="danger" onClick={remove}><Icon name="trash" size={16} /> Delete</button>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
      </div>

      {shareOpen && <ShareModal fileId={file.id} onClose={() => setShareOpen(false)} shares={file.shares} />}
    </div>
  )
}
