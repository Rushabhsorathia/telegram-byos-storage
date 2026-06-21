import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './lib/api'
import { useSession } from './lib/store'
import { initEcho } from './lib/echo'
import DriveLayout from './components/DriveLayout'
import Drive from './pages/Drive'
import AuthPage from './pages/AuthPage'
import UploadPage from './pages/UploadPage'
import FileDetailPage from './pages/FileDetailPage'
import StorageSettings from './pages/StorageSettings'
import CryptoUnlockPage from './pages/CryptoUnlockPage'
import SharePage from './pages/SharePage'
import { Icon } from './components/Icon'

function Protected({ authReady, children }: { authReady: boolean; children: React.ReactNode }) {
  const { user, crypto } = useSession()
  const loc = useLocation()
  // While the session is still being verified on load, render nothing instead
  // of prematurely redirecting to /auth (which would flash the login screen on refresh).
  if (!authReady) return <Splash />
  if (!user) return <Navigate to="/auth" state={{ from: loc }} replace />
  if (!crypto.masterKey && user.crypto_enabled && loc.pathname !== '/unlock') {
    return <Navigate to="/unlock" replace />
  }
  return <>{children}</>
}

function Splash() {
  return (
    <div className="center" style={{ marginTop: '18vh' }}>
      <div className="brand-hero" style={{ marginBottom: 0 }}>
        <div className="logo-lg" style={{ width: 48, height: 48 }}><Icon name="logo" size={22} /></div>
      </div>
      <p className="muted" style={{ marginTop: 14 }}>Loading your drive…</p>
    </div>
  )
}

export default function App() {
  const { setUser } = useSession()
  const qc = useQueryClient()

  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    retry: false,
  })

  useEffect(() => {
    if (me) {
      // If the authenticated user changed (new login / different session),
      // wipe cached server data so no other user's files/connections leak.
      const prev = (window as any).__uid
      if (prev && prev !== me.id) {
        qc.clear()
      }
      setUser(me)
      ;(window as any).__uid = me.id
    }
    initEcho()
  }, [me, setUser, qc])

  const authReady = !isLoading

  return (
    <Routes>
      <Route path="/auth" element={authReady && me ? <Navigate to="/drive" replace /> : <AuthPage />} />
      <Route path="/unlock" element={<CryptoUnlockPage />} />
      <Route path="/s/:token" element={<SharePage />} />

      <Route element={<Protected authReady={authReady}><DriveLayout /></Protected>}>
        <Route path="/drive" element={<Drive view="my" />} />
        <Route path="/drive/f/:folderId" element={<Drive view="my" />} />
        <Route path="/starred" element={<Drive view="starred" />} />
        <Route path="/recent" element={<Drive view="recent" />} />
        <Route path="/trash" element={<Drive view="trash" />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/files/:id" element={<FileDetailPage />} />
        <Route path="/settings/storage" element={<StorageSettings />} />
      </Route>

      <Route path="/dashboard" element={<Navigate to="/drive" replace />} />
      <Route path="*" element={<Navigate to="/drive" replace />} />
    </Routes>
  )
}
