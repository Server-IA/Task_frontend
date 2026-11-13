import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ImageOff } from 'lucide-react'
import { t } from '@/i18n'
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
  // Por imagen: si ya se pidió otra URL (una vencida se renueva una sola vez) y si definitivamente no carga. Antes,
  // con un archivo que ya no existe, cada URL nueva fallaba y pedía otra (una ráfaga) y nunca se veía el aviso
  const [failure, setFailure] = useState({ src: null, retried: false, failed: false })
  const current = failure.src === src ? failure : { src, retried: false, failed: false }

  if (missing || current.failed) {
    return (
      <span
        className={cn('flex min-h-24 items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/40 px-4 py-6 text-[13px] text-muted-foreground', className)}
        role="img"
        aria-label={alt ? t('{name} (no disponible)', { name: alt }) : t('Imagen no disponible')}
      >
        <ImageOff className="size-4" aria-hidden="true" />
        {alt ? t('«{name}» no está disponible', { name: alt }) : t('Imagen no disponible')}
      </span>
    )
  }
  if (loading || !url) {
    return <span className={cn('block h-40 animate-pulse rounded-lg bg-muted', className)} role="img" aria-label={alt || t('Imagen')} aria-busy="true" />
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
        // Una URL vencida: se pide otra una sola vez; si esa tampoco carga, se muestra que no está disponible
        if (fileId && !current.retried) {
          setFailure({ src, retried: true, failed: false })
          queryClient.invalidateQueries({ queryKey: fileUrlKey(fileId) })
        } else {
          setFailure({ src, retried: current.retried, failed: true })
        }
      }}
    />
  )
  if (!onClick) return <span className={cn('block', className)}>{image}</span>
  return (
    <button type="button" className={cn('block cursor-zoom-in rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none', className)} onClick={onClick} aria-label={alt ? t('Ver {name}', { name: alt }) : t('Ver imagen')}>
      {image}
    </button>
  )
}
