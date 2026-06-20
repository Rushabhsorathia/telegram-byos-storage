export interface User {
  id: number
  name: string
  email: string
  crypto_enabled: boolean
}

export interface StorageConnection {
  id: number
  label: string | null
  bot_username: string | null
  chat_id: string
  chat_title: string | null
  status: 'pending' | 'active' | 'failed'
  last_error: string | null
  verified_at: string | null
}

export interface FileRecord {
  id: number
  storage_connection_id: number
  original_name: string
  size_bytes: number
  mime_type: string | null
  checksum_sha256: string | null
  status: 'uploading' | 'processing' | 'complete' | 'failed' | 'deleted'
  total_chunks: number
  uploaded_chunks: number
  failure_reason: string | null
  created_at: string
  shares_count?: number
}

export interface Share {
  id: number
  token: string
  expires_at: string | null
  max_downloads: number | null
  download_count: number
}

export interface FileProgress {
  id: number
  status: FileRecord['status']
  total_chunks: number
  uploaded_chunks: number
  size_bytes: number
  message: string | null
}
