import { useState } from 'react'
import { Check, FileSpreadsheet } from 'lucide-react'
import { AsanaIcon, JiraIcon, LinearIcon, TrelloIcon } from '@/components/common/BrandIcons'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'
import { statusLabel } from './importModel'

/** Piezas que comparten los pasos de una importación: la marca del origen, el estado, el marco con los pasos y la confirmación de deshacer. */

const LOGOS = { JIRA: JiraIcon, TRELLO: TrelloIcon, LINEAR: LinearIcon, ASANA: AsanaIcon, CSV: FileSpreadsheet }

/** La marca de un origen: su logo sobre su color (un CSV, el icono de una hoja de cálculo). */
export function SourceMark({ source, className }) {
  const Logo = LOGOS[source.key]
  return (
    <span
      aria-hidden="true"
      className={cn('flex h-8.5 min-w-8.5 shrink-0 items-center justify-center rounded-[10px] px-1.5 font-mono text-xs font-semibold', source.tint, className)}
    >
      {Logo ? <Logo className="size-4.5" /> : source.mark}
    </span>
  )
}

const STATUS_TONE = {
  COMPLETED: 'bg-ok-soft text-ok',
  FAILED: 'bg-late-soft text-late',
  STOPPED: 'bg-soon-soft text-soon',
  RUNNING: 'bg-accent-soft text-accent-text',
  FETCHING: 'bg-accent-soft text-accent-text',
  UNDOING: 'bg-accent-soft text-accent-text',
}

export function StatusPill({ job }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.25 py-0.5 font-mono text-[11px] font-semibold whitespace-nowrap', STATUS_TONE[job.status] ?? 'bg-muted text-muted-foreground')}>
      {statusLabel(job.status)}
    </span>
  )
}

/** Confirma deshacer una importación: dice qué se borra. */
export function UndoDialog({ job, loading, onCancel, onConfirm }) {
  return (
    <ConfirmDialog
      open={Boolean(job)}
      onOpenChange={(open) => !open && onCancel()}
      title={t('¿Deshacer esta importación?')}
      description={t(
        'Se eliminan los proyectos, tareas, comentarios y archivos que creó, también lo que se haya trabajado en ellos después. Lo que ya tenías en TaskFlow no se toca.',
      )}
      confirmLabel={t('Deshacer importación')}
      loading={loading}
      onConfirm={onConfirm}
    />
  )
}

const STEPS = ['origin', 'connect', 'choose', 'mapping', 'review', 'run']

/**
 * El marco de una importación en curso: de dónde es, los pasos (los anteriores hechos, el actual resaltado) y cómo
 * salir.
 * `file`: si la importación es por archivo (el segundo paso se llama «Archivo» en vez de «Conectar»).
 * @param {{ source: object, sub?: string, step: string, file?: boolean, exitLabel?: string, onExit: () => void,
 *           children: React.ReactNode }} props
 */
export function WizardShell({ source, sub, step, file = !source.api, exitLabel = t('Cancelar'), onExit, children }) {
  const at = step === 'done' ? STEPS.length : STEPS.indexOf(step)
  // El paso nuevo entra desde la derecha al avanzar y desde la izquierda al volver. Al montarse (de «Conectar» a «Qué
  // importar» son pantallas distintas) siempre se va hacia adelante
  const [motion, setMotion] = useState({ at, back: false })
  if (motion.at !== at) setMotion({ at, back: at < motion.at })
  const labels = [t('Origen'), file ? t('Archivo') : t('Conectar'), t('Qué importar'), t('Equivalencias'), t('Revisar'), t('Importar')]
  return (
    <div className="flex flex-col gap-3.5 overflow-x-clip">
      <section aria-label={t('Pasos de la importación')} className="tf-panel flex flex-col gap-3.5 px-5 pt-3.5 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <SourceMark source={source} />
          <div className="min-w-0 flex-[1_1_280px]">
            <h2 className="text-[17px] font-semibold">{t('Importar desde {source}', { source: source.key === 'CSV' ? t('un archivo CSV') : source.name })}</h2>
            {sub && <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{sub}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={onExit}>
            {exitLabel}
          </Button>
        </div>
        <ol aria-label={t('Pasos')} className="flex flex-wrap gap-x-1 gap-y-1.5">
          {labels.map((label, index) => {
            const done = index < at
            const current = index === at
            return (
              <li
                key={label}
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-full py-1.25 pr-3 pl-1.5 text-[13px] font-medium transition-colors duration-300',
                  current ? 'bg-accent-soft font-semibold text-accent-text' : done ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-5.5 items-center justify-center rounded-full font-mono text-[11px] font-semibold transition-colors duration-300',
                    done ? 'bg-ok-soft text-ok' : current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {done ? <Check className="tf-pop size-3" strokeWidth={3} /> : index + 1}
                </span>
                {label}
              </li>
            )
          })}
        </ol>
      </section>
      <div key={step} className={cn('flex min-w-0 flex-col gap-3.5', motion.back ? 'tf-slide-prev' : 'tf-slide-next')}>
        {children}
      </div>
    </div>
  )
}
