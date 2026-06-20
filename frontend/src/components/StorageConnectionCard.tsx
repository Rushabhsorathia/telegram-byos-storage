import type { StorageConnection } from '../lib/types'

export function StorageConnectionCard({ connection }: { connection: StorageConnection }) {
  if (!connection) return null
  return (
    <div className="card row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontWeight: 600 }}>@{connection.bot_username}</div>
        <div className="muted" style={{ fontSize: 13 }}>
          {connection.chat_title || `Chat ${connection.chat_id}`} · {connection.status}
        </div>
      </div>
      <span className={`tag ${connection.status === 'active' ? 'active' : connection.status === 'failed' ? 'failed' : 'pending'}`}>
        {connection.status}
      </span>
    </div>
  )
}
