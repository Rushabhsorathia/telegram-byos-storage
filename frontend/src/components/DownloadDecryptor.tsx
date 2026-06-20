import { useState } from 'react'
import { api, http } from '../lib/api'
import { decryptBlob } from '../lib/crypto'

export function DownloadDecryptor({
  token,
  fileName,
  password,
  iv,
}: {
  token: string
  fileName: string
  password: string
  iv: string | null
}) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const run = async () => {
    setBusy('Downloading')
    setError('')
    try {
      const res = await http.post(api.shareDownloadUrl(token), { password }, { responseType: 'blob' })
      setBusy('Decrypting')
      // For shares the data key is embedded (raw) in the encrypted_key field, which
      // the recipient reconstructs from the shared passphrase — for this demo we
      // attempt raw-key decryption if the key was not wrapped.
      const meta = {
        encryptedKey: '', // populated from out-of-band share for real zero-knowledge
        iv: iv || '',
        wrappedKeyIv: '',
        checksumSha256: null,
      }
      const decrypted = await decryptBlob(res.data, meta as any, undefined, fileName)
      const url = URL.createObjectURL(decrypted)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'Download failed')
    } finally {
      setBusy('')
    }
  }

  return (
    <div>
      <button onClick={run} disabled={!!busy}>{busy || 'Download & decrypt'}</button>
      {error && <div className="error">{error}</div>}
    </div>
  )
}
