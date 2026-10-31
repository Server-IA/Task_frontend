import { HardDrive, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useFileDrop } from '../useFileDrop'

/**
 * Todo el panel (o la página) de la tarea recibe archivos: al arrastrarlos encima aparece el velo «Suelta para adjuntar
 * a WEB-15» y al soltarlos se adjuntan. El velo no captura el puntero (`pointer-events: none`): los editores de la
 * descripción y los comentarios siguen recibiendo lo que se suelta sobre ellos (las imágenes van dentro del texto) y,
 * mientras el puntero está sobre uno, el velo se oculta. Pegar fuera de un editor no hace nada.
 * Con el espacio del workspace lleno, el velo lo avisa y no se sube nada.
 * @param {{ issue?: { code: string, title: string } | null, storageFull?: boolean, quotaLabel?: string,
 *           onFiles: (files: File[]) => void, children: import('react').ReactNode }} props
 */
export function TaskFileDropZone({ issue, storageFull = false, quotaLabel = '2 GB', onFiles, children }) {
  const { dragging, count, overEditor, handlers } = useFileDrop({
    onFiles: (files) => {
      if (!issue) return
      if (storageFull) {
        toast.error(`El workspace llegó a su límite de ${quotaLabel}`, { description: 'Libera espacio eliminando adjuntos que ya no se usen.' })
        return
      }
      onFiles(files)
    },
  })

  return (
    <div className="relative h-full min-h-0" {...handlers}>
      {children}
      {issue && dragging && !overEditor && (
        <div role="status" aria-live="polite" className="tf-fade pointer-events-none absolute inset-0 z-40 flex bg-card/85 p-3">
          <div
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-3 rounded-[14px] border-2 border-dashed px-6 text-center',
              storageFull ? 'border-late bg-late-soft/50' : 'border-ring bg-accent-soft/60',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex size-14 items-center justify-center rounded-[18px]',
                storageFull ? 'bg-late-soft text-late' : 'bg-primary text-primary-foreground',
              )}
            >
              {storageFull ? <HardDrive className="size-6.5" /> : <Upload className="size-6.5" />}
            </span>
            {storageFull ? (
              <>
                <p className="font-display text-[26px] font-extrabold tracking-[-0.01em]">No hay espacio para adjuntar</p>
                <p className="text-muted-foreground">El workspace llegó a su límite de {quotaLabel}.</p>
              </>
            ) : (
              <>
                <p className="font-display text-[26px] font-extrabold tracking-[-0.01em]">
                  Suelta para adjuntar a <span className="font-mono text-[22px] font-semibold text-accent-text">{issue.code}</span>
                </p>
                <p className="max-w-[60ch] text-muted-foreground">
                  {count === 1 ? '1 archivo · va' : count ? `${count} archivos · van` : 'Van'} a Adjuntos de «{issue.title}»
                </p>
                <p className="mt-1 rounded-full bg-muted px-2.5 py-1 font-mono text-[11.5px] text-muted-foreground">
                  hasta 10 MB por archivo · imágenes hasta 5 MB · esc para cancelar
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
