import { useId, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/common/Loaders'
import { t } from '@/i18n'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { AGENDA_ITEM_MAX, AGENDA_MAX, DAILY_SECTIONS, toSettingsBody } from '../daily'
import { useSaveDailySettings } from '../hooks'

/**
 * Ajustes de la daily del proyecto (quien tiene el permiso de configurarla): qué bloques se exponen y los puntos
 * fijos a tratar.
 * @param {{ slug: string, projectId: string, settings: import('@/api/types').DailySettings, open: boolean,
 *           onOpenChange: (open: boolean) => void }} props
 */
export function DailySettingsDialog({ slug, projectId, settings, open, onOpenChange }) {
  // Cada apertura empieza con lo guardado (se descarta lo que se dejó a medias al cancelar)
  const [session, setSession] = useState(0)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setSession((count) => count + 1)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh_-_3rem)] gap-4 overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t('Ajustes de la daily')}</DialogTitle>
          <DialogDescription>
            {t('Valen para todo el proyecto: qué se expone en la reunión y los puntos que siempre se tratan.')}
          </DialogDescription>
        </DialogHeader>
        <SettingsForm key={session} slug={slug} projectId={projectId} settings={settings} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function SettingsForm({ slug, projectId, settings, onClose }) {
  const save = useSaveDailySettings(slug, projectId)
  const [sections, setSections] = useState(settings.sections)
  const [agenda, setAgenda] = useState(settings.agenda)

  const noBlocks = !sections.yesterday && !sections.today && !sections.blockers
  const invalid = noBlocks

  const onSubmit = (event) => {
    event.preventDefault()
    if (invalid) return
    save.mutate(toSettingsBody({ sections, agenda }), {
      onSuccess: () => {
        toast.success(t('Ajustes de la daily guardados'))
        onClose()
      },
      onError: (error) => notifyError(error, t('No se pudieron guardar los ajustes')),
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Fieldset title={t('Qué se expone')} hint={t('Lo que se ve en la daily y en «Presentar».')}>
        <ul className="flex flex-col overflow-hidden rounded-xl border">
          {DAILY_SECTIONS.map((section, index) => (
            <SectionSwitch
              key={section.key}
              section={section}
              checked={sections[section.key]}
              onChange={(value) => setSections((current) => ({ ...current, [section.key]: value }))}
              className={index > 0 ? 'border-t' : undefined}
            />
          ))}
        </ul>
        {noBlocks && (
          <p role="alert" className="text-sm text-destructive">
            {t('Deja visible al menos uno de los bloques: Ayer, Hoy o Bloqueos.')}
          </p>
        )}
      </Fieldset>

      <Fieldset
        title={t('Puntos a tratar')}
        hint={t('Temas fijos que se quieren exponer o hacer en cada daily (una demo, riesgos, avisos). Se ven numerados arriba.')}
      >
        <AgendaEditor agenda={agenda} onChange={setAgenda} />
      </Fieldset>

      <div className="flex items-center justify-end gap-2 border-t pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          {t('Cancelar')}
        </Button>
        <Button type="submit" disabled={invalid || save.isPending}>
          {save.isPending && <Spinner />}
          {t('Guardar ajustes')}
        </Button>
      </div>
    </form>
  )
}

function Fieldset({ title, hint, children }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-0.5 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{title}</legend>
      {hint && <p className="text-[13px] text-muted-foreground">{hint}</p>}
      {children}
    </fieldset>
  )
}

function SectionSwitch({ section, checked, onChange, className }) {
  const id = useId()
  return (
    <li className={cn('flex items-center gap-3 px-3 py-2', className)}>
      <span className="flex min-w-0 flex-1 flex-col">
        <label htmlFor={id} className="text-sm font-medium">
          {section.label}
        </label>
        <span className="text-xs text-muted-foreground">{section.hint}</span>
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </li>
  )
}

/** Lista de puntos: se escriben, se quitan y se agregan hasta el máximo. */
function AgendaEditor({ agenda, onChange }) {
  const setItem = (index, value) => onChange(agenda.map((item, position) => (position === index ? value : item)))
  const removeItem = (index) => onChange(agenda.filter((_, position) => position !== index))
  return (
    <div className="flex flex-col gap-1.5">
      {agenda.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <span aria-hidden="true" className="w-5 shrink-0 text-right font-mono text-xs text-muted-foreground">
            {index + 1}
          </span>
          <Input
            value={item}
            maxLength={AGENDA_ITEM_MAX}
            placeholder={t('Por ejemplo: demo de lo terminado')}
            aria-label={t('Punto {number}', { number: index + 1 })}
            onChange={(event) => setItem(index, event.target.value)}
          />
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeItem(index)} aria-label={t('Quitar el punto {number}', { number: index + 1 })}>
            <X />
          </Button>
        </div>
      ))}
      {agenda.length < AGENDA_MAX ? (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => onChange([...agenda, ''])}>
          <Plus />
          {t('Agregar punto')}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">{t('Máximo {max} puntos.', { max: AGENDA_MAX })}</p>
      )}
    </div>
  )
}
