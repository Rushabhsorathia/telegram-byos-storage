import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, http } from '../lib/api'
import { initEcho } from '../lib/echo'
import { startEncryptedUpload, metaFromApi } from '../lib/uploader'
import { decryptBlob } from '../lib/crypto'
import { useSession } from '../lib/store'
import type { DriveView, FileProgress } from '../lib/types'
import { Icon, fileIconName, type IconName } from '../components/Icon'

function fmtBytes(n: number) {
  if (!n) return '—'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(n) / Math.log(1024))
  return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`
}

function reltime(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} days ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

type TypeFilter = 'all' | 'folders' | 'documents' | 'images' | 'media' | 'archive'
type Sort = 'name' | 'modified' | 'size'

const TYPE_CHIPS: { key: TypeFilter; label: string; icon: IconName }[] = [
  { key: 'all', label: 'All', icon: 'grid' },
  { key: 'folders', label: 'Folders', icon: 'folder' },
  { key: 'documents', label: 'Documents', icon: 'doc' },
  { key: 'images', label: 'Images', icon: 'image' },
  { key: 'media', label: 'Media', icon: 'video' },
  { key: 'archive', label: 'Archives', icon: 'archive' },
]

function fileCategory(mime: string | null, name: string): Exclude<TypeFilter, 'all' | 'folders'> | 'other' {
  const ic = fileIconName(mime, name)
  if (ic === 'image') return 'images'
  if (ic === 'video' || ic === 'audio') return 'media'
  if (ic === 'pdf' || ic === 'doc' || ic === 'sheet') return 'documents'
  if (ic === 'archive') return 'archive'
  return 'other'
}

interface Transfer { id: number; name: string; percent: number; message: string; error?: string; done?: boolean; kind: 'upload' | 'download' }

export default function Drive({ view }: { view: DriveView }) {
  const { folderId } = useParams()
  const folder = folderId || 'root'
  const nav = useNavigate()
  const qc = useQueryClient()
  const { user, query, crypto } = useSession()
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [sort, setSort] = useState<Sort>('modified')
  const [sortOpen, setSortOpen] = useState(false)
  const [progress, setProgress] = useState<Record<number, FileProgress>>({})
  const [menu, setMenu] = useState<{ type: 'folder' | 'file'; id: number; x: number; y: number } | null>(null)
  const [rename, setRename] = useState<{ type: 'folder' | 'file'; id: number; value: string } | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const transferCount = useRef(0)

  const { data } = useQuery({
    queryKey: ['drive', view, folder],
    queryFn: () => api.drive(view, folder),
    staleTime: 5000,
  })
  const { data: connData } = useQuery({ queryKey: ['connections'], queryFn: api.connections })

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

  // auto-dismiss finished transfers
  useEffect(() => {
    if (!transfers.some((t) => t.done)) return
    const t = setTimeout(() => setTransfers((ts) => ts.filter((x) => !x.done)), 4000)
    return () => clearTimeout(t)
  }, [transfers])

  const q = query.trim().toLowerCase()
  const activeConnection = (connData?.connections ?? []).find((c: any) => c.status === 'active')

  const rawFolders = (data?.folders ?? []) as any[]
  const rawFiles = ((data?.files ?? []) as any[]).filter((f) => view === 'trash' || f.status !== 'deleted')

  const folders = useMemo(() => {
    let fs = rawFolders
    if (q) fs = fs.filter((f) => f.name.toLowerCase().includes(q))
    if (typeFilter !== 'all' && typeFilter !== 'folders') return []
    return [...fs].sort((a, b) => a.name.localeCompare(b.name))
  }, [rawFolders, q, typeFilter])

  const files = useMemo(() => {
    let fs = rawFiles
    if (q) fs = fs.filter((f) => f.original_name.toLowerCase().includes(q))
    if (typeFilter === 'folders') return []
    if (typeFilter !== 'all') fs = fs.filter((f) => fileCategory(f.mime_type, f.original_name) === typeFilter)
    return [...fs].sort((a, b) => {
      if (sort === 'name') return a.original_name.localeCompare(b.original_name)
      if (sort === 'size') return (b.size_bytes || 0) - (a.size_bytes || 0)
      return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    })
  }, [rawFiles, q, typeFilter, sort])

  const createFolderName = (f: any) => f.name
  const ownerLabel = user?.name || 'me'

  const toggleStar = async (id: number, on: boolean) => {
    await api.updateFileMeta(id, { starred: !on })
    qc.invalidateQueries({ queryKey: ['drive'] })
  }
  const trashFile = async (id: number) => { await api.updateFileMeta(id, { trashed: true }); qc.invalidateQueries({ queryKey: ['drive'] }) }
  const restoreFile = async (id: number) => { await api.updateFileMeta(id, { trashed: false }); qc.invalidateQueries({ queryKey: ['drive'] }) }
  const trashFolder = async (id: number) => { await api.updateFolder(id, { trashed: true }); qc.invalidateQueries({ queryKey: ['drive'] }) }
  const restoreFolder = async (id: number) => { await api.updateFolder(id, { trashed: false }); qc.invalidateQueries({ queryKey: ['drive'] }) }

  const doRename = async () => {
    if (!rename || !rename.value.trim()) return
    setRenaming(true)
    try {
      if (rename.type === 'file') await api.updateFileMeta(rename.id, { original_name: rename.value.trim() })
      else await api.updateFolder(rename.id, { name: rename.value.trim() })
      qc.invalidateQueries({ queryKey: ['drive'] })
      setRename(null)
    } finally {
      setRenaming(false)
    }
  }

  const doDelete = async (purgeRemote: boolean) => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.deleteFile(deleteTarget.id, purgeRemote)
      qc.invalidateQueries({ queryKey: ['drive'] })
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const onContext = (e: React.MouseEvent, type: 'folder' | 'file', id: number) => {
    e.preventDefault()
    // keep menu within the viewport
    const x = Math.min(e.clientX, window.innerWidth - 240)
    const y = Math.min(e.clientY, window.innerHeight - 260)
    setMenu({ type, id, x, y })
  }

  // ---- Drag & drop upload ----
  const canUpload = view === 'my' && !!activeConnection
  const startUploads = (fileList: FileList | File[]) => {
    const arr = Array.from(fileList)
    if (arr.length === 0) return
    if (!activeConnection) { nav('/settings/storage'); return }
    const items = arr.map((file) => ({ id: transferCount.current++, name: file.name, percent: 0, message: 'Queued', kind: 'upload' } as Transfer))
    setTransfers((t) => [...t, ...items])
    arr.forEach((file, i) => {
      const id = items[i].id
      const patch = (p: Partial<Transfer>) => setTransfers((ts) => ts.map((x) => (x.id === id ? { ...x, ...p } : x)))
      const handle = startEncryptedUpload(file, activeConnection.id, crypto.masterKey ?? undefined, (percent, message) => {
        patch({ percent: Math.round(percent * 100), message })
      })
      handle.promise
        .then(() => { patch({ percent: 100, message: 'Done', done: true }); qc.invalidateQueries({ queryKey: ['drive'] }) })
        .catch((e) => patch({ error: e.message || 'Failed', message: 'Failed', done: true }))
    })
  }

  // ---- Direct download + decrypt (shows in the transfer popup) ----
  const downloadFile = async (file: any) => {
    if (!file || file.status !== 'complete') return
    const id = transferCount.current++
    const patch = (p: Partial<Transfer>) => setTransfers((ts) => ts.map((x) => (x.id === id ? { ...x, ...p } : x)))
    setTransfers((t) => [...t, { id, name: file.original_name, percent: 0, message: 'Downloading', kind: 'download' }])
    try {
      const res = await http.get(api.downloadUrl(file.id), {
        responseType: 'blob',
        onDownloadProgress: (e) => { if (e.total) patch({ percent: Math.round((e.loaded / e.total) * 100) }) },
      })
      patch({ percent: 100, message: 'Decrypting' })
      const meta = metaFromApi(file)
      const decrypted = await decryptBlob(res.data, meta!, crypto.masterKey ?? undefined, file.original_name)
      const url = URL.createObjectURL(decrypted)
      const a = document.createElement('a')
      a.href = url
      a.download = file.original_name
      a.click()
      URL.revokeObjectURL(url)
      patch({ percent: 100, message: 'Done', done: true })
    } catch (e: any) {
      patch({ error: e?.message || 'Download failed', message: 'Failed', done: true })
    }
  }

  const onDragEnter = (e: React.DragEvent) => {
    if (!canUpload) return
    e.preventDefault(); dragDepth.current++; setDragging(true)
  }
  const onDragLeave = () => { if (!canUpload) return; dragDepth.current--; if (dragDepth.current <= 0) setDragging(false) }
  const onDrop = (e: React.DragEvent) => {
    if (!canUpload) return
    e.preventDefault(); dragDepth.current = 0; setDragging(false)
    if (e.dataTransfer.files?.length) startUploads(e.dataTransfer.files)
  }

  const crumbs = data?.breadcrumbs ?? []
  const headTitle = view === 'starred' ? 'Starred' : view === 'recent' ? 'Recent' : view === 'trash' ? 'Trash' : 'My Drive'
  const total = folders.length + files.length

  return (
    <div
      onClick={() => { setMenu(null); setSortOpen(false) }}
      onDragEnter={onDragEnter}
      onDragOver={(e) => canUpload && e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{ minHeight: '100%' }}
    >
      {/* Breadcrumbs / title */}
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
                      <span className={`crumb ${last ? 'last' : ''}`} onClick={() => (last ? null : nav(`/drive/f/${c.id}`))}>
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

      {/* Filter chips */}
      <div className="chips">
        {TYPE_CHIPS.map((c) => (
          <button
            key={c.key}
            className={`chip ${typeFilter === c.key ? 'active' : ''}`}
            onClick={() => setTypeFilter(c.key)}
          >
            <Icon name={c.icon} size={15} /> {c.label}
          </button>
        ))}
      </div>

      {/* View bar: count + sort + layout */}
      <div className="view-bar">
        <span className="title">
          {q ? `${total} result${total !== 1 ? 's' : ''} for “${query.trim()}”` : `${total} item${total !== 1 ? 's' : ''}`}
        </span>
        <div className="view-controls">
          <div style={{ position: 'relative' }}>
            <button className="ghost sort-btn" onClick={(e) => { e.stopPropagation(); setSortOpen((v) => !v) }}>
              <Icon name="list" size={16} />
              {sort === 'name' ? 'Name' : sort === 'size' ? 'File size' : 'Last modified'}
              <Icon name="chevron-down" size={15} />
            </button>
            {sortOpen && (
              <div className="menu" style={{ right: 0, top: 40, minWidth: 180 }} onClick={(e) => e.stopPropagation()}>
                {([['modified', 'Last modified'], ['name', 'Name'], ['size', 'File size']] as [Sort, string][]).map(([k, l]) => (
                  <button key={k} onClick={() => { setSort(k); setSortOpen(false) }}>
                    <span className="mi">{sort === k ? <Icon name="check" size={16} /> : null}</span> {l}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="seg">
            <button className={layout === 'list' ? 'active' : ''} title="List" onClick={() => setLayout('list')}><Icon name="list" size={17} /></button>
            <button className={layout === 'grid' ? 'active' : ''} title="Grid" onClick={() => setLayout('grid')}><Icon name="grid" size={17} /></button>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="empty">
          <div className="empty-ic">
            {q ? <Icon name="search" size={40} />
              : view === 'trash' ? <Icon name="trash" size={40} />
              : view === 'starred' ? <Icon name="star" size={40} />
              : view === 'recent' ? <Icon name="clock" size={40} />
              : <Icon name="drive" size={40} />}
          </div>
          <div className="et">
            {q ? 'No matching items'
              : view === 'trash' ? 'Trash is empty'
              : view === 'starred' ? 'No starred items'
              : view === 'recent' ? 'Nothing recent'
              : 'A place for all your files'}
          </div>
          <div>{q ? 'Try a different search term.' : view === 'my' ? 'Drag files here or use the New button to get started.' : 'Items will appear here.'}</div>
        </div>
      ) : layout === 'grid' ? (
        <>
          {folders.length > 0 && (
            <>
              <div className="section-head">Folders</div>
              <div className="grid">
                {folders.map((f: any) => (
                  <div
                    key={f.id}
                    className="tile folder-tile"
                    title={f.name}
                    onClick={() => view === 'trash' ? undefined : nav(`/drive/f/${f.id}`)}
                    onContextMenu={(e) => onContext(e, 'folder', f.id)}
                  >
                    <span className="ic folder"><Icon name="folder" size={22} /></span>
                    <div className="meta"><div className="nm">{createFolderName(f)}</div></div>
                    <button className="tile-more" onClick={(e) => { e.stopPropagation(); onContext(e, 'folder', f.id) }}>
                      <Icon name="list" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {files.length > 0 && (
            <>
              <div className="section-head">Files</div>
              <div className="grid-cards">
                {files.map((f: any) => {
                  const p = progress[f.id]
                  const inFlight = (p?.status ?? f.status) === 'uploading' || (p?.status ?? f.status) === 'processing'
                  const pct = p ? Math.round((p.uploaded_chunks / (p.total_chunks || 1)) * 100) : f.status === 'complete' ? 100 : 0
                  const ic = fileIconName(f.mime_type, f.original_name)
                  const st = (p?.status ?? f.status) as string
                  const stCls = st === 'complete' ? 'active' : st === 'failed' ? 'failed' : 'pending'
                  const stLabel = st === 'complete' ? 'Saved' : st === 'failed' ? 'Failed' : st === 'uploading' ? `Uploading${pct ? ` ${pct}%` : ''}` : 'Processing'
                  return (
                    <div
                      key={f.id}
                      className="card-tile"
                      title={f.original_name}
                      onClick={() => nav(`/files/${f.id}`)}
                      onContextMenu={(e) => onContext(e, 'file', f.id)}
                    >
                      <div className={`thumb cat-${fileCategory(f.mime_type, f.original_name)}`}>
                        <Icon name={ic} size={44} />
                        <span className={`card-status ${stCls}`}><span className={`dot ${stCls}`} />{stLabel}</span>
                      </div>
                      <div className="body">
                        <span className={`mini-ic cat-${fileCategory(f.mime_type, f.original_name)}`}><Icon name={ic} size={15} /></span>
                        <div className="nm">{f.original_name}</div>
                        <button className={`star ${f.starred ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); toggleStar(f.id, f.starred) }}>
                          <Icon name={f.starred ? 'star-filled' : 'star'} size={16} />
                        </button>
                      </div>
                      {inFlight
                        ? <div className="progress card-progress"><div style={{ width: `${pct}%` }} /></div>
                        : <div className="card-sub">{fmtBytes(f.size_bytes)} · {reltime(f.updated_at || f.created_at)}</div>}
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
            <tr>
              <th>Name</th>
              <th className="col-owner">Owner</th>
              <th className="col-mod">Last modified</th>
              <th className="col-size">File size</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {folders.map((f: any) => (
              <tr key={`fo${f.id}`} style={{ cursor: 'pointer' }} onClick={() => view === 'trash' ? undefined : nav(`/drive/f/${f.id}`)} onContextMenu={(e) => onContext(e, 'folder', f.id)}>
                <td><div className="nm-cell"><span className="ic folder"><Icon name="folder" size={18} /></span><span className="nm">{f.name}</span></div></td>
                <td className="muted col-owner">{ownerLabel}</td>
                <td className="muted col-mod">{reltime(f.updated_at || f.created_at)}</td>
                <td className="muted col-size">—</td>
                <td><button className="tile-more" onClick={(e) => { e.stopPropagation(); onContext(e, 'folder', f.id) }}><Icon name="list" size={16} /></button></td>
              </tr>
            ))}
            {files.map((f: any) => {
              const p = progress[f.id]
              const inFlight = (p?.status ?? f.status) === 'uploading' || (p?.status ?? f.status) === 'processing'
              const pct = p ? Math.round((p.uploaded_chunks / (p.total_chunks || 1)) * 100) : f.status === 'complete' ? 100 : 0
              return (
                <tr key={`fi${f.id}`} style={{ cursor: 'pointer' }} onClick={() => nav(`/files/${f.id}`)} onContextMenu={(e) => onContext(e, 'file', f.id)}>
                  <td>
                    <div className="nm-cell">
                      <span className={`ic cat-${fileCategory(f.mime_type, f.original_name)}`}><Icon name={fileIconName(f.mime_type, f.original_name)} size={18} /></span>
                      <span className="nm">{f.original_name}</span>
                      {f.starred && <span className="star on" style={{ position: 'static', opacity: 1, width: 22, height: 22 }}><Icon name="star-filled" size={14} /></span>}
                      {inFlight && <div className="progress" style={{ width: 120, marginLeft: 8 }}><div style={{ width: `${pct}%` }} /></div>}
                    </div>
                  </td>
                  <td className="muted col-owner">{ownerLabel}</td>
                  <td className="muted col-mod">{reltime(f.updated_at || f.created_at)}</td>
                  <td className="muted col-size">{fmtBytes(f.size_bytes)}</td>
                  <td><button className="tile-more" onClick={(e) => { e.stopPropagation(); onContext(e, 'file', f.id) }}><Icon name="list" size={16} /></button></td>
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
              <button disabled={rawFiles.find((x: any) => x.id === menu.id)?.status !== 'complete'} onClick={() => { downloadFile(rawFiles.find((x: any) => x.id === menu.id)); setMenu(null) }}><span className="mi"><Icon name="download" size={17} /></span> Download</button>
              <button onClick={() => { nav(`/files/${menu.id}`); setMenu(null) }}><span className="mi"><Icon name="share" size={17} /></span> Share</button>
              <div className="menu-sep" />
              <button onClick={() => { const f = files.find((x: any) => x.id === menu.id); setRename({ type: 'file', id: menu.id, value: f?.original_name ?? '' }); setMenu(null) }}><span className="mi"><Icon name="edit" size={17} /></span> Rename</button>
              <button onClick={() => { toggleStar(menu.id, files.find((f: any) => f.id === menu.id)?.starred ?? false); setMenu(null) }}><span className="mi"><Icon name="star" size={17} /></span> {files.find((f: any) => f.id === menu.id)?.starred ? 'Remove star' : 'Add star'}</button>
              <div className="menu-sep" />
              {view === 'trash'
                ? <button onClick={() => { restoreFile(menu.id); setMenu(null) }}><span className="mi"><Icon name="restore" size={17} /></span> Restore</button>
                : <button onClick={() => { trashFile(menu.id); setMenu(null) }}><span className="mi"><Icon name="clock" size={17} /></span> Move to trash</button>}
              <button className="danger-item" onClick={() => { const f = rawFiles.find((x: any) => x.id === menu.id); setDeleteTarget({ id: menu.id, name: f?.original_name ?? 'this file' }); setMenu(null) }}><span className="mi"><Icon name="trash" size={17} /></span> Delete…</button>
            </>
          ) : (
            <>
              {view !== 'trash' && <button onClick={() => { nav(`/drive/f/${menu.id}`); setMenu(null) }}><span className="mi"><Icon name="open" size={17} /></span> Open</button>}
              {view !== 'trash' && <button onClick={() => { const f = folders.find((x: any) => x.id === menu.id); setRename({ type: 'folder', id: menu.id, value: f?.name ?? '' }); setMenu(null) }}><span className="mi"><Icon name="edit" size={17} /></span> Rename</button>}
              {view !== 'trash' && <div className="menu-sep" />}
              {view === 'trash'
                ? <button onClick={() => { restoreFolder(menu.id); setMenu(null) }}><span className="mi"><Icon name="restore" size={17} /></span> Restore</button>
                : <button className="danger-item" onClick={() => { trashFolder(menu.id); setMenu(null) }}><span className="mi"><Icon name="trash" size={17} /></span> Move to trash</button>}
            </>
          )}
        </div>
      )}

      {/* Rename modal */}
      {rename && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setRename(null)}>
          <div className="modal" style={{ width: 420 }}>
            <h2 style={{ marginBottom: 18 }}>Rename</h2>
            <input
              autoFocus
              value={rename.value}
              onChange={(e) => setRename({ ...rename, value: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') doRename(); if (e.key === 'Escape') setRename(null) }}
            />
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="ghost" onClick={() => setRename(null)}>Cancel</button>
              <button className="primary" disabled={renaming || !rename.value.trim()} onClick={doRename}>{renaming ? 'Saving…' : 'OK'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal — two options */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !deleting && setDeleteTarget(null)}>
          <div className="modal" style={{ width: 460 }}>
            <h2 style={{ marginBottom: 6 }}>Delete file</h2>
            <p className="muted" style={{ marginTop: 0, marginBottom: 18 }}>“{deleteTarget.name}” — choose how to delete it.</p>
            <div className="delete-options">
              <button className="del-opt" disabled={deleting} onClick={() => doDelete(false)}>
                <span className="del-ic"><Icon name="drive" size={20} /></span>
                <span className="del-text">
                  <strong>Remove from Drive only</strong>
                  <span className="hint">Keeps the encrypted copy on your Telegram — it just disappears from here.</span>
                </span>
              </button>
              <button className="del-opt danger" disabled={deleting} onClick={() => doDelete(true)}>
                <span className="del-ic"><Icon name="trash" size={20} /></span>
                <span className="del-text">
                  <strong>Delete from Drive &amp; Telegram</strong>
                  <span className="hint">Permanently removes the file and deletes its chunks from Telegram. Can’t be undone.</span>
                </span>
              </button>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="ghost" disabled={deleting} onClick={() => setDeleteTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Drag overlay */}
      {dragging && (
        <div className="drag-overlay">
          <div className="drag-card">
            <Icon name="upload" size={40} />
            <div className="dt">Drop files to upload</div>
            <div className="hint">Encrypted in your browser before leaving your device</div>
          </div>
        </div>
      )}

      {/* Transfer popup (Google-Drive style) */}
      {transfers.length > 0 && (
        <div className="transfer-pop">
          <div className="tp-head">
            <span>{(() => {
              const active = transfers.filter((t) => !t.done).length
              return active > 0 ? `${active} item${active !== 1 ? 's' : ''} in progress` : 'Transfers complete'
            })()}</span>
            <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => setTransfers([])}><Icon name="x" size={16} /></button>
          </div>
          <div className="tp-body">
            {transfers.map((t) => (
              <div key={t.id} className="tp-row">
                <span className="tp-ic"><Icon name={t.kind === 'download' ? 'download' : fileIconName(null, t.name)} size={18} /></span>
                <div className="tp-meta">
                  <div className="nm">{t.name}</div>
                  {!t.done && !t.error && <div className="progress" style={{ marginTop: 5 }}><div style={{ width: `${t.percent}%` }} /></div>}
                </div>
                <span className="tp-status">
                  {t.error ? <span style={{ color: 'var(--danger)' }}><Icon name="alert" size={18} /></span>
                    : t.done ? <span style={{ color: 'var(--ok)' }}><Icon name="check" size={18} /></span>
                    : t.message === 'Decrypting' || t.message === 'Finalizing — splitting and pushing to Telegram' ? <span className="hint">{t.message === 'Decrypting' ? 'Decrypting' : 'Finalizing'}</span>
                    : `${t.percent}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
