import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { initEcho } from '../lib/echo'
import type { FileProgress, FileRecord } from '../lib/types'
import { FileRow } from '../components/FileRow'
import { useSession } from '../lib/store'

function fmtBytes(n: number) {
  if (!n) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(n) / Math.log(1024))
  return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`
}

export default function Dashboard() {
  const { user } = useSession()
  const { data, refetch } = useQuery({ queryKey: ['files'], queryFn: () => api.listFiles(1) })
  const [progress, setProgress] = useState<Record<number, FileProgress>>({})
  const [usage, setUsage] = useState<number | null>(null)

  useEffect(() => {
    api.connections().then((d) => setUsage(d.usage_bytes)).catch(() => {})
    if (!user) return
    const echo = initEcho()
    if (!echo) return
    const channel = echo.private(`private-user.${user.id}`)
    channel.listen('FileProgressUpdated', (e: FileProgress) => {
      setProgress((p) => ({ ...p, [e.id]: e }))
      if (e.status === 'complete' || e.status === 'failed') refetch()
    })
    return () => { channel.stopListening('FileProgressUpdated') }
  }, [refetch, user])

  const files: FileRecord[] = data?.data ?? []

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Your files</h2>
        <div className="row">
          {usage !== null && <span className="muted">Stored: {fmtBytes(usage)}</span>}
          <Link to="/upload"><button>Upload</button></Link>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {files.length === 0 ? (
          <div className="center muted" style={{ padding: 40 }}>No files yet. <Link to="/upload">Upload your first file</Link>.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Name</th><th>Size</th><th>Progress</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <FileRow key={f.id} file={f} progress={progress[f.id]} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
