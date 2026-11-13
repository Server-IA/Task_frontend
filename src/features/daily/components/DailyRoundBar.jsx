import { useEffect, useState } from 'react'
import { Check, ClipboardCopy, ListRestart, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { t, tx } from '@/i18n'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'

/** Cuánto se muestra «Copiado» después de copiar. */
const COPIED_MS = 1800

/**
 * La ronda de la reunión: cuántas personas ya hablaron (con su barra), sortear el orden o volver al de siempre, y
 * copiar la daily en texto para el chat del equipo.
 * @param {{ spoke: number, total: number, shuffledOrder: boolean, onShuffle: () => void, onResetOrder: () => void,
 *           getSummary: () => string }} props
 */
export function DailyRoundBar({ spoke, total, shuffledOrder, onShuffle, onResetOrder, getSummary }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), COPIED_MS)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(getSummary())
      setCopied(true)
    } catch (error) {
      notifyError(error, t('No se pudo copiar el resumen'))
    }
  }
  const done = total > 0 && spoke >= total
  const percent = total > 0 ? Math.round((spoke / total) * 100) : 0

  return (
    <section
      aria-label={t('Ronda de la daily')}
      className="tf-enter bg-card flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-2xl border px-4.5 py-2.5"
    >
      <span className="flex min-w-[220px] flex-1 items-center gap-3">
        <span
          className={cn(
            'shrink-0 text-[13px] transition-colors duration-200',
            done ? 'text-ok font-semibold' : 'text-muted-foreground',
          )}
        >
          {done
            ? t('Ya hablaron todos')
            : tx('{spoke} de {total} ya hablaron', {
                spoke: (
                  <strong className="font-display text-foreground text-base font-extrabold">{spoke}</strong>
                ),
                total,
              })}
        </span>
        <span
          role="progressbar"
          aria-label={t('Personas que ya hablaron')}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={spoke}
          className="bg-column h-1.5 max-w-60 min-w-20 flex-1 overflow-hidden rounded-full"
        >
          <span
            className={cn(
              'tf-grow block h-full rounded-full transition-[width] duration-500 ease-out',
              done ? 'bg-ok-dot' : 'bg-accent-text',
            )}
            style={{ width: `${percent}%` }}
          />
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onShuffle}
          disabled={total < 2}
          title={t('Sortea quién habla primero')}
        >
          <Shuffle />
          {t('Orden al azar')}
        </Button>
        {shuffledOrder && (
          <Button type="button" variant="ghost" size="sm" className="tf-pop" onClick={onResetOrder}>
            <ListRestart />
            {t('Orden de siempre')}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copy}
          title={t('Copia la daily en texto para pegarla en el chat del equipo')}
        >
          {copied ? <Check key="copiado" className="tf-pop text-ok" /> : <ClipboardCopy />}
          {copied ? t('Copiado') : t('Copiar resumen')}
        </Button>
      </span>
    </section>
  )
}
