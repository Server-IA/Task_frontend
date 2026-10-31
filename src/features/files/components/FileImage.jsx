import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { localPreview, parseFileReference } from '../fileRefs'
import { fileUrlKey, useFileUrl } from '../fileUrls'

/**
 * La URL que se puede poner en un `<img>` para `src`: una referencia `/files/<id>` se resuelve a su URL firmada (o a la
 * vista previa local, si se subió en esta pestaña); un `blob:` o un `data:` se usan tal cual. Una URL de otro sitio
 * solo si `external` (las fotos de perfil antiguas).
 * @param {string | null | undefined} src
 * @param {{ external?: boolean }} [options]
 * @returns {{ url: string | undefined, loading: boolean, missing: boolean, fileId: string | null }}
 */
export function useResolvedSrc(src, { external = false } = {}) {
  const reference = parseFileReference(src)
  const preview = reference ? localPreview(reference.id) : undefined
  const { data, isLoading, isError } = useFileUrl(reference && !preview ? reference.id : null)
  if (reference) {
    const url = preview ?? data?.url
    return { url, loading: !url && isLoading, missing: !url && !isLoading && (isError || data === null), fileId: reference.id }
  }
  const local = /^(blob:|data:image\/)/.test(src ?? '')
  const allowed = local || (external && /^https?:\/\//.test(src ?? ''))
  return { url: allowed ? src : undefined, loading: false, missing: !allowed, fileId: null }
}

/**
 * Imagen de un archivo subido (o una vista previa local). Mientras llega su URL ocupa su lugar con un fondo; si no se
 * puede ver (se borró, no hay acceso), lo dice. Si la URL ya venció (una pestaña que quedó abierta), se pide otra.
 * @param {{ src: string, alt?: string, className?: string, imgClassName?: string, onClick?: () => void,
 *           draggable?: boolean }} props
 */
export function FileImage({ src, alt = '', className, imgClassName, onClick, draggable = false }) {
  const queryClient = useQueryClient()
  const { url, loading, missing, fileId } = useResolvedSrc(src)
  const [failedUrl, setFailedUrl] = useState(null)

  if (missing || (url && failedUrl === url && !fileId)) {
    return (
      <span
        className={cn('flex min-h-24 items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/40 px-4 py-6 text-[13px] text-muted-foreground', className)}
        role="img"
        aria-label={alt ? `${alt} (no disponible)` : 'Imagen no disponible'}
      >
        <ImageOff className="size-4" aria-hidden="true" />
        {alt ? `«${alt}» no está disponible` : 'Imagen no disponible'}
      </span>
    )
  }
  if (loading || !url) {
    return <span className={cn('block h-40 animate-pulse rounded-lg bg-muted', className)} role="img" aria-label={alt || 'Imagen'} aria-busy="true" />
  }
  const image = (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={draggable}
      className={cn('block max-w-full rounded-lg', imgClassName)}
      onError={() => {
        // Una URL vencida: se pide otra una vez
        if (fileId && failedUrl !== url) {
          setFailedUrl(url)
          queryClient.invalidateQueries({ queryKey: fileUrlKey(fileId) })
        } else {
          setFailedUrl(url)
        }
      }}
    />
  )
  if (!onClick) return <span className={cn('block', className)}>{image}</span>
  return (
    <button type="button" className={cn('block cursor-zoom-in rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none', className)} onClick={onClick} aria-label={alt ? `Ver ${alt}` : 'Ver imagen'}>
      {image}
    </button>
  )
}
