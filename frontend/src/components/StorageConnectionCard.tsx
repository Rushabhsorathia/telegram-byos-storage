import type { StorageConnection } from '../lib/types'
import { Icon } from './Icon'

export function StorageConnectionCard({ connection }: { connection: StorageConnection }) {
  if (!connection) return null
  const cls = connection.status === 'active' ? 'active' : connection.status === 'failed' ? 'failed' : 'pending'
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div className="spread">
        <div className="row" style={{ margin: 0, gap: 12 }}>
          <span className="file-icon" style={{ background: 'var(--accent-soft)', color: 'var(--brand)' }}><Icon name="bot" size={22} /></span>
          <div className="col" style={{ gap: 2 }}>
            <span style={{ fontWeight: 700 }}>@{connection.bot_username}</span>
            <span className="muted" style={{ fontSize: 13 }}>{connection.chat_title || `Chat ${connection.chat_id}`}</span>
          </div>
        </div>
        <span className={`tag ${cls}`}><span className={`dot ${cls}`} />{connection.status}</span>
      </div>
    </div>
  )
}
