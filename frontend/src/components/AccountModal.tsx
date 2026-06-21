import { useState } from 'react'
import { api } from '../lib/api'
import { useSession } from '../lib/store'
import { Icon } from './Icon'

export function AccountModal({ onClose }: { onClose: () => void }) {
  const { user, setUser } = useSession()
  const [tab, setTab] = useState<'profile' | 'password'>('profile')

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const saveProfile = async () => {
    setSavingProfile(true)
    setProfileMsg(null)
    try {
      const updated = await api.updateProfile(name, email)
      setUser(updated)
      setProfileMsg({ ok: true, text: 'Profile updated.' })
    } catch (e: any) {
      const msg = e.response?.data?.errors
        ? Object.values(e.response.data.errors).flat().join(' ')
        : e.response?.data?.message || 'Could not update profile.'
      setProfileMsg({ ok: false, text: msg })
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async () => {
    setSavingPw(true)
    setPwMsg(null)
    try {
      await api.updatePassword(current, password, confirm)
      setPwMsg({ ok: true, text: 'Password changed.' })
      setCurrent(''); setPassword(''); setConfirm('')
    } catch (e: any) {
      const msg = e.response?.data?.errors
        ? Object.values(e.response.data.errors).flat().join(' ')
        : e.response?.data?.message || 'Could not change password.'
      setPwMsg({ ok: false, text: msg })
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 480 }}>
        <div className="spread" style={{ marginBottom: 18 }}>
          <div className="row" style={{ margin: 0, gap: 12 }}>
            <span className="avatar" style={{ width: 40, height: 40 }}>
              {(name || email || '?')[0].toUpperCase()}
            </span>
            <div className="col" style={{ gap: 2 }}>
              <strong>{user?.name}</strong>
              <span className="hint">{user?.email}</span>
            </div>
          </div>
          <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <div className="seg" style={{ marginBottom: 18, width: 'max-content' }}>
          <button className={tab === 'profile' ? 'active' : ''} style={{ width: 'auto', padding: '8px 16px' }} onClick={() => setTab('profile')}>
            <Icon name="edit" size={15} /> Profile
          </button>
          <button className={tab === 'password' ? 'active' : ''} style={{ width: 'auto', padding: '8px 16px' }} onClick={() => setTab('password')}>
            <Icon name="lock" size={15} /> Password
          </button>
        </div>

        {tab === 'profile' ? (
          <div className="col">
            <label>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            {profileMsg && (
              <div style={{ color: profileMsg.ok ? 'var(--ok)' : 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{profileMsg.text}</div>
            )}
            <button className="primary" disabled={savingProfile || !name.trim() || !email.trim()} onClick={saveProfile}>
              {savingProfile ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        ) : (
          <div className="col">
            <label>Current password</label>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="••••••••" />
            <label>New password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            <label>Confirm new password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat new password" />
            {pwMsg && (
              <div style={{ color: pwMsg.ok ? 'var(--ok)' : 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{pwMsg.text}</div>
            )}
            <button
              className="primary"
              disabled={savingPw || !current || password.length < 8 || password !== confirm}
              onClick={savePassword}
            >
              {savingPw ? 'Updating…' : 'Change password'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
