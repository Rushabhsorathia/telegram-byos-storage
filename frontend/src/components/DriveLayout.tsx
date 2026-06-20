import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useSession } from '../lib/store'
import { useEffect, useRef, useState } from 'react'
import { Icon, type IconName } from './Icon'

function fmtBytes(n: number) {
  if (!n) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(n) / Math.log(1024))
  return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`
}

export default function DriveLayout() {
  const loc = useLocation()
  const nav = useNavigate()
  const { user, clear } = useSession()
  const qc = useQueryClient()
  const [usage, setUsage] = useState<number>(0)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.connections().then((d) => setUsage(d.usage_bytes ?? 0)).catch(() => {})
  }, [loc.pathname])

  // Close menus on route change
  useEffect(() => {
    setUserMenuOpen(false)
    setMobileNavOpen(false)
  }, [loc.pathname])

  // Click-outside to close the avatar dropdown
  useEffect(() => {
    if (!userMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userMenuOpen])

  // /drive should only be "active" exactly on root, not inside a folder breadcrumb
  const isActive = (to: string) => {
    if (to === '/drive') return loc.pathname === '/drive'
    return loc.pathname === to || loc.pathname.startsWith(to + '/')
  }

  const go = (to: string) => {
    qc.invalidateQueries({ queryKey: ['drive'] })
    nav(to)
  }

  const navItem = (to: string, ico: IconName, label: string) => (
    <Link
      to={to}
      className={`nav-item ${isActive(to) ? 'active' : ''}`}
      onClick={() => qc.invalidateQueries({ queryKey: ['drive'] })}
    >
      <span className="ico"><Icon name={ico} size={18} /></span> {label}
    </Link>
  )

  const quota = Math.min(100, (usage / (15 * 1024 ** 3)) * 100)
  const sidebar = (
    <>
      <div className="sidebar-brand">
        <span className="logo"><Icon name="logo" size={20} /></span>
        <span className="name">Telegram<span>Storage</span></span>
      </div>

      <button className="new-btn" onClick={() => go('/upload')}>
        <span className="plus"><Icon name="plus" size={16} /></span> New
      </button>

      <nav className="nav-section">
        {navItem('/drive', 'drive', 'My Drive')}
        {navItem('/starred', 'star', 'Starred')}
        {navItem('/recent', 'clock', 'Recent')}
        {navItem('/trash', 'trash', 'Trash')}
      </nav>

      <nav className="nav-section">
        {navItem('/settings/storage', 'bot', 'Connections')}
      </nav>

      <div className="sidebar-storage">
        <div className="hint"><strong>Storage</strong></div>
        <div className="storage-bar"><div style={{ width: `${quota}%` }} /></div>
        <div className="hint">{fmtBytes(usage)} used on your Telegram</div>
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
          <Icon name="search" size={18} />
          <input placeholder="Search in Drive (visual only)" />
        </div>
        <div className="topbar-actions">
          <button className="icon-btn" title="Settings" onClick={() => go('/settings/storage')}>
            <Icon name="settings" size={19} />
          </button>
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
                  <div style={{ fontWeight: 600 }}>{user?.name}</div>
                  <div className="hint">{user?.email}</div>
                </div>
                <button onClick={async () => { await api.logout(); clear(); nav('/auth') }}>
                  <Icon name="logout" size={17} /> Sign out
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
    </div>
  )
}
