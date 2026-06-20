import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { initEcho } from '../lib/echo'
import type { DriveView, FileProgress } from '../lib/types'
import { Icon, fileIconName } from '../components/Icon'

function fmtBytes(n: number) {
  if (!n) return '—'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(n) / Math.log(1024))
  return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`
}
function ext(name: string) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toUpperCase().slice(0, 4) : 'FILE'
}

export default function Drive({ view }: { view: DriveView }) {
  const { folderId } = useParams()
  const folder = folderId || 'root'
  const nav = useNavigate()
  const qc = useQueryClient()
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [progress, setProgress] = useState<Record<number, FileProgress>>({})
  const [menu, setMenu] = useState<{ type: 'folder' | 'file'; id: number; x: number; y: number } | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [creating, setCreating] = useState(false)

  const { data } = useQuery({
    queryKey: ['drive', view, folder],
    queryFn: () => api.drive(view, folder),
    staleTime: 5000,
  })

  useEffect(() => {
    const u = (window as any).__uid
    if (!u) return
    const echo = initEcho()
    if (!echo) return
    const ch = echo.private(`private-user.${u}`)
    ch.listen('FileProgressUpdated', (e: FileProgress) => {
      setProgress((p) => ({ ...p, [e.id]: e }))
      if (e.status === 'complete' || e.status === 'failed') qc.invalidateQueries({ queryKey: ['drive'] })
    })
    return () => { ch.stopListening('FileProgressUpdated') }
  }, [qc])

  // live progress while files are uploading/processing
  useEffect(() => {
    if (!data?.files?.some((f: any) => f.status === 'uploading' || f.status === 'processing')) return
    const t = setInterval(() => qc.invalidateQueries({ queryKey: ['drive'] }), 4000)
    return () => clearInterval(t)
  }, [data, qc])

  const folders = data?.folders ?? []
  const files = (data?.files ?? []).filter((f: any) => view === 'trash' || f.status !== 'deleted')

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    setCreating(true)
    await api.createFolder(newFolderName.trim(), folder)
    setNewFolderName('')
    qc.invalidateQueries({ queryKey: ['drive'] })
    setCreating(false)
  }

  const toggleStar = async (id: number, on: boolean) => {
    await api.updateFileMeta(id, { starred: !on })
    qc.invalidateQueries({ queryKey: ['drive'] })
  }

  const trashFile = async (id: number) => { await api.updateFileMeta(id, { trashed: true }); qc.invalidateQueries({ queryKey: ['drive'] }) }
  const restoreFile = async (id: number) => { await api.updateFileMeta(id, { trashed: false }); qc.invalidateQueries({ queryKey: ['drive'] }) }
  const trashFolder = async (id: number) => { await api.updateFolder(id, { trashed: true }); qc.invalidateQueries({ queryKey: ['drive'] }) }
  const restoreFolder = async (id: number) => { await api.updateFolder(id, { trashed: false }); qc.invalidateQueries({ queryKey: ['drive'] }) }

  const onContext = (e: React.MouseEvent, type: 'folder' | 'file', id: number) => {
    e.preventDefault()
    setMenu({ type, id, x: e.clientX, y: e.clientY })
  }

  const crumbs = data?.breadcrumbs ?? []
  const headTitle = view === 'starred' ? 'Starred' : view === 'recent' ? 'Recent' : view === 'trash' ? 'Trash' : 'My Drive'

  return (
    <div onClick={() => setMenu(null)}>
      {/* Breadcrumbs */}
      <div className="crumbs">
        {view === 'my' ? (
          <>
            {crumbs.length === 0 ? (
              <span className="crumb last">My Drive</span>
            ) : (
              <>
                <span className="crumb" onClick={() => nav('/drive')}>My Drive</span>
                {crumbs.map((c: { id: number; name: string }, i: number) => {
                  const last = i === crumbs.length - 1
                  return (
                    <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span className="crumb-sep"><Icon name="chevron-right" size={18} /></span>
                      <span
                        className={`crumb ${last ? 'last' : ''}`}
                        onClick={() => (last ? null : nav(`/drive/f/${c.id}`))}
                      >
                        {c.name}
                      </span>
                    </span>
                  )
                })}
              </>
            )}
          </>
        ) : (
          <span className="crumb last">{headTitle}</span>
        )}
      </div>

      {view === 'my' && (
        <>
          <div className="row" style={{ marginBottom: 18 }}>
            <input
              placeholder="New folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createFolder()}
              style={{ maxWidth: 280, margin: 0 }}
            />
            <button className="ghost" disabled={creating || !newFolderName.trim()} onClick={createFolder}>
              <Icon name="plus" size={16} /> New folder
            </button>
          </div>
        </>
      )}

      <div className="view-bar">
        <span className="title">
          {folders.length + files.length} item{folders.length + files.length !== 1 ? 's' : ''}
        </span>
        <div className="view-controls">
          <div className="seg">
            <button className={layout === 'grid' ? 'active' : ''} title="Grid" onClick={() => setLayout('grid')}><Icon name="grid" size={17} /></button>
            <button className={layout === 'list' ? 'active' : ''} title="List" onClick={() => setLayout('list')}><Icon name="list" size={17} /></button>
          </div>
        </div>
      </div>

      {folders.length === 0 && files.length === 0 ? (
        <div className="empty">
          <div className="empty-ic">
            {view === 'trash'
              ? <Icon name="trash" size={40} />
              : view === 'starred'
                ? <Icon name="star" size={40} />
                : view === 'recent'
                  ? <Icon name="clock" size={40} />
                  : <Icon name="folder" size={40} />}
          </div>
          <div className="et">{view === 'trash' ? 'Trash is empty' : view === 'starred' ? 'No starred items' : view === 'recent' ? 'Nothing recent' : 'This folder is empty'}</div>
          <div>{view === 'my' ? <><a onClick={() => nav('/upload')}>Upload files</a> or create a folder above.</> : 'Items will appear here.'}</div>
        </div>
      ) : layout === 'grid' ? (
        <>
          {folders.length > 0 && (
            <>
              <div className="section-head">Folders <span className="line" /></div>
              <div className="grid">
                {folders.map((f: any) => (
                  <div
                    key={f.id}
                    className="tile"
                    title={f.name}
                    onClick={() => view === 'trash' ? undefined : nav(`/drive/f/${f.id}`)}
                    onContextMenu={(e) => onContext(e, 'folder', f.id)}
                  >
                    <span className="ic folder"><Icon name="folder" size={26} /></span>
                    <div className="meta">
                      <div className="nm">{f.name}</div>
                      <div className="sub">{view === 'trash' ? 'In trash' : 'Folder'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {files.length > 0 && (
            <>
              <div className="section-head">Files <span className="line" /></div>
              <div className="grid">
                {files.map((f: any) => {
                  const p = progress[f.id]
                  const inFlight = (p?.status ?? f.status) === 'uploading' || (p?.status ?? f.status) === 'processing'
                  const pct = p ? Math.round((p.uploaded_chunks / (p.total_chunks || 1)) * 100) : f.status === 'complete' ? 100 : 0
                  return (
                    <div
                      key={f.id}
                      className="tile"
                      title={f.original_name}
                      onClick={() => nav(`/files/${f.id}`)}
                      onContextMenu={(e) => onContext(e, 'file', f.id)}
                    >
                      <span className="ic"><Icon name={fileIconName(f.mime_type, f.original_name)} size={22} /></span>
                      <div className="meta">
                        <div className="nm">{f.original_name}</div>
                        <div className="sub">
                          {inFlight ? `${pct}% · syncing` : fmtBytes(f.size_bytes)}{f.shares_count ? ` · ${f.shares_count} share${f.shares_count > 1 ? 's' : ''}` : ''}
                        </div>
                        {inFlight && <div className="progress" style={{ marginTop: 6 }}><div style={{ width: `${pct}%` }} /></div>}
                      </div>
                      <button className={`star ${f.starred ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); toggleStar(f.id, f.starred) }}>
                        <Icon name={f.starred ? 'star-filled' : 'star'} size={16} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      ) : (
        /* List view */
        <table className="dtable">
          <thead>
            <tr><th>Name</th><th>Status</th><th>Size</th><th style={{ width: 40 }}></th></tr>
          </thead>
          <tbody>
            {folders.map((f: any) => (
              <tr key={f.id} style={{ cursor: 'pointer' }} onClick={() => view === 'trash' ? undefined : nav(`/drive/f/${f.id}`)} onContextMenu={(e) => onContext(e, 'folder', f.id)}>
                <td><div className="nm-cell"><span className="ic" style={{ background: 'transparent' }}><Icon name="folder" size={20} /></span><span className="nm">{f.name}</span></div></td>
                <td className="muted">{view === 'trash' ? 'In trash' : 'Folder'}</td>
                <td className="muted">—</td>
                <td></td>
              </tr>
            ))}
            {files.map((f: any) => {
              const p = progress[f.id]
              const inFlight = (p?.status ?? f.status) === 'uploading' || (p?.status ?? f.status) === 'processing'
              const pct = p ? Math.round((p.uploaded_chunks / (p.total_chunks || 1)) * 100) : f.status === 'complete' ? 100 : 0
              return (
                <tr key={f.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/files/${f.id}`)} onContextMenu={(e) => onContext(e, 'file', f.id)}>
                  <td>
                    <div className="nm-cell">
                      <span className="ic"><Icon name={fileIconName(f.mime_type, f.original_name)} size={18} /></span>
                      <span className="nm">{f.original_name}</span>
                      {inFlight && <div className="progress" style={{ width: 120, marginLeft: 12 }}><div style={{ width: `${pct}%` }} /></div>}
                    </div>
                  </td>
                  <td><span className={`tag ${f.status === 'complete' ? 'active' : f.status === 'failed' ? 'failed' : 'pending'}`}><span className={`dot ${f.status === 'complete' ? 'active' : f.status === 'failed' ? 'failed' : 'pending'}`} />{f.status}</span></td>
                  <td className="muted">{fmtBytes(f.size_bytes)}</td>
                  <td><button className={`star ${f.starred ? 'on' : ''}`} style={{ opacity: 1, position: 'static', width: 28, height: 28 }} onClick={(e) => { e.stopPropagation(); toggleStar(f.id, f.starred) }}><Icon name={f.starred ? 'star-filled' : 'star'} size={16} /></button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Context menu */}
      {menu && (
        <div className="menu" style={{ position: 'fixed', left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          {menu.type === 'file' ? (
            <>
              <button onClick={() => { nav(`/files/${menu.id}`); setMenu(null) }}><span className="mi"><Icon name="open" size={17} /></span> Open</button>
              <button onClick={() => { toggleStar(menu.id, files.find((f: any) => f.id === menu.id)?.starred ?? false); setMenu(null) }}><span className="mi"><Icon name="star" size={17} /></span> Toggle star</button>
              {view === 'trash'
                ? <button onClick={() => { restoreFile(menu.id); setMenu(null) }}><span className="mi"><Icon name="restore" size={17} /></span> Restore</button>
                : <button onClick={() => { trashFile(menu.id); setMenu(null) }}><span className="mi"><Icon name="trash" size={17} /></span> Move to trash</button>}
            </>
          ) : (
            <>
              {view !== 'trash' && <button onClick={() => { nav(`/drive/f/${menu.id}`); setMenu(null) }}><span className="mi"><Icon name="open" size={17} /></span> Open</button>}
              {view === 'trash'
                ? <button onClick={() => { restoreFolder(menu.id); setMenu(null) }}><span className="mi"><Icon name="restore" size={17} /></span> Restore</button>
                : <button onClick={() => { trashFolder(menu.id); setMenu(null) }}><span className="mi"><Icon name="trash" size={17} /></span> Move to trash</button>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
