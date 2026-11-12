import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StateIcon } from '@/components/common/StateIcon'
import { stateName, t, tx } from '@/i18n'

/**
 * «WEB-15 está cerrada…»: el cambio que se intentó (mover una tarea de la historia a un estado abierto, convertirla
 * en tarea, agregarla a la historia) la reabriría. El project manager puede «Reabrir la historia y continuar»; un
 * miembro ve que solo el project manager la reabre. Mismo formato que el diálogo de agregar a una historia cerrada.
 * @param {{ pending: { storyCode: string | null, action: string } | null, manager: boolean,
 *           onReopen: () => void, onOpenChange: (open: boolean) => void }} props
 */
export function StoryClosedDialog({ pending, manager, onReopen, onOpenChange }) {
  const storyCode = pending?.storyCode
  const story = storyCode ? <span className="font-mono text-ty-story-text">{storyCode}</span> : t('La historia')
  const action = pending?.action ?? ''
  return (
    <Dialog open={Boolean(pending)} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3.5 sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-[17px] leading-snug">
            {manager ? tx('{story} está cerrada. ¿La reabres para continuar?', { story }) : tx('{story} está cerrada.', { story })}
          </DialogTitle>
          <DialogDescription>{manager ? t('{action} la vuelve a abrir.', { action }) : t('{action} la volvería a abrir.', { action })}</DialogDescription>
        </DialogHeader>
        <button
          type="button"
          disabled={!manager}
          autoFocus={manager}
          onClick={onReopen}
          className="flex items-start gap-3 rounded-xl border border-ring/60 bg-accent-soft p-3.5 text-left outline-none hover:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:border-border disabled:bg-card disabled:opacity-55"
        >
          <StateIcon group="STARTED" color="var(--started)" className="mt-0.5" />
          <span className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2 text-sm font-semibold">
              {t('Reabrir la historia y continuar')}
              <span className="rounded-md bg-muted px-1.5 font-mono text-[10px] font-normal text-muted-foreground">{t('solo PM')}</span>
            </span>
            <span className="text-[13px] text-muted-foreground">
              {t('La historia vuelve a {state} y queda anotado en la actividad.', { state: stateName('In Progress') })}
            </span>
          </span>
        </button>
        {!manager && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Lock className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            {t('Solo el project manager puede reabrir la historia. Pídele que la reabra o deja la tarea como está.')}
          </p>
        )}
        <div className="flex justify-end">
          <Button variant="outline" autoFocus={!manager} onClick={() => onOpenChange(false)}>
            {manager ? t('Cancelar') : t('Entendido')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
