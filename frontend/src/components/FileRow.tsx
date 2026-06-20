import { Link } from 'react-router-dom'
import type { FileProgress, FileRecord } from '../lib/types'

function fmtBytes(n: number) {
  if (!n) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(n) / Math.log(1024))
  return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`
}

const statusClass: Record<string, string> = {
  complete: 'active', active: 'active', uploading: 'pending', processing: 'pending', failed: 'failed', deleted: '',
}

export function FileRow({ file, progress }: { file: FileRecord; progress?: FileProgress }) {
  const total = progress?.total_chunks ?? file.total_chunks
  const uploaded = progress?.uploaded_chunks ?? file.uploaded_chunks
  const pct = total > 0 ? Math.round((uploaded / total) * 100) : file.status === 'complete' ? 100 : 0
  const status = progress?.status ?? file.status

  return (
    <tr>
      <td>
        <Link to={`/files/${file.id}`}>{file.original_name}</Link>
        {file.shares_count ? <span className="tag" style={{ marginLeft: 8 }}>{file.shares_count} share{file.shares_count > 1 ? 's' : ''}</span> : null}
      </td>
      <td className="muted">{fmtBytes(file.size_bytes)}</td>
      <td style={{ minWidth: 160 }}>
        <div className="progress"><div style={{ width: `${pct}%` }} /></div>
        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
          {status === 'complete' ? 'Synced' : `${uploaded}/${total || '?'} chunks · ${pct}%`}
        </div>
      </td>
      <td><span className={`tag ${statusClass[status] || ''}`}>{status}</span></td>
      <td><Link to={`/files/${file.id}`}><button className="ghost">Open</button></Link></td>
    </tr>
  )
}
