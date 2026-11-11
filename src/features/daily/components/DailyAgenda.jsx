import { t } from '@/i18n'

/**
 * Puntos fijos que el equipo quiere tratar en la daily (los define el project manager en los ajustes): una franja con
 * los puntos numerados. Sin puntos no se muestra nada.
 * @param {{ agenda?: string[] }} props
 */
export function DailyAgenda({ agenda }) {
  if (!agenda?.length) return null
  return (
    <section aria-label={t('Puntos a tratar')} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border bg-card px-4.5 py-2.5">
      <span className="font-mono text-[11px] text-muted-foreground">{t('// puntos a tratar')}</span>
      <ol className="flex min-w-0 flex-wrap gap-1.5">
        {agenda.map((item, index) => (
          <li key={`${index}-${item}`} className="flex min-w-0 items-center gap-1.5 rounded-full border bg-subtle py-1 pr-3 pl-1.5 text-[13px]">
            <span
              aria-hidden="true"
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-[11px] font-semibold text-accent-text"
            >
              {index + 1}
            </span>
            <span className="wrap-anywhere">{item}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
