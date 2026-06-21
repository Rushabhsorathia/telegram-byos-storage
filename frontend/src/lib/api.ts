import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const http = axios.create({
  baseURL,
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use(async (config) => {
  // Ensure the CSRF cookie exists for stateful (cookie-session) requests.
  if (!document.cookie.includes('XSRF-TOKEN') && ['post', 'put', 'patch', 'delete'].includes((config.method || 'get').toLowerCase())) {
    await axios.get(`${baseURL}/sanctum/csrf-cookie`, { withCredentials: true })
  }
  return config
})

http.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/auth'
    }
    return Promise.reject(error)
  },
)

export const api = {
  async register(name: string, email: string, password: string, passwordConfirmation: string) {
    const { data } = await http.post('/api/register', { name, email, password, password_confirmation: passwordConfirmation })
    return data.user
  },
  async login(email: string, password: string, remember = false) {
    const { data } = await http.post('/api/login', { email, password, remember })
    return data.user
  },
  async logout() {
    await http.post('/api/logout')
  },
  async me() {
    const { data } = await http.get('/api/user')
    return data.user
  },
  async updateProfile(name: string, email: string) {
    const { data } = await http.patch('/api/user', { name, email })
    return data.user
  },
  async updatePassword(currentPassword: string, password: string, passwordConfirmation: string) {
    await http.patch('/api/user/password', {
      current_password: currentPassword,
      password,
      password_confirmation: passwordConfirmation,
    })
  },
  async saveMasterKey(salt: string, verifier: string) {
    await http.post('/api/crypto/master-key', { master_key_salt: salt, master_key_verifier: verifier })
  },
  async connections() {
    const { data } = await http.get('/api/storage-connections')
    return data
  },
  async addConnection(payload: { bot_token: string; chat_id: string; chat_title?: string; label?: string }) {
    const { data } = await http.post('/api/storage-connections', payload)
    return data.connection
  },
  async verifyConnection(id: number) {
    const { data } = await http.post(`/api/storage-connections/${id}/verify`)
    return data.connection
  },
  async deleteConnection(id: number) {
    await http.delete(`/api/storage-connections/${id}`)
  },
  async listFiles(page = 1) {
    const { data } = await http.get(`/api/files?page=${page}`)
    return data
  },
  async getFile(id: number) {
    const { data } = await http.get(`/api/files/${id}`)
    return data.file
  },
  async initiateUpload(payload: Record<string, unknown>) {
    const { data } = await http.post('/api/files', payload)
    return data
  },
  async appendChunk(fileId: number, formData: FormData, onProgress?: (pct: number) => void) {
    const { data } = await http.post(`/api/files/${fileId}/chunks`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(e.total ? e.loaded / e.total : 0),
    })
    return data
  },
  async completeUpload(fileId: number) {
    const { data } = await http.post(`/api/files/${fileId}/complete`)
    return data.file
  },
  async deleteFile(id: number, purgeRemote = true) {
    await http.delete(`/api/files/${id}`, { data: { purge_remote: purgeRemote } })
  },
  async createShare(fileId: number, payload: { password?: string; expires_at?: string; max_downloads?: number }) {
    const { data } = await http.post(`/api/files/${fileId}/share`, payload)
    return data.share
  },
  async drive(view: string, folder: string) {
    const { data } = await http.get('/api/drive', { params: { view, folder } })
    return data
  },
  async createFolder(name: string, parentId: string, color?: string) {
    const { data } = await http.post('/api/folders', { name, parent_id: parentId, color })
    return data.folder
  },
  async updateFolder(id: number, payload: Record<string, unknown>) {
    const { data } = await http.patch(`/api/folders/${id}`, payload)
    return data.folder
  },
  async deleteFolder(id: number) {
    await http.delete(`/api/folders/${id}`)
  },
  async updateFileMeta(id: number, payload: Record<string, unknown>) {
    const { data } = await http.patch(`/api/files/${id}/meta`, payload)
    return data.file
  },
  downloadUrl(id: number) {
    return `${baseURL}/api/files/${id}/download`
  },
  shareDownloadUrl(token: string) {
    return `${baseURL}/api/shares/${token}/download`
  },
}
