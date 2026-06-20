import type { SVGProps } from 'react'

type IconName =
  | 'logo' | 'drive' | 'folder' | 'folder-open' | 'star' | 'star-filled'
  | 'clock' | 'trash' | 'bot' | 'settings' | 'search' | 'plus' | 'chevron-right'
  | 'grid' | 'list' | 'image' | 'video' | 'audio' | 'pdf' | 'doc' | 'sheet'
  | 'archive' | 'code' | 'file' | 'download' | 'share' | 'edit' | 'open'
  | 'restore' | 'logout' | 'upload' | 'check' | 'x' | 'lock' | 'shield' | 'link'
  | 'key' | 'chevron-down' | 'menu' | 'alert' | 'cloud' | 'hard-drive'

const P: SVGProps<SVGSVGElement> = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const paths: Record<IconName, JSX.Element> = {
  logo: <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z" />,
  drive: (
    <>
      <path d="m3 7 5-4h8l5 4-9 6-9-6Z" />
      <path d="M3 7v10l9 6 9-6V7" />
      <path d="M12 13v10" />
    </>
  ),
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
  'folder-open': (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3V7Z" />
      <path d="m3 10 2.2 8.2A1 1 0 0 0 6.2 19h12.6a1 1 0 0 0 1-.8L21 11H4a1 1 0 0 0-1 1Z" />
    </>
  ),
  star: <path d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8L6.6 19.6l1-6L3.3 9.4l6-.9L12 3Z" />,
  'star-filled': <path d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8L6.6 19.6l1-6L3.3 9.4l6-.9L12 3Z" fill="currentColor" stroke="none" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  bot: (
    <>
      <rect x="4" y="8" width="16" height="11" rx="3" />
      <path d="M12 8V4M9 4h6" />
      <circle cx="9" cy="13" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="13" r="1.2" fill="currentColor" stroke="none" />
      <path d="M2 13v3M22 13v3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.5l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9 2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.5 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9.6A1.7 1.7 0 0 0 11 2.6a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H22a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="3.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 16-5-5L5 21" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="5" width="14" height="14" rx="2" />
      <path d="m17 9 4-2v10l-4-2" />
    </>
  ),
  audio: (
    <>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </>
  ),
  pdf: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
      <path d="M14 2v6h6" />
    </>
  ),
  doc: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
      <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" />
    </>
  ),
  sheet: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </>
  ),
  archive: (
    <>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <path d="M10 12h4" />
    </>
  ),
  code: <path d="m8 6-6 6 6 6M16 6l6 6-6 6M14 4l-4 16" />,
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
      <path d="M14 2v6h6" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </>
  ),
  edit: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />,
  open: (
    <>
      <path d="M14 5h5v5" />
      <path d="M19 5 9 15" />
      <path d="M19 13v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
    </>
  ),
  restore: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v4h4" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5" />
      <path d="M5 12h11" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V3" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 21h14" />
    </>
  ),
  check: <path d="m4 12 5 5L20 6" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  shield: <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z" />,
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m10.8 12.2 8.2-8.2M16 4l3 3M14 6l3 3" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  alert: (
    <>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
  cloud: <path d="M7 18a4 4 0 0 1-.5-8A5 5 0 0 1 16 9a4 4 0 0 1 1 7.9" />,
  'hard-drive': (
    <>
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <path d="M5 13 7 6a2 2 0 0 1 2-1.5h6A2 2 0 0 1 17 6l2 7" />
      <path d="M7.5 16.5h.01" />
    </>
  ),
}

export function Icon({ name, size, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg {...P} width={size ?? P.width} height={size ?? P.height} {...rest} aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

/** Pick a professional icon for a file based on mime/extension. */
export function fileIconName(mime: string | null, name: string): IconName {
  const ext = (name.split('.').pop() || '').toLowerCase()
  if (mime?.startsWith('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  if (mime?.startsWith('video') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video'
  if (mime?.startsWith('audio') || ['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return 'audio'
  if (['pdf'].includes(ext)) return 'pdf'
  if (['doc', 'docx', 'txt', 'rtf', 'md'].includes(ext)) return 'doc'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet'
  if (['zip', 'rar', '7z', 'gz', 'tar'].includes(ext)) return 'archive'
  if (['js', 'ts', 'json', 'php', 'py', 'go', 'rs', 'java', 'html', 'css'].includes(ext)) return 'code'
  return 'file'
}

export type { IconName }
