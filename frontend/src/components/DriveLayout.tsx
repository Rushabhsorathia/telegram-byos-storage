import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useSession } from '../lib/store'
import { useEffect, useRef, useState } from 'react'
import { Icon, type IconName } from './Icon'
import { AccountModal } from './AccountModal'

function fmtBytes(n: number) {
  if (!n) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(n) / Math.log(1024))
  return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`
}

/** Current folder id parsed from the URL (/drive/f/:id), or 'root'. */
function currentFolderId(pathname: string) {
  const m = pathname.match(/^\/drive\/f\/(\d+)/)
  return m ? m[1] : 'root'
}

export default function DriveLayout() {
  const loc = useLocation()
  const nav = useNavigate()
  const { user, clear, query, setQuery } = useSession()
  const qc = useQueryClient()
  const [usage, setUsage] = useState<number>(0)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [newMenuOpen, setNewMenuOpen] = useState(false)
  const [folderModal, setFolderModal] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [creating, setCreating] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const newMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.connections().then((d) => setUsage(d.usage_bytes ?? 0)).catch(() => {})
  }, [loc.pathname])

  // Close menus on route change
  useEffect(() => {
    setUserMenuOpen(false)
    setMobileNavOpen(false)
    setNewMenuOpen(false)
  }, [loc.pathname])

  // Click-outside to close the open dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) setNewMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // /drive should only be "active" exactly on root, not inside a folder breadcrumb
  const isActive = (to: string) => {
    if (to === '/drive') return loc.pathname === '/drive' || loc.pathname.startsWith('/drive/f/')
    return loc.pathname === to || loc.pathname.startsWith(to + '/')
  }

  const navItem = (to: string, ico: IconName, label: string) => (
    <Link
      to={to}
      className={`nav-item ${isActive(to) ? 'active' : ''}`}
      onClick={() => qc.invalidateQueries({ queryKey: ['drive'] })}
    >
      <span className="ico"><Icon name={ico} size={20} /></span> {label}
    </Link>
  )

  const createFolder = async () => {
    if (!folderName.trim()) return
    setCreating(true)
    try {
      await api.createFolder(folderName.trim(), currentFolderId(loc.pathname))
      setFolderName('')
      setFolderModal(false)
      qc.invalidateQueries({ queryKey: ['drive'] })
      if (!loc.pathname.startsWith('/drive')) nav('/drive')
    } finally {
      setCreating(false)
    }
  }

  const quota = Math.min(100, (usage / (15 * 1024 ** 3)) * 100)
  const sidebar = (
    <>
      <div className="sidebar-brand">
        <span className="logo"><Icon name="logo" size={20} /></span>
        <span className="name">Telegram<span>Storage</span></span>
      </div>

      <div className="new-wrap" ref={newMenuRef}>
        <button className="new-btn" onClick={() => setNewMenuOpen((v) => !v)}>
          <span className="plus"><Icon name="plus" size={16} /></span> New
        </button>
        {newMenuOpen && (
          <div className="menu new-menu">
            <button onClick={() => { setNewMenuOpen(false); setFolderModal(true) }}>
              <span className="mi"><Icon name="folder" size={18} /></span> New folder
            </button>
            <div className="menu-sep" />
            <button onClick={() => { setNewMenuOpen(false); nav('/upload') }}>
              <span className="mi"><Icon name="upload" size={18} /></span> File upload
            </button>
            <button onClick={() => { setNewMenuOpen(false); nav('/upload') }}>
              <span className="mi"><Icon name="folder-open" size={18} /></span> Folder upload
            </button>
          </div>
        )}
      </div>

      <nav className="nav-section">
        {navItem('/drive', 'folder', 'My Drive')}
        {navItem('/recent', 'clock', 'Recent')}
        {navItem('/starred', 'star', 'Starred')}
        {navItem('/trash', 'trash', 'Trash')}
      </nav>

      <nav className="nav-section">
        {navItem('/settings/storage', 'bot', 'Connections')}
      </nav>

      <div className="sidebar-storage">
        <div className="hint"><Icon name="cloud" size={16} /> <strong>Storage</strong></div>
        <div className="storage-bar"><div style={{ width: `${quota}%` }} /></div>
        <div className="hint">{fmtBytes(usage)} of 15 GB used</div>
        <Link to="/settings/storage" className="storage-link">Manage storage</Link>
      </div>
    </>
  )

  return (
    <div className="drive-shell">
      {/* Desktop sidebar */}
      <aside className="drive-sidebar">{sidebar}</aside>

      {/* Mobile sidebar overlay */}
      {mobileNavOpen && (
        <>
          <div className="sidebar-backdrop" onClick={() => setMobileNavOpen(false)} />
          <aside className="drive-sidebar mobile">{sidebar}</aside>
        </>
      )}

      {/* Topbar */}
      <header className="drive-topbar">
        <button className="icon-btn hamburger" title="Menu" onClick={() => setMobileNavOpen((v) => !v)}>
          <Icon name="menu" size={20} />
        </button>
        <div className="search">
          <Icon name="search" size={20} />
          <input
            placeholder="Search in Drive"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="search-clear" title="Clear" onClick={() => setQuery('')}>
              <Icon name="x" size={16} />
            </button>
          )}
        </div>
        <div className="topbar-actions">
          <button className="icon-btn" title="Connections" onClick={() => nav('/settings/storage')}>
            <Icon name="settings" size={20} />
          </button>
          <span className="topbar-divider" />
          <div style={{ position: 'relative' }} ref={userMenuRef}>
            <button
              className={`avatar ${userMenuOpen ? 'open' : ''}`}
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-label="Account"
            >
              {(user?.name || user?.email || '?')[0].toUpperCase()}
            </button>
            {userMenuOpen && (
              <div className="menu user-menu">
                <div className="user-head">
                  <span className="avatar" style={{ width: 44, height: 44, fontSize: 17 }}>
                    {(user?.name || user?.email || '?')[0].toUpperCase()}
                  </span>
                  <div className="col" style={{ gap: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{user?.name}</div>
                    <div className="hint" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
                  </div>
                </div>
                <button onClick={() => { setUserMenuOpen(false); setAccountOpen(true) }}>
                  <Icon name="edit" size={18} /> Account settings
                </button>
                <button onClick={async () => { await api.logout(); clear(); nav('/auth') }}>
                  <Icon name="logout" size={18} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="drive-main">
        <Outlet />
      </main>

      {accountOpen && <AccountModal onClose={() => setAccountOpen(false)} />}

      {/* New folder modal */}
      {folderModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setFolderModal(false)}>
          <div className="modal" style={{ width: 420 }}>
            <h2 style={{ marginBottom: 18 }}>New folder</h2>
            <input
              autoFocus
              placeholder="Untitled folder"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setFolderModal(false) }}
            />
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="ghost" onClick={() => setFolderModal(false)}>Cancel</button>
              <button className="primary" disabled={creating || !folderName.trim()} onClick={createFolder}>
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
