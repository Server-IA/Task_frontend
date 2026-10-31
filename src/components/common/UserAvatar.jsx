import { useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useResolvedSrc } from '@/features/files/components/FileImage'
import { parseFileReference } from '@/features/files/fileRefs'
import { fileUrlKey } from '@/features/files/fileUrls'
import { cn } from '@/lib/utils'

const SIZES = {
  xs: 'size-5',
  sm: 'size-6',
  md: 'size-8',
  lg: 'size-12',
  xl: 'size-20',
}

/** Tamaño de las iniciales. Va en el `AvatarFallback` (trae su propio `text-sm`, que pisaba al del contenedor). */
const TEXT_SIZES = {
  xs: 'text-[10px]',
  sm: 'text-[11px]',
  md: 'text-xs',
  lg: 'text-base',
  xl: 'text-2xl',
}

/** Paleta pastel para el fondo de las iniciales (texto oscuro); el color depende del nombre para que sea estable. */
const COLORS = [
  'bg-[#FFB8D2]',
  'bg-[#7FE0C4]',
  'bg-[#B6A6FF]',
  'bg-[#FFC145]',
  'bg-[#8CCBFF]',
  'bg-[#F6A35C]',
  'bg-[#9BE7B4]',
  'bg-[#E4CF9C]',
]

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

/** Clase de color del avatar para un nombre (la misma en toda la app). */
export function avatarColor(name = '') {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return COLORS[Math.abs(hash) % COLORS.length]
}

/** Una URL vencida se vuelve a pedir, pero no más de una vez por minuto (si la nueva también falla, quedan las iniciales). */
const RETRY_EVERY_MS = 60_000

/**
 * La foto de un archivo subido (`/files/<id>`): se pide su URL firmada (junto con las de los demás avatares de la
 * pantalla). Mientras llega, si no se puede ver o sin sesión, el `AvatarFallback` muestra las iniciales.
 */
function FileAvatarImage({ src, alt, className }) {
  const queryClient = useQueryClient()
  const { url, fileId } = useResolvedSrc(src, { external: true })
  const lastRetry = useRef(0)
  if (!url) return null
  return (
    <AvatarImage
      src={url}
      alt={alt}
      className={className}
      onLoadingStatusChange={(status) => {
        // La URL venció (una pestaña que quedó abierta): se pide otra
        if (status !== 'error' || !fileId || Date.now() - lastRetry.current < RETRY_EVERY_MS) return
        lastRetry.current = Date.now()
        queryClient.invalidateQueries({ queryKey: fileUrlKey(fileId) })
      }}
    />
  )
}

/**
 * La imagen de un avatar (va dentro de `Avatar`, antes del `AvatarFallback`): una foto subida (`/files/<id>`), una URL
 * antigua (http/https) o nada.
 * @param {{ src?: string | null, alt?: string, className?: string }} props
 */
export function AvatarPhoto({ src, alt = '', className }) {
  if (!src) return null
  if (parseFileReference(src)) return <FileAvatarImage key={src} src={src} alt={alt} className={className} />
  // Las fotos antiguas (enlaces) y las vistas previas locales se usan tal cual, sin pedir nada
  if (!/^(https?:\/\/|blob:|data:image\/)/.test(src)) return null
  return <AvatarImage src={src} alt={alt} className={className} />
}

/** @param {{ user?: import('@/api/types').UserSummary | null, size?: keyof SIZES, className?: string }} props */
export function UserAvatar({ user, size = 'md', className }) {
  const name = user?.fullName ?? ''
  return (
    <Avatar className={cn(SIZES[size], className)} title={name}>
      <AvatarPhoto src={user?.avatarUrl} alt={name} />
      <AvatarFallback className={cn('font-bold text-[#23201B]', TEXT_SIZES[size], avatarColor(name))}>{initials(name)}</AvatarFallback>
    </Avatar>
  )
}
