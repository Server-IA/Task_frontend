import { Fragment, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Download, ExternalLink, ImageIcon, X } from 'lucide-react'
import { formatRelative } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { formatSize } from '../fileTypes'
import { downloadFile, useFileUrl } from '../fileUrls'
import { useResolvedSrc } from './FileImage'

/**
 * @typedef {{ id: string, name: string, group: 'descripción' | 'adjuntos' | 'comentarios', size?: number | null,
 *             author?: { fullName: string } | null, createdAt?: string | null }} ViewerImage
 */

const GROUP_LABEL = { descripción: 'la descripción', adjuntos: 'Adjuntos', comentarios: 'un comentario' }

/**
 * Visor de las imágenes de una tarea: todas en orden (descripción, adjuntos y comentarios), con ← → para cambiar,
 * «Ajustar» o «100 %», abrir en otra pestaña y descargar. Esc o un clic fuera de la imagen lo cierran.
 * @param {{ images: ViewerImage[], index: number, issueCode?: string, onIndexChange: (index: number) => void,
 *           onClose: () => void }} props
 */
export function ImageViewer({ images, index, issueCode, onIndexChange, onClose }) {
  const [actual, setActual] = useState(false)
  const [dimensions, setDimensions] = useState(null)
  const image = images[index]
  const count = images.length
  const go = (step) => {
    if (count < 2) return
    setDimensions(null)
    onIndexChange((index + step + count) % count)
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        go(1)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        go(-1)
      }
    }
    // En la captura: antes que el panel o el editor que están detrás
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  })

  if (!image) return null
  const meta = [
    image.size ? formatSize(image.size) : null,
    dimensions ? `${dimensions.width} × ${dimensions.height}` : null,
    image.author?.fullName?.split(' ')[0] ?? null,
    image.createdAt ? formatRelative(image.createdAt) : null,
  ].filter(Boolean)
  const groups = ['descripción', 'adjuntos', 'comentarios']
    .map((group) => ({ group, items: images.map((item, position) => ({ item, position })).filter(({ item }) => item.group === group) }))
    .filter((group) => group.items.length > 0)

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={issueCode ? `Visor de imágenes de ${issueCode}` : 'Visor de imágenes'}
      className="fixed inset-0 z-[70] flex flex-col bg-background/97 text-foreground backdrop-blur-sm"
    >
      <header className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3.5 border-b px-4.5 py-3.5">
        <span className="flex min-w-0 items-center gap-3.5">
          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-muted text-muted-foreground" aria-hidden="true">
            <ImageIcon className="size-4" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[15px] font-semibold">{image.name}</span>
            <span className="truncate font-mono text-[11.5px] text-muted-foreground">
              {meta.join(' · ')}
              {meta.length > 0 && ' · '}
              en {GROUP_LABEL[image.group]}
              {issueCode && (
                <>
                  {' de '}
                  <span className="text-accent-text">{issueCode}</span>
                </>
              )}
            </span>
          </span>
        </span>
        <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{index + 1}</span> de {count}
        </span>
        <span className="flex items-center justify-self-end gap-1.5">
          <span role="group" aria-label="Zoom" className="flex rounded-[10px] border p-[3px] text-[12.5px]">
            <button
              type="button"
              aria-pressed={!actual}
              onClick={() => setActual(false)}
              className={cn('rounded-[7px] px-2.5 py-1', !actual ? 'bg-accent-soft font-semibold text-accent-text' : 'hover:bg-muted')}
            >
              Ajustar
            </button>
            <button
              type="button"
              aria-pressed={actual}
              onClick={() => setActual(true)}
              className={cn('rounded-[7px] px-2.5 py-1 font-mono text-xs', actual ? 'bg-accent-soft font-semibold text-accent-text' : 'hover:bg-muted')}
            >
              100 %
            </button>
          </span>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <NewTabLink id={image.id} />
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[13px] font-medium hover:bg-muted"
            onClick={() => downloadFile(image.id).catch((error) => notifyError(error, 'No se pudo descargar'))}
          >
            <Download className="size-4" aria-hidden="true" />
            Descargar
          </button>
          <button type="button" aria-label="Cerrar (Esc)" title="Cerrar · esc" onClick={onClose} className="rounded-[10px] p-2 hover:bg-muted">
            <X className="size-4" aria-hidden="true" />
          </button>
        </span>
      </header>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center gap-4 px-5 py-6"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
        {count > 1 && (
          <NavButton label={`Imagen anterior: ${images[(index - 1 + count) % count].name}`} title="Anterior · ←" onClick={() => go(-1)}>
            <ChevronLeft className="size-5" aria-hidden="true" />
          </NavButton>
        )}
        <div
          className={cn('flex min-h-0 min-w-0 flex-1 justify-center self-stretch', actual ? 'overflow-auto items-start' : 'items-center')}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
        >
          <ViewerImageContent key={image.id} image={image} actual={actual} onLoad={setDimensions} />
        </div>
        {count > 1 && (
          <NavButton label={`Imagen siguiente: ${images[(index + 1) % count].name}`} title="Siguiente · →" onClick={() => go(1)}>
            <ChevronRight className="size-5" aria-hidden="true" />
          </NavButton>
        )}
      </div>

      <footer className="flex items-end gap-4.5 border-t px-4.5 pt-3 pb-4">
        <ol aria-label="Imágenes de la tarea" className="flex flex-1 justify-center gap-4.5">
          {groups.map(({ group, items }) => (
            <li key={group} className="flex flex-col gap-1.5">
              <span className="font-mono text-[10.5px] tracking-[0.06em] text-muted-foreground uppercase">{group}</span>
              <span className="flex gap-2">
                {items.map(({ item, position }) => (
                  <Fragment key={item.id}>
                    <Thumbnail image={item} current={position === index} onClick={() => onIndexChange(position)} />
                  </Fragment>
                ))}
              </span>
            </li>
          ))}
        </ol>
        <span className="shrink-0 font-mono text-[11px] leading-relaxed text-muted-foreground">
          <kbd className="text-foreground">← →</kbd> cambiar
          <br />
          <kbd className="text-foreground">esc</kbd> o clic fuera para cerrar
        </span>
      </footer>
    </div>,
    document.body,
  )
}

function NavButton({ label, title, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      onClick={onClick}
      className="flex size-11 shrink-0 items-center justify-center rounded-full border bg-card shadow-[0_8px_20px_rgb(35_32_27/0.12)] hover:bg-muted"
    >
      {children}
    </button>
  )
}

function ViewerImageContent({ image, actual, onLoad }) {
  const { url, loading, missing } = useResolvedSrc(`/files/${image.id}`)
  if (missing) return <p className="self-center text-sm text-muted-foreground">Esta imagen ya no está disponible.</p>
  if (loading || !url) return <span className="size-40 animate-pulse self-center rounded-xl bg-muted" aria-busy="true" />
  return (
    <img
      src={url}
      alt={image.name}
      onLoad={(event) => onLoad({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
      className={cn(
        'rounded-xl shadow-[0_30px_80px_rgb(35_32_27/0.22)]',
        actual ? 'max-w-none' : 'max-h-full max-w-full object-contain',
      )}
    />
  )
}

function Thumbnail({ image, current, onClick }) {
  const { url } = useResolvedSrc(`/files/${image.id}`)
  const label = image.group === 'comentarios' && image.author ? `${image.name} · ${image.author.fullName.split(' ')[0]}` : image.name
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-current={current || undefined}
      onClick={onClick}
      className={cn(
        'relative h-[50px] w-[72px] overflow-hidden rounded-[9px] border-2 bg-subtle',
        current ? 'border-ring opacity-100' : 'border-transparent opacity-70 hover:opacity-100',
      )}
    >
      {url && <img src={url} alt="" className="size-full object-cover" loading="lazy" />}
    </button>
  )
}

function NewTabLink({ id }) {
  const { data } = useFileUrl(id)
  return (
    <a
      href={data?.url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      title="Abrir en pestaña nueva"
      aria-disabled={!data?.url || undefined}
      onClick={(event) => !data?.url && event.preventDefault()}
      className="flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[13px] font-medium hover:bg-muted"
    >
      <ExternalLink className="size-4" aria-hidden="true" />
      Pestaña nueva
    </a>
  )
}
