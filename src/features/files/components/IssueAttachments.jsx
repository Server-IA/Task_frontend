import { useId, useRef, useState } from 'react'
import { Download, ExternalLink, HardDrive, Lock, MoreHorizontal, Paperclip, RotateCw, Trash2, TriangleAlert, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/common/Loaders'
import { useWorkspace } from '@/features/workspaces/hooks'
import { formatDateTime, formatRelative } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { canDeleteFile } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/sessionStore'
import { useFileActions } from '../attachmentHooks'
import { attachmentsSummary, firstName, isPendingUpload, openActionOf, uploadRowOf, uploadsProgress, visibleUploads } from '../attachmentView'
import { fileReference } from '../fileRefs'
import { ATTACHMENT_ACCEPT, formatSize } from '../fileTypes'
import { useAttachFiles, useAttachments, useDeleteFile, useStorageUsage } from '../hooks'
import { attachmentScope, useUploads } from '../uploads'
import { FileBadge } from './FileBadge'
import { FileImage } from './FileImage'

/**
 * Adjuntos de la tarea: las imágenes en una cuadrícula (clic → visor) y el resto de archivos en filas (los PDF se abren
 * en otra pestaña, lo demás se descarga). Las subidas en curso de la tarea aparecen como filas con su avance (se
 * pueden cancelar) y las que fallaron, en rojo con su error («Reintentar» cuando tiene sentido). Eliminar es de quien
 * subió el archivo o del PM, con confirmación en la misma fila. Con el espacio del workspace lleno, «Adjuntar» se
 * desactiva y se explica por qué.
 * En la página completa (`variant="page"`) las imágenes van en 4 columnas y los archivos en 2.
 * @param {{ slug: string, projectId: string, issue: import('@/api/types').IssueResponse, variant?: 'panel' | 'page' }} props
 */
export function IssueAttachments({ slug, projectId, issue, variant = 'panel' }) {
  const page = variant === 'page'
  const headingId = useId()
  const inputRef = useRef(null)
  const [confirmingId, setConfirmingId] = useState(null)
  const { data: attachments = [], isLoading, error, refetch } = useAttachments(slug, projectId, issue.id)
  const { tasks, queue } = useUploads(attachmentScope(issue.id))
  const attach = useAttachFiles(slug, projectId, issue.id)
  const remove = useDeleteFile(slug, projectId, issue.id)
  const { data: usage } = useStorageUsage(slug)
  const { data: workspace } = useWorkspace(slug)
  const userId = useSessionStore((state) => state.user?.id)
  const actions = useFileActions()

  const images = attachments.filter((file) => file.image)
  const others = attachments.filter((file) => !file.image)
  const uploads = visibleUploads(tasks, attachments)
  const progress = uploadsProgress(uploads)
  const full = Boolean(usage?.full)
  const quota = usage ? formatSize(usage.quotaBytes) : '2 GB'
  const empty = attachments.length === 0 && uploads.length === 0
  const confirmingImage = images.find((file) => file.id === confirmingId)

  const fileProps = (file) => ({
    file,
    actions,
    canDelete: canDeleteFile(workspace?.myRole, file, userId),
    onAskDelete: () => setConfirmingId(file.id),
  })
  const confirmProps = (file) => ({
    file,
    pending: remove.isPending && remove.variables === file.id,
    onCancel: () => setConfirmingId(null),
    onConfirm: () =>
      remove.mutate(file.id, {
        onSuccess: () => {
          setConfirmingId(null)
          toast.success(`«${file.fileName}» eliminado`)
        },
        onError: (deleteError) => notifyError(deleteError),
      }),
  })
  const pick = () => inputRef.current?.click()

  return (
    <section aria-labelledby={headingId} className={cn('flex flex-col', page ? 'gap-3' : 'gap-2.5')}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={headingId} className={cn('font-semibold', page ? 'text-[15px]' : 'text-sm')}>
          Adjuntos
          {attachments.length > 0 && (
            <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">{attachmentsSummary(attachments)}</span>
          )}
        </h2>
        {progress && <UploadsPill progress={progress} onCancelAll={() => progress.ids.forEach((id) => queue.cancel(id))} />}
        <button
          type="button"
          onClick={pick}
          disabled={full}
          title={full ? `El workspace llegó a su límite de ${quota}` : 'Adjuntar archivos · también puedes arrastrarlos a la tarea'}
          className={cn(
            'ml-auto flex items-center gap-1.5 border transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50',
            page ? 'rounded-[10px] bg-card py-1.5 pr-3 pl-2.5 text-[13px] font-medium' : 'rounded-full py-1 pr-2.5 pl-2 text-xs',
          )}
        >
          <Paperclip className={page ? 'size-3.5' : 'size-3.25'} strokeWidth={2.2} aria-hidden="true" />
          Adjuntar
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          multiple
          hidden
          aria-hidden="true"
          tabIndex={-1}
          onChange={(event) => {
            const files = event.target.files ? [...event.target.files] : []
            if (files.length) attach(files)
            event.target.value = ''
          }}
        />
      </div>

      {full ? (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-late/25 bg-late-soft/50 px-3 py-2.5 text-[12.5px] leading-snug">
          <HardDrive className="mt-0.5 size-3.5 shrink-0 text-late" aria-hidden="true" />
          <span>
            <span className="font-semibold">El workspace llegó a su límite de {quota}.</span>{' '}
            <span className="text-muted-foreground">
              No se pueden adjuntar más archivos hasta liberar espacio: elimina los adjuntos que ya no se usen o pide al PM que
              revise el almacenamiento del workspace.
            </span>
          </span>
        </p>
      ) : (
        usage?.warning && (
          <p className="flex items-center gap-1.5 text-xs text-soon">
            <HardDrive className="size-3.5 shrink-0" aria-hidden="true" />
            El workspace usa el {usage.percent} % de su espacio ({formatSize(usage.usedBytes)} de {quota}).
          </p>
        )
      )}

      {error && (
        <p className="flex items-center gap-2 text-xs text-late">
          No se pudieron cargar los adjuntos.
          <button type="button" className="font-medium underline underline-offset-2" onClick={() => refetch()}>
            Reintentar
          </button>
        </p>
      )}

      {images.length > 0 && (
        <ul aria-label="Imágenes" className={cn('grid', page ? 'grid-cols-4 gap-3' : 'grid-cols-3 gap-2.5')}>
          {images.map((file) => (
            <ImageTile key={file.id} {...fileProps(file)} />
          ))}
        </ul>
      )}
      {confirmingImage && <DeleteConfirm {...confirmProps(confirmingImage)} />}

      {others.length > 0 && (
        <ul aria-label="Archivos" className={cn(page ? 'grid grid-cols-2 gap-2.5' : 'overflow-hidden rounded-xl border')}>
          {others.map((file, index) => (
            <li key={file.id} className={cn(page ? 'min-w-0 rounded-xl border' : index > 0 && 'border-t')}>
              <FileRow {...fileProps(file)} page={page} />
              {confirmingId === file.id && <DeleteConfirm {...confirmProps(file)} className="mx-2.5 mb-2.5 sm:ml-13" />}
            </li>
          ))}
        </ul>
      )}

      {uploads.length > 0 && (
        <ul aria-label="Subidas" className="overflow-hidden rounded-xl border">
          {uploads.map((task, index) => (
            <UploadRow key={task.id} task={task} first={index === 0} queue={queue} />
          ))}
        </ul>
      )}

      {isLoading ? null : empty || !page ? (
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-xl border border-dashed border-dash px-3 py-2.25 text-xs text-muted-foreground">
          <Upload className="size-3.5" aria-hidden="true" />
          <span>
            Arrastra archivos {page ? 'a la página' : 'al panel'} o{' '}
            <button
              type="button"
              onClick={pick}
              disabled={full}
              className="font-semibold text-accent-text hover:underline disabled:pointer-events-none disabled:opacity-50"
            >
              elige en tu equipo
            </button>
          </span>
          <span className="ml-auto font-mono text-[11px]">hasta 10 MB · imágenes 5 MB</span>
        </p>
      ) : (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Upload className="size-3.25" aria-hidden="true" />
          Arrastra archivos a la página para adjuntarlos ·<span className="font-mono text-[11px]">hasta 10 MB · imágenes 5 MB</span>
        </p>
      )}
    </section>
  )
}

/** «Ana · hace 3 días» (con la fecha completa en el título). */
function uploadedMeta(file, { short = false } = {}) {
  const who = short ? firstName(file.uploadedBy) : file.uploadedBy?.fullName
  return [who, formatRelative(file.createdAt)].filter(Boolean).join(' · ')
}

/** Una imagen adjunta: la miniatura abre el visor; al pasar el puntero, descargar y el menú ⋯. */
function ImageTile({ file, actions, canDelete, onAskDelete }) {
  return (
    <li className="flex min-w-0 flex-col gap-1.5">
      <div className="group/thumb relative aspect-[4/3] overflow-hidden rounded-[10px] border bg-muted outline-offset-2 outline-ring hover:outline-2">
        <button
          type="button"
          onClick={() => actions.open(file)}
          aria-label={`Ver ${file.fileName}`}
          className="absolute inset-0 block cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <FileImage
            src={file.reference || fileReference(file.id)}
            alt={file.fileName}
            className="size-full min-h-0 rounded-none border-0 py-0 text-xs"
            imgClassName="size-full rounded-none object-cover"
          />
        </button>
        <div className="pointer-events-none absolute inset-0 flex items-start justify-end gap-1 bg-linear-to-b from-[rgb(20_18_15/0.45)] to-transparent to-55% p-1.5 opacity-0 transition-opacity duration-150 group-focus-within/thumb:opacity-100 group-hover/thumb:opacity-100 has-data-[state=open]:opacity-100">
          <button
            type="button"
            onClick={() => actions.download(file.id)}
            aria-label={`Descargar ${file.fileName}`}
            title="Descargar"
            className="pointer-events-auto flex size-6.5 items-center justify-center rounded-[7px] bg-card text-foreground hover:bg-muted"
          >
            <Download className="size-3.25" strokeWidth={2.2} aria-hidden="true" />
          </button>
          <FileMenu
            file={file}
            actions={actions}
            canDelete={canDelete}
            onAskDelete={onAskDelete}
            className="pointer-events-auto size-6.5 rounded-[7px] bg-card text-foreground hover:bg-muted"
          />
        </div>
      </div>
      <span className="flex min-w-0 flex-col leading-[1.35]" title={formatDateTime(file.createdAt)}>
        <span className="truncate text-[13px] font-medium">{file.fileName}</span>
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {formatSize(file.size)} · {uploadedMeta(file, { short: true })}
        </span>
      </span>
    </li>
  )
}

/** Un archivo que no es imagen: clic → pestaña nueva (PDF) o descarga; descargar y el menú ⋯ a la derecha. */
function FileRow({ file, actions, canDelete, onAskDelete, page }) {
  const action = openActionOf(file)
  return (
    <div className="flex items-center gap-2.5 py-2.25 pr-2 pl-3 transition-colors hover:bg-subtle">
      <FileBadge name={file.fileName} />
      <button
        type="button"
        onClick={() => actions.open(file)}
        title={action === 'tab' ? 'Se abre en una pestaña nueva' : 'Se descarga con su nombre original'}
        className="flex min-w-0 flex-1 flex-col gap-0.75 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[13.5px] font-medium">{file.fileName}</span>
          {!page && <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{formatSize(file.size)}</span>}
        </span>
        <span className="truncate font-mono text-[11px] text-muted-foreground" title={formatDateTime(file.createdAt)}>
          {page ? `${formatSize(file.size)} · ` : ''}
          {uploadedMeta(file)}
        </span>
      </button>
      <span className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => actions.download(file.id)}
          aria-label={`Descargar ${file.fileName}`}
          title="Descargar"
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Download className="size-3.75" aria-hidden="true" />
        </button>
        <FileMenu
          file={file}
          actions={actions}
          canDelete={canDelete}
          onAskDelete={onAskDelete}
          className="size-7 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground data-[state=open]:bg-muted"
        />
      </span>
    </div>
  )
}

/** Menú ⋯ de un archivo: descargar, abrir en pestaña nueva (imágenes y PDF) y eliminar (quien lo subió o el PM). */
function FileMenu({ file, actions, canDelete, onAskDelete, className }) {
  const action = openActionOf(file)
  // Al elegir «Eliminar…» el foco no vuelve al botón ⋯: queda en la confirmación
  const askedRef = useRef(false)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`Más acciones para ${file.fileName}`} className={cn('flex items-center justify-center', className)}>
          <MoreHorizontal className="size-3.75" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-52"
        onCloseAutoFocus={(event) => {
          if (!askedRef.current) return
          askedRef.current = false
          event.preventDefault()
        }}
      >
        <DropdownMenuItem onSelect={() => actions.download(file.id)}>
          <Download />
          Descargar
        </DropdownMenuItem>
        {action !== 'download' && (
          <DropdownMenuItem onSelect={() => actions.openInTab(file.id)}>
            <ExternalLink />
            Abrir en pestaña nueva
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {canDelete ? (
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              askedRef.current = true
              onAskDelete()
            }}
          >
            <Trash2 />
            Eliminar…
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled className="items-start">
            <Lock className="mt-0.5" />
            <span className="flex flex-col gap-px">
              <span>Eliminar</span>
              <span className="text-[11.5px] leading-snug">
                Solo {firstName(file.uploadedBy) || 'quien lo subió'}
                {file.uploadedBy ? ' (quien lo subió)' : ''} o el PM
              </span>
            </span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** «¿Eliminar requisitos.pdf?» en la misma fila, con Cancelar / Eliminar. */
function DeleteConfirm({ file, pending, onCancel, onConfirm, className }) {
  const titleId = useId()
  const descriptionId = useId()
  return (
    <div
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={cn('flex flex-wrap items-center gap-2.5 rounded-[10px] border border-late/25 bg-late-soft/50 px-3 py-2.5', className)}
    >
      <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
        <span id={titleId} className="truncate text-[13px] font-semibold">
          ¿Eliminar {file.fileName}?
        </span>
        <span id={descriptionId} className="text-xs leading-snug text-muted-foreground">
          Se borra para todo el proyecto y no se puede deshacer.
        </span>
      </span>
      <Button size="sm" variant="outline" className="rounded-[9px]" onClick={onCancel} autoFocus>
        Cancelar
      </Button>
      <Button size="sm" className="rounded-[9px] bg-late font-semibold text-card hover:bg-late/90" onClick={onConfirm} disabled={pending}>
        {pending && <Spinner />}
        Eliminar
      </Button>
    </div>
  )
}

/** Una subida de la cola: en cola, subiendo (con su avance) o con error (en rojo, con «Reintentar» si sirve). */
function UploadRow({ task, first, queue }) {
  const row = uploadRowOf(task)
  const failed = row.state === 'error'
  return (
    <li className={cn('flex items-center gap-2.5 py-2.25 pr-2 pl-3', !first && 'border-t', failed && 'bg-late-soft/50')}>
      <FileBadge name={task.name} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.75">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className={cn('truncate text-[13.5px] font-medium', failed && 'text-muted-foreground')}>{task.name}</span>
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{formatSize(task.size)}</span>
        </span>
        {failed ? (
          <span className="flex items-start gap-1.25 text-xs leading-snug text-late">
            <TriangleAlert className="mt-0.5 size-3 shrink-0" strokeWidth={2.4} aria-hidden="true" />
            {row.label}
          </span>
        ) : row.state === 'uploading' ? (
          <span className="flex items-center gap-2.5">
            <span
              role="progressbar"
              aria-label={`Subiendo ${task.name}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={row.percent}
              className="h-1 flex-1 overflow-hidden rounded-full bg-column"
            >
              <span className="block h-full rounded-full bg-ring transition-[width] duration-200" style={{ width: `${row.percent}%` }} />
            </span>
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{row.label}</span>
          </span>
        ) : (
          <span className="font-mono text-[11px] text-muted-foreground">{row.label}</span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-0.5">
        {row.canRetry && (
          <Button size="xs" variant="outline" className="h-7 rounded-lg px-2.25 text-xs" onClick={() => queue.retry(task.id)}>
            <RotateCw aria-hidden="true" />
            Reintentar
          </Button>
        )}
        <button
          type="button"
          aria-label={`${row.dismissLabel}: ${task.name}`}
          title={row.dismissLabel}
          onClick={() => (isPendingUpload(task) ? queue.cancel(task.id) : queue.dismiss(task.id))}
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
        </button>
      </span>
    </li>
  )
}

/** «Subiendo 3 archivos ▬▬ 63 % · Cancelar todo»: varias subidas a la vez, en una pastilla junto al título. */
function UploadsPill({ progress, onCancelAll }) {
  return (
    <span role="status" className="flex items-center gap-2 rounded-full bg-accent-soft py-0.75 pr-1 pl-2.5 text-xs text-accent-text">
      <span className="font-semibold">Subiendo {progress.count} archivos</span>
      <span className="h-1 w-17.5 overflow-hidden rounded-full bg-ring/25" aria-hidden="true">
        <span className="block h-full rounded-full bg-ring transition-[width] duration-200" style={{ width: `${progress.percent}%` }} />
      </span>
      <span className="font-mono text-[11px]">{progress.percent} %</span>
      <button type="button" onClick={onCancelAll} className="rounded-full px-2 py-0.5 font-medium hover:bg-accent-text/10">
        Cancelar todo
      </button>
    </span>
  )
}
