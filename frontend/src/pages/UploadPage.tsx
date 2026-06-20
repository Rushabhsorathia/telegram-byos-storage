import { useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { startEncryptedUpload, type UploadHandle } from '../lib/uploader'
import { useSession } from '../lib/store'
import { StorageConnectionCard } from '../components/StorageConnectionCard'
import { Icon } from '../components/Icon'

interface ActiveUpload {
  name: string
  percent: number
  message: string
  fileId?: number
  error?: string
}

function fmtBytes(n: number) {
  if (!n) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(n) / Math.log(1024))
  return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`
}

export default function UploadPage() {
  const { crypto } = useSession()
  const { data: connData } = useQuery({ queryKey: ['connections'], queryFn: api.connections })
  const [drag, setDrag] = useState(false)
  const [uploads, setUploads] = useState<ActiveUpload[]>([])
  const handles = useRef<UploadHandle[]>([])
  const nav = useNavigate()

  const connections = (connData?.connections ?? []).filter((c: any) => c.status === 'active')
  const activeConnection = connections[0]
  const masterKey = crypto.masterKey ?? undefined

  if (connData && !activeConnection) {
    return <Navigate to="/settings/storage" replace />
  }

  const update = (i: number, patch: Partial<ActiveUpload>) =>
    setUploads((u) => u.map((x, idx) => (idx === i ? { ...x, ...patch } : x)))

  const handleFiles = async (files: FileList | File[]) => {
    if (!activeConnection) return
    const arr = Array.from(files)
    arr.forEach((file) => {
      setUploads((u) => [...u, { name: file.name, percent: 0, message: 'Queued' }])
      const idx = uploads.length + arr.indexOf(file)
      const handle = startEncryptedUpload(file, activeConnection.id, masterKey, (percent, message) => {
        update(idx, { percent: Math.round(percent * 100), message })
      })
      handles.current.push(handle)
      handle.promise
        .then((id) => update(idx, { fileId: id, percent: 100, message: 'Upload complete' }))
        .catch((e) => update(idx, { error: e.message || 'Upload failed', message: 'Failed' }))
    })
  }

  return (
    <div>
      <div className="section-title">
        <h2>Upload files</h2>
        <span className="tag info"><Icon name="shield" size={14} /> Zero-knowledge</span>
      </div>
      <StorageConnectionCard connection={activeConnection} />
      {masterKey ? (
        <div className="card" style={{ padding: '14px 18px' }}>
          <span className="tag active"><span className="dot active" />Vault unlocked</span>{' '}
          <span className="muted" style={{ fontSize: 13 }}>File keys will be wrapped with your master passphrase.</span>
        </div>
      ) : (
        <div className="card" style={{ padding: '14px 18px', borderColor: 'var(--warn-soft)', background: 'var(--warn-soft)' }}>
          <strong>Vault not unlocked</strong> <span className="text-soft" style={{ fontSize: 13 }}>— files will be encrypted with a raw data key (no passphrase wrap).</span>
        </div>
      )}

      <div
        className={`dropzone ${drag ? 'drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input id="file-input" type="file" multiple style={{ display: 'none' }} onChange={(e) => e.target.files && handleFiles(e.target.files)} />
        <div className="dz-icon"><Icon name="upload" size={26} /></div>
        <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Drop files here or click to select</div>
        <div style={{ fontSize: 13 }}>Encrypted in your browser with AES-256-GCM before anything leaves your device.</div>
      </div>

      {uploads.length > 0 && (
        <div className="card">
          <h2>Transfers</h2>
          {uploads.map((u, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div className="spread">
                <span style={{ fontWeight: 600 }}>{u.name}</span>
                <span className="muted">{u.error ? <span style={{ color: 'var(--danger)' }}>{u.error}</span> : `${u.percent}% · ${u.message}`}</span>
              </div>
              <div className="progress" style={{ marginTop: 8 }}><div style={{ width: `${u.percent}%` }} /></div>
              {u.fileId && u.percent === 100 && !u.error && (
                <button className="subtle" style={{ marginTop: 10 }} onClick={() => nav(`/files/${u.fileId}`)}>View file <Icon name="chevron-right" size={15} /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
