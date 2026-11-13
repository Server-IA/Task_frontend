import { Check } from 'lucide-react'
import { t } from '@/i18n'
import { stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * Puntos fijos que el equipo quiere tratar en la daily (los define el project manager en los ajustes): una franja con
 * los puntos numerados. Durante la reunión un clic tacha el punto (ya se vio). Sin puntos no se muestra nada.
 * @param {{ agenda?: string[], done?: number[], onToggle?: (index: number) => void }} props
 */
export function DailyAgenda({ agenda, done = [], onToggle }) {
  if (!agenda?.length) return null
  const seen = done.filter((index) => index < agenda.length).length
  return (
    <section
      aria-label={t('Puntos a tratar')}
      className="tf-enter flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border bg-card px-4.5 py-2.5"
    >
      <span className="font-mono text-[11px] text-muted-foreground">{t('// puntos a tratar')}</span>
      <ol className="flex min-w-0 flex-wrap gap-1.5">
        {agenda.map((item, index) => {
          const checked = done.includes(index)
          return (
            <li key={`${index}-${item}`} className="tf-pop min-w-0" style={stagger(index, 40)}>
              <button
                type="button"
                aria-pressed={checked}
                disabled={!onToggle}
                onClick={() => onToggle?.(index)}
                title={checked ? t('Visto: un clic lo desmarca') : t('Un clic lo marca como visto')}
                className={cn(
                  'flex min-w-0 items-center gap-1.5 rounded-full border bg-subtle py-1 pr-3 pl-1.5 text-left text-[13px] transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring enabled:hover:border-ring',
                  checked && 'border-ok/30 bg-ok-soft/60 text-muted-foreground',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold transition-colors duration-200',
                    checked ? 'bg-ok-dot text-white' : 'bg-accent-soft text-accent-text',
                  )}
                >
                  {checked ? <Check key="visto" className="tf-pop size-3" strokeWidth={3} /> : index + 1}
                </span>
                <span className={cn('wrap-anywhere', checked && 'line-through decoration-1')}>{item}</span>
              </button>
            </li>
          )
        })}
      </ol>
      {seen > 0 && (
        <span key={seen} className="tf-pop ml-auto font-mono text-[11px] text-muted-foreground">
          {t('{seen} de {total} vistos', { seen, total: agenda.length })}
        </span>
      )}
    </section>
  )
}
