import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../lib/api'
import { StorageConnectionCard } from '../components/StorageConnectionCard'

export default function StorageSettings() {
  const qc = useQueryClient()
  const { data, refetch } = useQuery({ queryKey: ['connections'], queryFn: api.connections })
  const [form, setForm] = useState({ bot_token: '', chat_id: '', chat_title: '', label: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.addConnection(form)
      setForm({ bot_token: '', chat_id: '', chat_title: '', label: '' })
      qc.invalidateQueries({ queryKey: ['connections'] })
    } catch (err: any) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setBusy(false)
    }
  }

  const connections = data?.connections ?? []

  return (
    <div>
      <h2>Storage connections</h2>
      <p className="muted">Each connection points at <em>your own</em> Telegram bot + private channel. We hold the index, never your files.</p>

      {connections.length === 0 ? (
        <div className="card">
          <h2>How to connect</h2>
          <ol className="muted" style={{ lineHeight: 1.8, paddingLeft: 18 }}>
            <li>Open <a href="https://t.me/BotFather" target="_blank" rel="noreferrer">@BotFather</a> → <code>/newbot</code> → copy the token.</li>
            <li>Create a private channel and add the bot as admin.</li>
            <li>Forward any message from the channel to the bot, or capture the numeric <code>chat_id</code>.</li>
            <li>Paste both below — we verify with a round-trip test upload/delete.</li>
          </ol>
        </div>
      ) : (
        connections.map((c: any) => (
          <div key={c.id}>
            <StorageConnectionCard connection={c} />
            <div className="row" style={{ marginTop: -8, marginBottom: 16, paddingLeft: 4 }}>
              <button className="ghost" onClick={async () => { await api.verifyConnection(c.id); refetch() }}>Verify now</button>
              <button className="danger" onClick={async () => { await api.deleteConnection(c.id); refetch() }}>Remove</button>
              {c.last_error && <span className="error">{c.last_error}</span>}
            </div>
          </div>
        ))
      )}

      <div className="card">
        <h2>Add a connection</h2>
        <form onSubmit={submit}>
          <input placeholder="Bot token (from BotFather)" value={form.bot_token} onChange={(e) => setForm({ ...form, bot_token: e.target.value })} required />
          <input placeholder="Channel/group chat_id (e.g. -1001234567890)" value={form.chat_id} onChange={(e) => setForm({ ...form, chat_id: e.target.value })} required />
          <input placeholder="Channel title (optional)" value={form.chat_title} onChange={(e) => setForm({ ...form, chat_title: e.target.value })} />
          <input placeholder="Label (optional)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          {error && <div className="error">{error}</div>}
          <button disabled={busy}>{busy ? 'Connecting…' : 'Connect'}</button>
        </form>
      </div>
    </div>
  )
}
