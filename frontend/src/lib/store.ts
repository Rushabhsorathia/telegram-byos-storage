import { create } from 'zustand'
import type { User } from './types'

interface CryptoSession {
  masterKey: CryptoKey | null
  unlockedAt: number
}

interface SessionState {
  user: User | null
  crypto: CryptoSession
  setUser: (u: User | null) => void
  setMasterKey: (k: CryptoKey | null) => void
  clear: () => void
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  crypto: { masterKey: null, unlockedAt: 0 },
  setUser: (u) => set({ user: u }),
  setMasterKey: (k) => set({ crypto: { masterKey: k, unlockedAt: k ? Date.now() : 0 } }),
  clear: () => set({ user: null, crypto: { masterKey: null, unlockedAt: 0 } }),
}))
