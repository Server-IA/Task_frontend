import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { queryKeys } from '@/api/queryKeys'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/common/Loaders'
import { useMoveToChecklist } from '@/features/checklist/hooks'
import { LazyRichEditor, preloadRichEditor, usePreloadRichEditor } from '@/features/editor/components/LazyRichEditor'
import { textIndexFromPoint } from '@/features/editor/caret'
import { CopyButton, MarkdownView } from '@/features/editor/components/MarkdownView'
import { markdownToDoc } from '@/features/editor/markdown/parse'
import { docToMarkdown, escapeText } from '@/features/editor/markdown/serialize'
import { setTaskChecked, takeTaskItems } from '@/features/editor/markdown/taskItems'
import { useMentionPeople } from '@/features/mentions/hooks'
import { formatRelative } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/sessionStore'
import { issuesApi } from '../api'
import { useActivity, useCreateIssue, useDeleteIssue, useSaveDescription } from '../hooks'

/** La descripción como la guarda el backend (sin espacios al principio ni al final). */
const norm = (value) => (value ?? '').trim()

/** Guardado automático: este tiempo después de dejar de escribir. */
const AUTOSAVE_MS = 1000
/** Mientras se edita, cada cuánto se revisa si alguien más cambió la descripción. */
const REMOTE_CHECK_MS = 20_000

/**
 * Descripción de la tarea: se lee con formato y se edita en el lugar (clic en el texto, con el cursor ahí).
 * En lectura, los enlaces, las pastillas y las casillas funcionan sin entrar a editar; marcar una casilla
 * guarda el Markdown. Al editar, guarda sola un segundo después de dejar de escribir; Escape, ctrl ↵ o «Listo»
 * terminan. `showMarkdown` muestra el Markdown tal cual (desde el menú «⋯» de la tarea).
 */
export function IssueDescription({ slug, project, issue, variant = 'page', onOpenIssue, showMarkdown, onHideMarkdown }) {
  const save = useSaveDescription(slug, project.id, issue.id)
  const moveToChecklist = useMoveToChecklist(slug, project.id, issue.id)
  const [editing, setEditing] = useState(null)
  usePreloadRichEditor()

  const description = norm(issue.description)

  /** «Pasar al checklist»: primero se crean los pasos y, si salió bien, se quitan de la descripción. */
  const moveTasks = async (items, removeFromDescription) => {
    try {
      const count = await moveToChecklist.mutateAsync(items)
      removeFromDescription?.()
      toast.success(count === 1 ? 'Se pasó 1 paso al checklist' : `Se pasaron ${count} pasos al checklist`)
    } catch (error) {
      notifyError(error, 'No se pudo pasar al checklist')
      throw error
    }
  }

  if (showMarkdown) return <RawMarkdown description={description} onClose={onHideMarkdown} />

  if (editing) {
    return (
      <DescriptionEditor
        slug={slug}
        project={project}
        issue={issue}
        variant={variant}
        caret={editing.caret}
        onMoveTasks={(items) => moveTasks(items)}
        onFinish={() => setEditing(null)}
      />
    )
  }

  return (
    <DescriptionReader
      slug={slug}
      project={project}
      issue={issue}
      variant={variant}
      description={description}
      onOpenIssue={onOpenIssue}
      onEdit={(caret) => setEditing({ caret })}
      onToggleTask={(index, checked) => {
        const next = docToMarkdown(setTaskChecked(markdownToDoc(description), index, checked))
        save.mutate(next, { onError: (error) => notifyError(error) })
      }}
      onMoveTasks={(indexes) => {
        const { doc, items } = takeTaskItems(markdownToDoc(description), indexes)
        if (!items.length) return
        moveTasks(items, () => save.mutate(docToMarkdown(doc), { onError: (error) => notifyError(error) })).catch(() => {})
      }}
    />
  )
}

/** Quién editó la descripción por última vez («editada por Luis hace 2 h»), del historial de la tarea. */
function useLastEdit(slug, projectId, issueId) {
  const { data: activity } = useActivity(slug, projectId, issueId)
  const last = activity?.findLast((entry) => entry.field === 'DESCRIPTION')
  if (!last) return null
  return { name: last.actor?.fullName?.split(' ')[0] ?? 'alguien', at: last.updatedAt ?? last.createdAt, actorId: last.actor?.id }
}

function DescriptionReader({ slug, project, issue, variant, description, onOpenIssue, onEdit, onToggleTask, onMoveTasks }) {
  const lastEdit = useLastEdit(slug, project.id, issue.id)
  const textRef = useRef(null)
  const page = variant === 'page'

  const enter = (event) => {
    // Los enlaces, las pastillas y las casillas funcionan sin entrar a editar; seleccionar texto tampoco entra
    if (event.target.closest('a, button, input, label, [role="checkbox"]')) return
    if (window.getSelection()?.toString()) return
    const text = textRef.current
    if (!text || !description) {
      onEdit(null)
      return
    }
    // El cursor queda en la misma letra donde se hizo clic (o, si el clic no cayó en el texto, en el mismo punto)
    const box = text.getBoundingClientRect()
    onEdit({ index: textIndexFromPoint(text, event.clientX, event.clientY), x: event.clientX - box.left, y: event.clientY - box.top })
  }

  return (
    <section aria-label="Descripción" className="flex flex-col gap-1.5">
      <div
        onClick={enter}
        onPointerEnter={preloadRichEditor}
        className={cn(
          'group/desc relative cursor-text rounded-[14px] transition-colors duration-150',
          page ? 'border bg-md-frame px-5 pt-4 pb-4.5' : '-mx-2 border border-transparent px-2 py-1.5 hover:bg-md-frame',
        )}
      >
        <button
          type="button"
          onClick={() => onEdit(null)}
          className={cn(
            'z-[2] flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium shadow-card',
            // En la página flota a la derecha (el texto lo rodea); en el panel aparece encima, al pasar el mouse
            page
              ? 'relative float-right -mt-1.5 -mr-2.5 mb-1 ml-3'
              : 'absolute top-1.5 right-0 opacity-0 transition-opacity duration-150 group-hover/desc:opacity-100 focus-visible:opacity-100',
          )}
        >
          <Pencil className="size-3.25" />
          Editar descripción
        </button>
        {description ? (
          // Si empieza con un bloque con borde (historia, tabla, código, cita), baja para no quedar bajo el botón
          <div ref={textRef} className={cn(page && '[&_.tf-md>:is(figure,table,blockquote):first-child]:mt-10')}>
            <MarkdownView
              markdown={description}
              slug={slug}
              projectId={project.id}
              onOpenIssue={onOpenIssue}
              onToggleTask={onToggleTask}
              onMoveTasks={onMoveTasks}
            />
          </div>
        ) : (
          <p className="py-1 text-[14.5px] text-muted-foreground">Agrega una descripción…</p>
        )}
      </div>
      {page && (
        <p className="px-1 font-mono text-[11px] text-muted-foreground">
          haz clic en el texto para editar · los enlaces, menciones y casillas funcionan sin entrar a editar
          {lastEdit && ` · editada por ${lastEdit.name} ${formatRelative(lastEdit.at)}`}
        </p>
      )}
    </section>
  )
}

const SAVE_TEXT = { saved: 'Guardado', pending: 'Guardando…', saving: 'Guardando…', error: 'No se pudo guardar' }

function DescriptionEditor({ slug, project, issue, variant, caret, onMoveTasks, onFinish }) {
  const queryClient = useQueryClient()
  const save = useSaveDescription(slug, project.id, issue.id)
  const createIssue = useCreateIssue(slug, project.id)
  const removeIssue = useDeleteIssue(slug, project.id)
  const people = useMentionPeople(slug, project.id)
  const me = useSessionStore((state) => state.user?.id)
  const lastEdit = useLastEdit(slug, project.id, issue.id)
  const apiRef = useRef(null)
  const [initial] = useState(() => norm(issue.description))
  const draftRef = useRef(initial)
  const savedRef = useRef(initial)
  const timerRef = useRef(null)
  const inFlightRef = useRef(false)
  const queuedRef = useRef(false)
  const [status, setStatus] = useState('saved')
  // Versiones que conozco (la de partida y las que guardé): otra distinta en el servidor es de otra persona
  const [known, setKnown] = useState(() => new Set([initial]))
  const remote = norm(issue.description)
  const conflict = known.has(remote) ? null : remote
  const conflictRef = useRef(conflict)
  useEffect(() => {
    conflictRef.current = conflict
  })

  const flush = () => {
    clearTimeout(timerRef.current)
    const body = norm(draftRef.current)
    // Con un cambio de otra persona pendiente de decidir, no se guarda solo (se decide en el aviso)
    if (conflictRef.current != null) return
    if (body === savedRef.current) {
      setStatus('saved')
      return
    }
    if (inFlightRef.current) {
      queuedRef.current = true
      return
    }
    inFlightRef.current = true
    setStatus('saving')
    setKnown((current) => new Set(current).add(body))
    save.mutate(body, {
      onSuccess: (updated) => {
        savedRef.current = norm(updated.description)
        setKnown((current) => new Set(current).add(savedRef.current))
      },
      onError: (error) => {
        setStatus('error')
        notifyError(error, 'No se pudo guardar la descripción')
      },
      onSettled: (_data, error) => {
        inFlightRef.current = false
        if (queuedRef.current) {
          queuedRef.current = false
          flush()
        } else if (!error) {
          setStatus(norm(draftRef.current) === savedRef.current ? 'saved' : 'pending')
        }
      },
    })
  }

  const onChange = (markdown) => {
    draftRef.current = markdown
    clearTimeout(timerRef.current)
    if (norm(markdown) === savedRef.current) {
      setStatus('saved')
      return
    }
    setStatus('pending')
    timerRef.current = setTimeout(flush, AUTOSAVE_MS)
  }

  const finish = () => {
    // Al terminar con un aviso sin decidir, gana lo mío (el último que guarda)
    if (conflictRef.current != null) {
      conflictRef.current = null
      setKnown((current) => new Set(current).add(remote))
    }
    flush()
    onFinish()
  }

  // Al cerrar la tarea (o salir) lo que falta se guarda igual
  useEffect(
    () => () => {
      clearTimeout(timerRef.current)
      const body = norm(draftRef.current)
      if (body !== savedRef.current && conflictRef.current == null && !inFlightRef.current) save.mutate(body)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al desmontar
    [],
  )

  // Mientras se edita, la tarea se vuelve a pedir de vez en cuando para notar cambios de otras personas
  useEffect(() => {
    const id = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issue(issue.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(issue.id) })
    }, REMOTE_CHECK_MS)
    return () => clearInterval(id)
  }, [queryClient, issue.id])

  const keepTheirs = () => {
    apiRef.current?.setMarkdown(remote)
    draftRef.current = remote
    savedRef.current = remote
    setKnown((current) => new Set(current).add(remote))
    setStatus('saved')
  }
  const keepMine = () => {
    conflictRef.current = null
    setKnown((current) => new Set(current).add(remote))
    flush()
  }

  /** «Crear subtarea» desde la selección: crea la tarea, deja su código en el texto y ofrece deshacer. */
  const createSubtask = async (text, replace) => {
    try {
      const created = await createIssue.mutateAsync({ title: text, parentId: issue.id, stateId: issue.state?.id })
      replace(created.code)
      toast.success(`${created.code} creada como subtarea de ${issue.code}`, {
        description: created.title,
        duration: 8000,
        action: { label: 'Deshacer', onClick: () => undoSubtask(created, text) },
      })
    } catch (error) {
      notifyError(error, 'No se pudo crear la subtarea')
    }
  }

  const undoSubtask = async (created, text) => {
    try {
      await removeIssue.mutateAsync(created.id)
    } catch (error) {
      notifyError(error, 'No se pudo deshacer')
      return
    }
    // Si todavía se está editando, el código vuelve a ser el texto en el editor (y se guarda solo)
    if (apiRef.current?.replaceText(created.code, text)) return
    const current = norm(queryClient.getQueryData(queryKeys.issue(issue.id))?.description)
    const pattern = new RegExp(`(?<![\\w-])${created.code}(?![\\w-])`)
    if (!pattern.test(current)) return
    try {
      const updated = await issuesApi.update(slug, project.id, issue.id, { description: current.replace(pattern, escapeText(text)) })
      queryClient.setQueryData(queryKeys.issue(issue.id), updated)
    } catch (error) {
      notifyError(error)
    }
  }

  const page = variant === 'page'
  const contentClass = page ? 'min-h-28 px-5.5 pt-4.5 pb-5' : 'min-h-24 px-4 pt-3.5 pb-4'
  const busy = status === 'pending' || status === 'saving'

  return (
    <section aria-label="Descripción" className="flex flex-col gap-1.5">
      <div className="relative rounded-[14px] border border-ring bg-card shadow-[0_0_0_3px_var(--accent-soft)]">
        {conflict != null && (
          <div role="alert" className="tf-fade flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-t-[13px] border-b bg-soon-soft px-3.5 py-2 text-[13px] text-soon">
            <span className="font-semibold">Alguien cambió la descripción</span>
            {lastEdit && lastEdit.actorId !== me && (
              <span className="text-xs">
                {lastEdit.name} · {formatRelative(lastEdit.at)}
              </span>
            )}
            <span className="text-xs">Tus cambios no se guardan hasta que elijas.</span>
            <span className="ml-auto flex gap-1.5">
              <Button size="sm" variant="outline" className="h-7 bg-card" onClick={keepTheirs}>
                Ver su versión
              </Button>
              <Button size="sm" className="h-7" onClick={keepMine}>
                Mantener la mía
              </Button>
            </span>
          </div>
        )}
        <LazyRichEditor
          value={initial}
          onChange={onChange}
          toolbar={page ? 'full' : 'panel'}
          stickyToolbar={conflict == null}
          people={people}
          slug={slug}
          projectIdentifier={project.identifier}
          initialCaret={caret ?? {}}
          onSubmit={finish}
          onEscape={finish}
          onCreateSubtask={createSubtask}
          onMoveTasks={onMoveTasks}
          apiRef={apiRef}
          contentClassName={contentClass}
          fallback={
            <>
              <div className="h-[43px] border-b" aria-hidden="true" />
              <MarkdownView markdown={initial} className={contentClass} />
            </>
          }
        />
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-t px-3 py-2 text-xs text-muted-foreground">
          <span role="status" className={cn('flex items-center gap-1.5', status === 'saved' && 'text-foreground', status === 'error' && 'text-destructive')}>
            {busy && <Spinner className="size-3" />}
            {status === 'saved' && <Check className="size-3.25 text-ok-dot" strokeWidth={2.6} />}
            {conflict != null ? 'En pausa' : SAVE_TEXT[status]}
            {status === 'error' && (
              <button type="button" className="font-semibold underline underline-offset-2" onClick={flush}>
                Reintentar
              </button>
            )}
          </span>
          {page && <span className="font-mono text-[11px]">## título · - lista · [ ] tarea · &gt; cita · ``` código · / insertar</span>}
          <span className="ml-auto font-mono text-[11px]">
            <kbd className="text-foreground">esc</kbd> o <kbd className="text-foreground">ctrl ↵</kbd> terminar
          </span>
          <Button size="sm" className="h-7 rounded-[9px] px-3" onClick={finish}>
            Listo
          </Button>
        </div>
      </div>
    </section>
  )
}

/** «Ver Markdown»: la descripción tal como se guarda. */
function RawMarkdown({ description, onClose }) {
  return (
    <section aria-label="Descripción en Markdown" className="flex flex-col gap-1.5">
      <div className="overflow-hidden rounded-[14px] border bg-subtle">
        <div className="flex items-center gap-2 border-b py-1.5 pr-2 pl-3.5">
          <span className="font-mono text-[11px] text-muted-foreground">markdown · solo lectura</span>
          <span className="ml-auto flex items-center gap-1">
            <CopyButton text={description} />
            <button type="button" onClick={onClose} className="rounded-md px-2 py-0.5 text-xs font-medium hover:bg-muted">
              Ver con formato
            </button>
          </span>
        </div>
        <pre className="max-h-[60vh] overflow-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap break-words">
          {description || <span className="text-muted-foreground">Sin descripción</span>}
        </pre>
      </div>
    </section>
  )
}
