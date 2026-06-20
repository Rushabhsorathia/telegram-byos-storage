import { Navigate, Route, Routes, useLocation, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from './lib/api'
import { useSession } from './lib/store'
import { initEcho } from './lib/echo'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import UploadPage from './pages/UploadPage'
import FileDetailPage from './pages/FileDetailPage'
import StorageSettings from './pages/StorageSettings'
import CryptoUnlockPage from './pages/CryptoUnlockPage'
import SharePage from './pages/SharePage'

function Topbar() {
  const loc = useLocation()
  const { user, clear } = useSession()
  if (!user) return null
  const link = (to: string, label: string) => (
    <Link to={to} className={loc.pathname === to ? 'active' : ''}>{label}</Link>
  )
  return (
    <div className="topbar">
      <div className="brand">Telegram Storage</div>
      <nav>
        {link('/dashboard', 'Files')}
        {link('/upload', 'Upload')}
        {link('/settings/storage', 'Connections')}
        <span className="muted" style={{ marginLeft: 8 }}>{user.email}</span>
        <button className="ghost" style={{ marginLeft: 12 }} onClick={async () => { await api.logout(); clear(); window.location.href = '/auth' }}>Logout</button>
      </nav>
    </div>
  )
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, crypto } = useSession()
  const loc = useLocation()
  if (!user) return <Navigate to="/auth" state={{ from: loc }} replace />
  if (!crypto.masterKey && user.crypto_enabled && loc.pathname !== '/unlock') {
    return <Navigate to="/unlock" replace />
  }
  return <>{children}</>
}

export default function App() {
  const { setUser } = useSession()

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    retry: false,
  })

  useEffect(() => {
    if (me) setUser(me)
    initEcho()
  }, [me, setUser])
  return (
    <div className="app-shell">
      <Topbar />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/unlock" element={<CryptoUnlockPage />} />
        <Route path="/s/:token" element={<SharePage />} />

        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/upload" element={<Protected><UploadPage /></Protected>} />
        <Route path="/files/:id" element={<Protected><FileDetailPage /></Protected>} />
        <Route path="/settings/storage" element={<Protected><StorageSettings /></Protected>} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  )
}
