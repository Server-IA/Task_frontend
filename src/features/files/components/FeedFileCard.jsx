import { cn } from '@/lib/utils'
import { useFileActions } from '../attachmentHooks'
import { fileReference } from '../fileRefs'
import { formatSize, kindLabel } from '../fileTypes'
import { FileBadge } from './FileBadge'
import { FileImage } from './FileImage'

/**
 * Tarjeta del archivo adjuntado en el feed de actividad: miniatura (o la insignia del tipo), nombre y «1,8 MB · imagen».
 * Un clic lo abre: imágenes y PDF en otra pestaña (fuera de la tarea no hay visor), el resto se descarga.
 * @param {{ file: { id: string, fileName: string, contentType: string, size: number, image: boolean }, className?: string }} props
 */
export function FeedFileCard({ file, className }) {
  const actions = useFileActions()
  return (
    <button
      type="button"
      onClick={() => actions.open(file)}
      title={file.image ? 'Ver la imagen' : 'Abrir el archivo'}
      className={cn(
        'flex max-w-full items-center gap-2.5 rounded-[10px] border py-1.25 pr-3 pl-1.25 text-left transition-colors hover:bg-subtle',
        className,
      )}
    >
      {file.image ? (
        <span aria-hidden="true" className="h-9 w-13 shrink-0 overflow-hidden rounded-md bg-muted">
          {/* Si ya no se puede ver, queda solo el icono (sin el texto, que no cabe) */}
          <FileImage
            src={fileReference(file.id)}
            alt={file.fileName}
            className="size-full min-h-0 gap-0 rounded-none border-0 p-0 text-[0px]"
            imgClassName="size-full rounded-none object-cover"
          />
        </span>
      ) : (
        <span aria-hidden="true" className="flex h-9 w-13 shrink-0 items-center justify-center rounded-md bg-muted">
          <FileBadge name={file.fileName} className="h-7 w-6 pb-1 text-[7px]" />
        </span>
      )}
      <span className="flex min-w-0 flex-col leading-[1.3]">
        <span className="truncate text-[13px] font-medium">{file.fileName}</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {formatSize(file.size)} · {kindLabel(file.contentType)}
        </span>
      </span>
    </button>
  )
}
