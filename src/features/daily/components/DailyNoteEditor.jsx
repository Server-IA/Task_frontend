import { useEffect, useId, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/common/Loaders'
import { formatDateTime, formatRelative, formatShortDate } from '@/lib/dates'
import { useSessionStore } from '@/stores/sessionStore'
import { NOTE_MAX_LENGTH } from '../daily'
import { useSaveDailyNote } from '../hooks'

/** Espera desde la última tecla antes de guardar. */
const AUTOSAVE_MS = 900

/**
 * Nota del día (acuerdos, temas para después): la edita cualquier persona del proyecto y se guarda sola.
 * Si llega una versión nueva del servidor y no hay cambios sin guardar, se muestra esa. Va con `key={date}`.
 * @param {{ slug: string, projectId: string, date: string, isToday: boolean,
 *           note: import('@/api/types').DailyNote | null | undefined }} props
 */
export function DailyNoteEditor({ slug, projectId, date, isToday, note }) {
  const titleId = useId()
  const userId = useSessionStore((state) => state.user?.id)
  const save = useSaveDailyNote(slug, projectId, date)
  const { mutate } = save
  const serverText = note?.text ?? ''
  const [draft, setDraft] = useState(serverText)
  const [base, setBase] = useState(serverText)
  // Cambió en el servidor (otra persona, o lo que acabamos de guardar): se adopta si no hay cambios propios
  if (serverText !== base) {
    setBase(serverText)
    if (draft.trim() === base.trim()) setDraft(serverText)
  }
  const dirty = draft.trim() !== serverText.trim()

  useEffect(() => {
    if (!dirty) return undefined
    const timer = setTimeout(() => mutate(draft), AUTOSAVE_MS)
    return () => clearTimeout(timer)
  }, [draft, dirty, mutate])

  // Al cambiar de día o salir con cambios sin guardar, se guardan enseguida
  const pending = useRef({ dirty, draft })
  useEffect(() => {
    pending.current = { dirty, draft }
  })
  useEffect(
    () => () => {
      if (pending.current.dirty) mutate(pending.current.draft)
    },
    [mutate],
  )

  const dayLabel = isToday ? 'de hoy' : `del ${formatShortDate(date)}`

  return (
    <section aria-labelledby={titleId} className="tf-panel flex flex-col gap-2 rounded-[18px] px-4 py-3.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h2 id={titleId} className="text-[15px] font-semibold">
          Notas {dayLabel}
        </h2>
        <span className="text-xs text-muted-foreground">las ve todo el proyecto · se guardan con la fecha</span>
        <SaveStatus save={save} dirty={dirty} note={note} userId={userId} onRetry={() => mutate(draft)} />
      </div>
      <textarea
        aria-label={`Notas de la daily ${dayLabel}`}
        placeholder="Acuerdos o temas para después de la reunión…"
        value={draft}
        maxLength={NOTE_MAX_LENGTH}
        rows={2}
        onChange={(event) => setDraft(event.target.value)}
        // Escape suelta el campo: así vuelven a funcionar los atajos de la página (P presentar)
        onKeyDown={(event) => event.key === 'Escape' && event.currentTarget.blur()}
        className="field-sizing-content block max-h-80 min-h-[68px] w-full resize-none rounded-xl border bg-card px-3 py-2.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 dark:bg-input/30"
      />
    </section>
  )
}

/** «Guardando…», «Guardado», «No se pudo guardar · Reintentar» o quién la editó por última vez. */
function SaveStatus({ save, dirty, note, userId, onRetry }) {
  let content
  if (save.isPending || dirty) {
    content = (
      <>
        <Spinner className="size-3" />
        Guardando…
      </>
    )
  } else if (save.isError) {
    content = (
      <span className="flex items-center gap-1.5 text-late">
        No se pudo guardar
        <Button variant="link" size="xs" className="h-auto p-0 text-xs" onClick={onRetry}>
          Reintentar
        </Button>
      </span>
    )
  } else if (note?.updatedAt) {
    const mine = note.updatedBy?.id === userId
    content = (
      <>
        {save.isSuccess && mine && <Check className="size-3 text-ok" aria-hidden="true" />}
        <span title={formatDateTime(note.updatedAt)}>
          editada por {mine ? 'ti' : (note.updatedBy?.fullName ?? 'alguien')} {formatRelative(note.updatedAt)}
        </span>
      </>
    )
  } else if (save.isSuccess) {
    content = 'Nota borrada'
  }
  if (!content) return null
  return (
    <span role="status" className="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
      {content}
    </span>
  )
}
