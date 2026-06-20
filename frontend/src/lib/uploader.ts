import { api } from './api'
import { encryptFile, type EncryptedFileMeta } from './crypto'

const UPLOAD_SEGMENT = 8 * 1024 * 1024 // 8 MiB browser -> server chunk (resumable)

export interface UploadHandle {
  promise: Promise<number>
  cancel: () => void
  onProgress?: (percent: number, message: string) => void
}

/**
 * Encrypt a file client-side, then stream the resulting ciphertext to the
 * Laravel append endpoint in 8 MiB resumable segments. On completion it tells
 * Laravel to split+push to Telegram.
 */
export function startEncryptedUpload(
  file: File,
  connectionId: number,
  masterKey: CryptoKey | undefined,
  onProgress?: (percent: number, message: string) => void,
): UploadHandle {
  let cancelled = false

  const run = async (): Promise<number> => {
    onProgress?.(0, 'Encrypting')
    const { blob, meta } = await encryptFile(file, masterKey)

    const { file: record, upload_url } = await api.initiateUpload({
      storage_connection_id: connectionId,
      original_name: file.name,
      size_bytes: blob.size,
      mime_type: file.type || null,
      checksum_sha256: meta.checksumSha256,
      encryption_iv: meta.iv,
      encrypted_key: meta.encryptedKey,
      key_metadata: meta.wrappedKeyIv ? JSON.stringify({ wrapped_key_iv: meta.wrappedKeyIv }) : null,
    })

    const fileId = record.id
    const total = blob.size
    let offset = 0

    while (offset < total) {
      if (cancelled) throw new Error('Upload cancelled')
      const slice = blob.slice(offset, Math.min(offset + UPLOAD_SEGMENT, total))
      const form = new FormData()
      form.append('chunk', slice, 'segment.bin')
      form.append('offset', String(offset))

      const res = await api.appendChunk(fileId, form, (p) => {
        const segStart = offset
        onProgress?.(0.1 + 0.9 * ((segStart + p * slice.size) / total), 'Uploading encrypted segments')
      })

      offset = res.offset
      onProgress?.(0.1 + 0.9 * (offset / total), 'Uploading encrypted segments')
    }

    onProgress?.(1, 'Finalizing — splitting and pushing to Telegram')
    await api.completeUpload(fileId)
    return fileId
  }

  return {
    promise: run(),
    cancel: () => {
      cancelled = true
    },
    onProgress,
  }
}

export function metaFromApi(file: {
  encryption_iv: string | null
  encrypted_key: string | null
  key_metadata: string | null
}): EncryptedFileMeta | null {
  if (!file.encryption_iv || !file.encrypted_key) return null
  let wrappedIv = ''
  try {
    wrappedIv = file.key_metadata ? JSON.parse(file.key_metadata).wrapped_key_iv ?? '' : ''
  } catch {
    wrappedIv = ''
  }
  return {
    encryptedKey: file.encrypted_key,
    iv: file.encryption_iv,
    wrappedKeyIv: wrappedIv,
    checksumSha256: null,
  }
}
