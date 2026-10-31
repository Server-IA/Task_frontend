import { useState } from 'react'
import { Link } from 'react-router'
import { Download, HardDrive, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState, ErrorState } from '@/components/common/States'
import { fileBadge } from '@/features/files/attachmentView'
import { formatSize } from '@/features/files/fileTypes'
import { downloadFile } from '@/features/files/fileUrls'
import { useDeleteStoredFile, useStorageReport } from '@/features/files/storageHooks'
import {
  formatGigabytes,
  formatPercent,
  freeBytes,
  kindSegments,
  projectBars,
  uploadedWhen,
  usageBarLabel,
} from '@/features/files/storageReport'
import { ProjectIcon } from '@/features/projects/components/ProjectIcon'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'

/** Fondo de las barras (en oscuro, más claro que la columna para que se vea sobre la tarjeta). */
const TRACK = 'bg-column dark:bg-[#2A2723]'

/**
 * Pestaña «Almacenamiento» (solo PM): cuánto se usa de los 2 GB del workspace, por tipo y por proyecto, y los archivos
 * más pesados para liberar espacio rápido (eliminarlos aquí es igual que en su tarea).
 * @param {{ workspace: import('@/api/types').WorkspaceResponse }} props
 */
export function StorageSettings({ workspace }) {
  const { data: report, isLoading, error, refetch } = useStorageReport(workspace.slug)

  if (isLoading) return <StorageSkeleton />
  if (error) {
    return (
      <div className="tf-panel">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    )
  }
  if (!report) return null

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-stretch gap-3.5">
        <UsageSection report={report} />
        <ProjectsSection byProject={report.byProject ?? []} />
      </div>
      <LargestFiles workspace={workspace} files={report.largest ?? []} />
    </div>
  )
}

/** @param {{ report: import('@/features/files/storageReport').StorageReport }} props */
function UsageSection({ report }) {
  const { usage } = report
  const segments = kindSegments(report)

  return (
    <section aria-labelledby="storage-usage-title" className="tf-panel flex flex-[2_1_460px] flex-col gap-3.5 px-5 py-4.5">
      <h2 id="storage-usage-title" className="text-[15px] font-semibold">
        Espacio usado
      </h2>
      <p className="flex items-baseline gap-2.5">
        <span className="font-display text-[40px] leading-none font-extrabold tracking-[-0.02em]">
          {formatGigabytes(usage.usedBytes)}
        </span>
        <span className={cn('text-muted-foreground', usage.warning && 'font-medium text-soon', usage.full && 'text-late')}>
          de {formatGigabytes(usage.quotaBytes)} · {formatPercent(usage)}
        </span>
      </p>
      <div role="img" aria-label={usageBarLabel(report)} className={cn('flex h-3.5 gap-0.5 overflow-hidden rounded-[4px]', TRACK)}>
        {segments
          .filter((segment) => segment.bytes > 0)
          .map((segment) => (
            <span
              key={segment.type}
              title={`${segment.label} · ${segment.value}`}
              className={cn('block min-w-0.5 transition-[width] duration-300', segment.color)}
              style={{ width: segment.width }}
            />
          ))}
      </div>
      <ul aria-label="Por tipo" className="flex flex-wrap gap-x-5.5 gap-y-2 text-[13px]">
        {segments.map((segment) => (
          <li key={segment.type} className="flex items-center gap-1.75">
            <span aria-hidden="true" className={cn('size-2.5 rounded-[3px]', segment.color)} />
            {segment.label} <span className="font-mono text-xs text-muted-foreground">{segment.value}</span>
          </li>
        ))}
        <li className="flex items-center gap-1.75 text-muted-foreground">
          <span aria-hidden="true" className={cn('size-2.5 rounded-[3px] border', TRACK)} />
          Libre <span className="font-mono text-xs">{formatGigabytes(freeBytes(usage))}</span>
        </li>
      </ul>
      <p className="rounded-xl bg-background px-3 py-2.5 text-[12.5px] leading-normal text-muted-foreground dark:bg-muted">
        Al pasar el 90 % el PM recibe un aviso en la Bandeja. Al llegar al 100 % no se pueden subir archivos nuevos; lo
        que ya está se sigue viendo y descargando.
      </p>
    </section>
  )
}

/** @param {{ byProject: import('@/features/files/storageReport').StorageReport['byProject'] }} props */
function ProjectsSection({ byProject }) {
  const bars = projectBars(byProject)
  return (
    <section aria-labelledby="storage-projects-title" className="tf-panel flex flex-[1_1_260px] flex-col gap-3 px-5 py-4.5">
      <h2 id="storage-projects-title" className="text-[15px] font-semibold">
        Por proyecto
      </h2>
      {bars.length === 0 && <p className="text-[13px] text-muted-foreground">Ningún proyecto tiene archivos todavía.</p>}
      {bars.map((bar) => (
        <div key={bar.project.id} className="flex flex-col gap-1.5">
          <p className="flex min-w-0 items-center gap-2 text-[13px]">
            <ProjectIcon project={bar.project} />
            <span className="truncate">{bar.project.name}</span>
            <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">{bar.size}</span>
          </p>
          <span className={cn('block h-2 rounded-[4px]', TRACK)}>
            <span className="block h-full rounded-[4px] bg-ring transition-[width] duration-300" style={{ width: bar.width }} />
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">{bar.files}</span>
        </div>
      ))}
    </section>
  )
}

/**
 * @param {{ workspace: import('@/api/types').WorkspaceResponse,
 *           files: import('@/features/files/storageReport').LargeFile[] }} props
 */
function LargestFiles({ workspace, files }) {
  const deleteFile = useDeleteStoredFile(workspace.slug)
  const [toDelete, setToDelete] = useState(null)

  const handleDownload = (file) => downloadFile(file.id).catch((error) => notifyError(error, 'No se pudo descargar'))
  const handleDelete = () => {
    const file = toDelete
    deleteFile.mutate(file, {
      onSuccess: () => {
        toast.success(`Se eliminó ${file.fileName}`)
        setToDelete(null)
      },
      onError: (error) => notifyError(error, 'No se pudo eliminar'),
    })
  }

  return (
    <section aria-labelledby="storage-largest-title" className="overflow-x-auto rounded-2xl border bg-card">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 pt-3.5 pb-2.5">
        <h2 id="storage-largest-title" className="text-[15px] font-semibold">
          Archivos más pesados
        </h2>
        <span className="text-[12.5px] text-muted-foreground">Para liberar espacio rápido. Eliminar aquí es igual que en la tarea.</span>
      </div>
      {files.length === 0 ? (
        <EmptyState
          icon={HardDrive}
          title="Todavía no hay archivos"
          description="Los adjuntos y las imágenes de las tareas aparecerán aquí, del más pesado al más liviano."
          className="border-t py-8"
        />
      ) : (
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="bg-subtle font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
              <th scope="col" className="px-4 py-2.25 text-left font-semibold">
                Archivo
              </th>
              <th scope="col" className="px-4 py-2.25 text-left font-semibold">
                Tarea
              </th>
              <th scope="col" className="px-4 py-2.25 text-left font-semibold">
                Subido por
              </th>
              <th scope="col" className="px-4 py-2.25 text-right font-semibold">
                Tamaño
              </th>
              <th scope="col" className="w-18 px-4 py-2.25">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => {
              const badge = fileBadge(file.fileName)
              return (
                <tr key={file.id} className="border-t">
                  <td className="px-4 py-2.5">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className={cn(
                          'flex h-8 w-6.5 shrink-0 items-end justify-center rounded-[5px] pb-1 font-mono text-[7.5px] font-bold',
                          badge.className,
                        )}
                      >
                        {badge.label}
                      </span>
                      <span className="max-w-[260px] truncate font-medium" title={file.fileName}>
                        {file.fileName}
                      </span>
                    </span>
                  </td>
                  <td className="max-w-[280px] px-4 py-2.5">
                    {file.issue ? (
                      <Link
                        to={`/${workspace.slug}/projects/${file.project.id}/issues?issue=${file.issue.id}`}
                        className="flex min-w-0 items-baseline gap-1.5 rounded-sm hover:underline"
                        title={`${file.issue.code} ${file.issue.title}`}
                      >
                        <span className="shrink-0 font-mono text-xs text-accent-text">{file.issue.code}</span>
                        <span className="truncate text-[13px] text-muted-foreground">{file.issue.title}</span>
                      </Link>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                        <ProjectIcon project={file.project} /> Sin tarea
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[13px] whitespace-nowrap">
                    {file.uploadedBy?.fullName}{' '}
                    <span className="font-mono text-[11.5px] text-muted-foreground">
                      {file.uploadedBy && '· '}
                      {uploadedWhen(file.createdAt)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[12.5px] font-semibold whitespace-nowrap">{formatSize(file.size)}</td>
                  <td className="px-4 py-2.5">
                    <span className="flex justify-end gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-lg text-muted-foreground"
                            aria-label={`Descargar ${file.fileName}`}
                            onClick={() => handleDownload(file)}
                          >
                            <Download className="size-[15px]" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Descargar</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-lg text-late hover:text-late"
                            aria-label={`Eliminar ${file.fileName}`}
                            onClick={() => setToDelete(file)}
                          >
                            <Trash2 className="size-[15px]" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Eliminar</TooltipContent>
                      </Tooltip>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && !deleteFile.isPending && setToDelete(null)}
        title={toDelete ? `¿Eliminar ${toDelete.fileName}?` : ''}
        description={
          toDelete
            ? `${toDelete.issue ? `Se quitará de ${toDelete.issue.code} y se` : 'Se'} liberarán ${formatSize(toDelete.size)}. No se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        loading={deleteFile.isPending}
        onConfirm={handleDelete}
      />
    </section>
  )
}

function StorageSkeleton() {
  return (
    <div className="flex flex-col gap-3.5" aria-label="Cargando almacenamiento">
      <div className="flex flex-wrap gap-3.5">
        <Skeleton className="h-[230px] flex-[2_1_460px] rounded-2xl" />
        <Skeleton className="h-[230px] flex-[1_1_260px] rounded-2xl" />
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  )
}
