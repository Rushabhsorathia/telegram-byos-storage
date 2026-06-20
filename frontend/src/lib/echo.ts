import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

declare global {
  interface Window {
    Echo: Echo<'reverb'>
    Pusher: typeof Pusher
  }
}

let initialized = false

export function initEcho() {
  if (initialized) return window.Echo
  const key = import.meta.env.VITE_REVERB_APP_KEY
  if (!key) {
    // Reverb key not configured (e.g. .env missing) — skip realtime safely.
    return null
  }
  window.Pusher = Pusher
  window.Echo = new Echo<'reverb'>({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT),
    forceTLS: String(import.meta.env.VITE_REVERB_SCHEME) === 'https',
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
    cluster: '',
  })
  initialized = true
  return window.Echo
}

export { Pusher }
