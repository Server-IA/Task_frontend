import { useSyncExternalStore } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import { RotateCw, Trash2, X } from 'lucide-react'
import { FileImage } from '@/features/files/components/FileImage'
import { formatSize } from '@/features/files/fileTypes'
import { uploadQueue } from '@/features/files/uploadQueue'
import { cn } from '@/lib/utils'

/** La subida de una imagen de la cola (o `undefined` si ya no está: se canceló). */
function useUploadTask(id) {
  return useSyncExternalStore(
    uploadQueue.subscribe,
    () => (id ? uploadQueue.get(id) : undefined),
    () => undefined,
  )
}

const STATUS = {
  queued: 'En cola…',
  confirming: 'Comprobando…',
}

/**
 * Imagen dentro del editor. Mientras sube se ve su vista previa local con el avance y «Cancelar» (si falla, el aviso con
 * «Reintentar»: el texto se guarda igual, sin la imagen). Ya subida: «Ajustada» o «Ancho completo», quitarla y el pie
 * de foto.
 */
export function ImageNodeView({ node, updateAttributes, deleteNode, selected, editor }) {
  const { src, alt, title, wide, uploadId } = node.attrs
  const task = useUploadTask(uploadId)
  const editable = editor.isEditable

  if (uploadId) {
    const failed = task?.status === 'error'
    const percent = Math.round((task?.progress ?? 0) * 100)
    const status = !task ? '' : failed ? task.error || 'No se pudo subir.' : task.status === 'uploading' ? `Subiendo… ${percent} % · ${formatSize(task.size)}` : STATUS[task.status] ?? ''
    return (
      <NodeViewWrapper className="tf-md-figure" data-drag-handle="">
        <div className={cn('relative inline-block max-w-full overflow-hidden rounded-xl border bg-subtle', failed && 'border-destructive/40')} contentEditable={false}>
          <img src={src} alt={alt} className={cn('block max-h-[420px] max-w-full object-contain', failed ? 'opacity-40' : 'opacity-70')} draggable={false} />
          <div
            role="status"
            aria-label={failed ? `No se pudo subir ${alt}` : `Subiendo ${alt}, ${percent} %`}
            className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-[10px] border bg-card/95 px-3 py-2 shadow-sm backdrop-blur"
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="truncate font-medium">{alt}</span>
                <span className={cn('shrink-0 font-mono text-[11px]', failed ? 'text-destructive' : 'text-muted-foreground')}>{failed ? 'No se pudo subir' : status}</span>
              </span>
              {failed ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">{status} El texto se guarda igual.</span>
              ) : (
                <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <span className="block h-full rounded-full bg-ring transition-[width] duration-200" style={{ width: `${task?.status === 'queued' ? 0 : percent}%` }} />
                </span>
              )}
            </span>
            {failed && task?.retryable && (
              <button type="button" className="flex shrink-0 items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs font-medium hover:bg-muted" onClick={() => uploadQueue.retry(uploadId)}>
                <RotateCw className="size-3" aria-hidden="true" />
                Reintentar
              </button>
            )}
            <button
              type="button"
              className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => {
                // Al salir de la cola, el editor quita la imagen (syncUploadingImages)
                if (failed) uploadQueue.dismiss(uploadId)
                else uploadQueue.cancel(uploadId)
              }}
            >
              {failed ? <X className="size-3.5" aria-label="Quitar" /> : 'Cancelar'}
            </button>
          </div>
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper className="tf-md-figure group/image" data-wide={wide || undefined} data-drag-handle="">
      <div className={cn('relative', !wide && 'inline-block max-w-full')} contentEditable={false}>
        <FileImage src={src} alt={alt} className={cn('tf-md-figure-frame', selected && 'outline-2 outline-offset-2 outline-ring')} imgClassName="tf-md-image" />
        {editable && (
          <div
            role="toolbar"
            aria-label="Imagen"
            className="absolute top-2 right-2 flex items-center gap-0.5 rounded-[10px] border bg-card/95 p-0.5 opacity-0 shadow-sm transition-opacity group-hover/image:opacity-100 focus-within:opacity-100"
          >
            {[
              [false, 'Ajustada'],
              [true, 'Ancho completo'],
            ].map(([value, label]) => (
              <button
                key={label}
                type="button"
                aria-pressed={Boolean(wide) === value}
                className={cn('rounded-[8px] px-2 py-1 text-xs font-medium', Boolean(wide) === value ? 'bg-accent-soft text-accent-text' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
                onClick={() => updateAttributes({ wide: value })}
              >
                {label}
              </button>
            ))}
            <span className="mx-0.5 h-4 w-px bg-border" aria-hidden="true" />
            <button type="button" aria-label="Quitar imagen" title="Quitar imagen" className="rounded-[8px] p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => deleteNode()}>
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      {editable ? (
        (selected || title) && (
          <input
            className="mt-1.5 block w-full max-w-[560px] bg-transparent text-[13px] text-muted-foreground outline-none placeholder:text-dash"
            placeholder="Pie de foto (opcional)"
            aria-label="Pie de foto"
            maxLength={200}
            value={title ?? ''}
            onChange={(event) => updateAttributes({ title: event.target.value || null })}
          />
        )
      ) : (
        title && <figcaption>{title}</figcaption>
      )}
    </NodeViewWrapper>
  )
}
