import { useId, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/common/Loaders'
import { UserAvatar } from '@/components/common/UserAvatar'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import {
  AGENDA_ITEM_MAX,
  AGENDA_MAX,
  DAILY_SECTIONS,
  durationError,
  formatTimer,
  joinSeconds,
  splitSeconds,
  toSettingsBody,
} from '../daily'
import { useSaveDailySettings } from '../hooks'

/**
 * Ajustes de la daily del proyecto (solo el project manager): el tiempo sugerido por persona en «Presentar», el de
 * quienes necesitan uno distinto, qué bloques se exponen y los puntos fijos a tratar.
 * @param {{ slug: string, projectId: string, settings: import('@/api/types').DailySettings,
 *           people: import('@/api/types').UserSummary[], open: boolean, onOpenChange: (open: boolean) => void }} props
 */
export function DailySettingsDialog({ slug, projectId, settings, people, open, onOpenChange }) {
  // Cada apertura empieza con lo guardado (se descarta lo que se dejó a medias al cancelar)
  const [session, setSession] = useState(0)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setSession((count) => count + 1)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh_-_3rem)] gap-4 overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Ajustes de la daily</DialogTitle>
          <DialogDescription>Valen para todo el proyecto: cuánto habla cada persona y qué se expone en la reunión.</DialogDescription>
        </DialogHeader>
        <SettingsForm
          key={session}
          slug={slug}
          projectId={projectId}
          settings={settings}
          people={people}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function SettingsForm({ slug, projectId, settings, people, onClose }) {
  const save = useSaveDailySettings(slug, projectId)
  const [secondsPerPerson, setSecondsPerPerson] = useState(settings.secondsPerPerson)
  // Tiempos propios por id de persona (solo de quienes aparecen en la daily)
  const [personSeconds, setPersonSeconds] = useState(() =>
    Object.fromEntries(settings.personTimes.filter((time) => people.some((user) => user.id === time.userId)).map((time) => [time.userId, time.seconds])),
  )
  const [sections, setSections] = useState(settings.sections)
  const [agenda, setAgenda] = useState(settings.agenda)

  const generalError = durationError(secondsPerPerson)
  const personError = Object.values(personSeconds).map(durationError).find(Boolean)
  const noBlocks = !sections.yesterday && !sections.today && !sections.blockers
  const invalid = Boolean(generalError || personError || noBlocks)

  const setPerson = (userId, seconds) => setPersonSeconds((current) => ({ ...current, [userId]: seconds }))
  const clearPerson = (userId) =>
    setPersonSeconds((current) => {
      const next = { ...current }
      delete next[userId]
      return next
    })

  const onSubmit = (event) => {
    event.preventDefault()
    if (invalid) return
    const body = toSettingsBody({
      secondsPerPerson,
      personTimes: Object.entries(personSeconds).map(([userId, seconds]) => ({ userId, seconds })),
      sections,
      agenda,
    })
    save.mutate(body, {
      onSuccess: () => {
        toast.success('Ajustes de la daily guardados')
        onClose()
      },
      onError: (error) => notifyError(error, 'No se pudieron guardar los ajustes'),
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Fieldset title="Tiempo por persona" hint="El tiempo sugerido en «Presentar». Es solo una guía: pasado el tiempo, el reloj sigue en rojo.">
        <DurationInput label="Tiempo general" value={secondsPerPerson} onChange={setSecondsPerPerson} error={generalError} />
      </Fieldset>

      <Fieldset title="Tiempos propios" hint="Para quien necesita más o menos tiempo que el general. Los demás usan el general.">
        {people.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay personas en la daily.</p>
        ) : (
          <ul className="flex flex-col overflow-hidden rounded-xl border">
            {people.map((user, index) => {
              const own = personSeconds[user.id]
              return (
                <li key={user.id} className={cn('flex flex-wrap items-center gap-2.5 px-3 py-2', index > 0 && 'border-t')}>
                  <UserAvatar user={user} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm">{user.fullName}</span>
                  {own == null ? (
                    <>
                      <span className="font-mono text-xs text-muted-foreground">{Number.isNaN(secondsPerPerson) ? '—' : formatTimer(secondsPerPerson)} · general</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => setPerson(user.id, Number.isNaN(secondsPerPerson) ? settings.secondsPerPerson : secondsPerPerson)}
                        aria-label={`Dar un tiempo propio a ${user.fullName}`}
                      >
                        <Plus />
                        tiempo propio
                      </Button>
                    </>
                  ) : (
                    <>
                      <DurationInput
                        compact
                        label={`Tiempo de ${user.fullName}`}
                        value={own}
                        onChange={(seconds) => setPerson(user.id, seconds)}
                        error={durationError(own)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => clearPerson(user.id)}
                        aria-label={`Quitar el tiempo propio de ${user.fullName}`}
                        title="Volver al tiempo general"
                      >
                        <X />
                      </Button>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Fieldset>

      <Fieldset title="Qué se expone" hint="Lo que se ve en la daily y en «Presentar».">
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
            Deja visible al menos uno de los bloques: Ayer, Hoy o Bloqueos.
          </p>
        )}
      </Fieldset>

      <Fieldset title="Puntos a tratar" hint="Temas fijos que se quieren exponer o hacer en cada daily (una demo, riesgos, avisos). Se ven numerados arriba.">
        <AgendaEditor agenda={agenda} onChange={setAgenda} />
      </Fieldset>

      <div className="flex items-center justify-end gap-2 border-t pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={invalid || save.isPending}>
          {save.isPending && <Spinner />}
          Guardar ajustes
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

/**
 * Tiempo en minutos y segundos. `value` son los segundos totales (NaN mientras lo escrito no es un número) y
 * `onChange(total)` avisa cada cambio. `compact` es la versión de una fila de la lista de personas.
 */
function DurationInput({ label, value, onChange, error, compact = false }) {
  const id = useId()
  const [text, setText] = useState(() => {
    const parts = splitSeconds(Number.isNaN(value) ? 0 : value)
    return { minutes: String(parts.minutes), seconds: String(parts.seconds) }
  })
  const update = (field) => (event) => {
    const next = { ...text, [field]: event.target.value.replace(/[^\d]/g, '').slice(0, 2) }
    setText(next)
    onChange(joinSeconds(next.minutes, next.seconds))
  }
  const fieldClass = cn('w-14 text-center font-mono tabular-nums', compact ? 'h-8' : 'h-10 text-base')

  return (
    <div className={cn('flex flex-col gap-1', compact && 'items-end')}>
      <div role="group" aria-labelledby={`${id}-label`} className="flex items-center gap-1.5">
        <span id={`${id}-label`} className={compact ? 'sr-only' : 'mr-1.5 text-sm font-medium'}>
          {label}
        </span>
        <Input
          inputMode="numeric"
          aria-label={`${label}: minutos`}
          aria-invalid={Boolean(error)}
          value={text.minutes}
          onChange={update('minutes')}
          className={fieldClass}
        />
        <span className="text-xs text-muted-foreground">min</span>
        <Input
          inputMode="numeric"
          aria-label={`${label}: segundos`}
          aria-invalid={Boolean(error)}
          value={text.seconds}
          onChange={update('seconds')}
          className={fieldClass}
        />
        <span className="text-xs text-muted-foreground">s</span>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
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
            placeholder="Por ejemplo: demo de lo terminado"
            aria-label={`Punto ${index + 1}`}
            onChange={(event) => setItem(index, event.target.value)}
          />
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeItem(index)} aria-label={`Quitar el punto ${index + 1}`}>
            <X />
          </Button>
        </div>
      ))}
      {agenda.length < AGENDA_MAX ? (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => onChange([...agenda, ''])}>
          <Plus />
          Agregar punto
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">Máximo {AGENDA_MAX} puntos.</p>
      )}
    </div>
  )
}
