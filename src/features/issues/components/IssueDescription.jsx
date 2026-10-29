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
import { diffLines } from '@/features/editor/markdown/diffLines'
import { markdownToDoc } from '@/features/editor/markdown/parse'
import { docToMarkdown, escapeText } from '@/features/editor/markdown/serialize'
import { movedIndexes, setTaskChecked, takeTaskItems } from '@/features/editor/markdown/taskItems'
import { useMentionPeople } from '@/features/mentions/hooks'
import { formatRelative } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/sessionStore'
import { issuesApi } from '../api'
import { descriptionConflict, useCreateIssue, useDeleteIssue, useSaveDescription } from '../hooks'

/** La descripción como la guarda el backend (sin espacios al principio ni al final). */
const norm = (value) => (value ?? '').trim()

/** Guardado automático: este tiempo después de dejar de escribir. */
const AUTOSAVE_MS = 1000
/** Mientras se edita, cada cuánto se revisa si alguien más cambió la descripción (además de al volver a la ventana). */
const REMOTE_CHECK_MS = 20_000

const firstName = (user) => user?.fullName?.split(' ')[0] ?? null

/** Quién cambió la descripción por última vez y cuándo («editada por Luis hace 2 h»). */
const lastEditOf = (issue) =>
  issue.descriptionUpdatedAt ? { name: firstName(issue.descriptionUpdatedBy) ?? 'alguien', at: issue.descriptionUpdatedAt, by: issue.descriptionUpdatedBy } : null

/** «Luis la cambió hace 1 min», para los avisos de conflicto. */
function changedBy(conflict, me) {
  if (!conflict?.by) return 'Alguien más la cambió'
  const who = conflict.by.id === me ? 'Tú la cambiaste en otra ventana' : `${firstName(conflict.by)} la cambió`
  return conflict.at ? `${who} ${formatRelative(conflict.at)}` : who
}

/**
 * Descripción de la tarea: se lee con formato y se edita en el lugar (clic en el texto, con el cursor ahí).
 * En lectura, los enlaces, las pastillas y las casillas funcionan sin entrar a editar; marcar una casilla
 * guarda el Markdown. Al editar, guarda sola un segundo después de dejar de escribir; Escape, ctrl ↵ o «Listo»
 * terminan. `showMarkdown` muestra el Markdown tal cual (desde el menú «⋯» de la tarea).
 *
 * Nunca se pisa un cambio ajeno: cada guardado manda la versión de la que partió (`descriptionVersion`) y, si otra
 * persona guardó después, el backend responde 409 sin cambiar nada. El editor se pone en pausa y pregunta qué
 * versión mantener; en lectura, la casilla o «Pasar al checklist» no se aplican y se avisa.
 */
export function IssueDescription({ slug, project, issue, variant = 'page', onOpenIssue, showMarkdown, onHideMarkdown }) {
  const queryClient = useQueryClient()
  const save = useSaveDescription(slug, project.id, issue.id)
  const moveToChecklist = useMoveToChecklist(slug, project.id, issue.id)
  const me = useSessionStore((state) => state.user?.id)
  const [editing, setEditing] = useState(null)
  // Cambios desde la lectura (casillas, «Pasar al checklist»): van de a uno, cada uno sobre lo que dejó el anterior
  const queueRef = useRef(Promise.resolve())
  const ownVersionRef = useRef(null)
  usePreloadRichEditor()

  const description = norm(issue.description)
  const issueKey = queryKeys.issue(issue.id)

  const warnChanged = (conflict, what) => {
    queryClient.invalidateQueries({ queryKey: issueKey })
    toast.warning('Alguien cambió la descripción', {
      description: `${changedBy(conflict, me)}. ${what} Revisa la versión nueva y vuelve a intentarlo.`,
    })
  }

  /**
   * Cambia la descripción desde la lectura. `seenVersion` es la versión que se veía al hacer clic: si en el servidor
   * hay otra (que no sea la que dejó un cambio anterior de esta cola), no se aplica. `change(actual)` devuelve el
   * Markdown nuevo. Resuelve `true` si se guardó.
   */
  const changeDescription = (seenVersion, change, what) => {
    const run = async () => {
      const current = queryClient.getQueryData(issueKey) ?? issue
      const version = current.descriptionVersion ?? 0
      if (version !== seenVersion && version !== ownVersionRef.current) {
        warnChanged({ by: current.descriptionUpdatedBy, at: current.descriptionUpdatedAt }, what)
        return false
      }
      const next = change(norm(current.description))
      if (next == null || next === norm(current.description)) return false
      try {
        const updated = await save.mutateAsync({ description: next, base: version })
        ownVersionRef.current = updated.descriptionVersion
        return true
      } catch (error) {
        const conflict = descriptionConflict(error)
        if (conflict) warnChanged(conflict, what)
        else notifyError(error, 'No se pudo guardar la descripción')
        return false
      }
    }
    const result = queueRef.current.then(run)
    queueRef.current = result
    return result
  }

  /**
   * «Pasar al checklist»: primero se crean los pasos; quien llama quita de la descripción solo los que se crearon.
   * Devuelve cuántos se crearon (en orden); falla si no se creó ninguno.
   */
  const moveTasks = async (items) => {
    let result
    try {
      result = await moveToChecklist.mutateAsync(items)
    } catch (error) {
      notifyError(error, 'No se pudo pasar al checklist')
      throw error
    }
    const { created, error } = result
    if (created > 0) toast.success(created === 1 ? 'Se pasó 1 paso al checklist' : `Se pasaron ${created} pasos al checklist`)
    if (error) {
      const missing = items.length - created
      notifyError(error, created > 0 ? `${missing} ${missing === 1 ? 'paso no se pasó' : 'pasos no se pasaron'} al checklist` : 'No se pudo pasar al checklist')
      if (created === 0) throw error
    }
    return created
  }

  /** «Pasar al checklist» desde la lectura: antes de crear los pasos se confirma que la descripción sigue igual. */
  const moveTasksFromReader = async (indexes) => {
    const seen = issue.descriptionVersion ?? 0
    let fresh
    try {
      fresh = await queryClient.fetchQuery({ queryKey: issueKey, queryFn: () => issuesApi.get(slug, project.id, issue.id), staleTime: 0 })
    } catch (error) {
      notifyError(error, 'No se pudo pasar al checklist')
      return
    }
    if ((fresh.descriptionVersion ?? 0) !== seen && fresh.descriptionVersion !== ownVersionRef.current) {
      warnChanged({ by: fresh.descriptionUpdatedBy, at: fresh.descriptionUpdatedAt }, 'No se pasó nada al checklist.')
      return
    }
    const { items, groups } = takeTaskItems(markdownToDoc(norm(fresh.description)), indexes)
    if (!items.length) return
    let created
    try {
      created = await moveTasks(items)
    } catch {
      return
    }
    // Si alguno falló, solo se quitan las casillas que quedaron completas en el checklist
    const moved = movedIndexes(indexes, groups, created)
    if (!moved.length) return
    await changeDescription(
      fresh.descriptionVersion ?? 0,
      (current) => docToMarkdown(takeTaskItems(markdownToDoc(current), moved).doc),
      'Los pasos quedaron en el checklist y también siguen en la descripción.',
    )
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
        onMoveTasks={moveTasks}
        onFinish={() => setEditing(null)}
      />
    )
  }

  return (
    <DescriptionReader
      issue={issue}
      slug={slug}
      project={project}
      variant={variant}
      description={description}
      onOpenIssue={onOpenIssue}
      onEdit={(caret) => setEditing({ caret })}
      onToggleTask={(index, checked) => {
        changeDescription(
          issue.descriptionVersion ?? 0,
          (current) => docToMarkdown(setTaskChecked(markdownToDoc(current), index, checked)),
          checked ? 'La casilla no se marcó.' : 'La casilla no se desmarcó.',
        )
      }}
      onMoveTasks={(indexes) => {
        moveTasksFromReader(indexes)
      }}
    />
  )
}

function DescriptionReader({ issue, slug, project, variant, description, onOpenIssue, onEdit, onToggleTask, onMoveTasks }) {
  const lastEdit = lastEditOf(issue)
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

const SAVE_TEXT = { saved: 'Guardado', pending: 'Guardando…', saving: 'Guardando…', error: 'No se pudo guardar', conflict: 'En pausa' }

/** Aviso persistente con el texto que no se pudo guardar al salir del editor (para no perderlo). */
function warnUnsaved(body, reason) {
  toast.warning('Tu cambio en la descripción no se guardó', {
    description: `${reason} Copia tu texto para no perderlo.`,
    duration: Infinity,
    action: {
      label: 'Copiar mi texto',
      onClick: () => {
        navigator.clipboard
          ?.writeText(body)
          .then(() => toast.success('Tu texto quedó copiado'))
          .catch(() => {})
      },
    },
  })
}

function DescriptionEditor({ slug, project, issue, variant, caret, onMoveTasks, onFinish }) {
  const queryClient = useQueryClient()
  const save = useSaveDescription(slug, project.id, issue.id)
  const createIssue = useCreateIssue(slug, project.id)
  const removeIssue = useDeleteIssue(slug, project.id)
  const people = useMentionPeople(slug, project.id)
  const me = useSessionStore((state) => state.user?.id)
  const apiRef = useRef(null)
  const [initial] = useState(() => norm(issue.description))
  const draftRef = useRef(initial)
  // La versión de la que parte lo que escribo (la que abrí o la última que guardé) y su texto
  const baseRef = useRef(issue.descriptionVersion ?? 0)
  const savedRef = useRef(initial)
  const timerRef = useRef(null)
  // El guardado en curso (una promesa que no falla) y si hay otro esperando
  const inFlightRef = useRef(null)
  const queuedRef = useRef(false)
  const unmountedRef = useRef(false)
  const [status, setStatus] = useState('saved')
  // Otra versión en el servidor, pendiente de decidir: { description, version, by, at }
  const [conflict, setConflict] = useState(null)
  const conflictRef = useRef(null)
  // Comparando las dos versiones: mi texto (se actualiza mientras escribo); `null` si no se compara
  const [comparing, setComparing] = useState(null)

  const showConflict = (value) => {
    clearTimeout(timerRef.current)
    conflictRef.current = value
    setConflict(value)
    setStatus('conflict')
  }
  const clearConflict = () => {
    conflictRef.current = null
    setConflict(null)
    setComparing(null)
  }

  const flush = () => {
    clearTimeout(timerRef.current)
    // Con un cambio de otra persona pendiente de decidir, no se guarda solo (se decide en el aviso)
    if (conflictRef.current) return
    const body = norm(draftRef.current)
    if (body === savedRef.current) {
      setStatus('saved')
      return
    }
    if (inFlightRef.current) {
      queuedRef.current = true
      return
    }
    setStatus('saving')
    inFlightRef.current = save
      .mutateAsync({ description: body, base: baseRef.current })
      .then(
        (updated) => {
          baseRef.current = updated.descriptionVersion ?? baseRef.current
          savedRef.current = norm(updated.description)
          return true
        },
        (error) => {
          const theirs = descriptionConflict(error)
          if (theirs) {
            showConflict(theirs)
          } else {
            setStatus('error')
            notifyError(error, 'No se pudo guardar la descripción')
          }
          return false
        },
      )
      .then((ok) => {
        inFlightRef.current = null
        // Al salir del editor, lo que falta lo guarda el desmontaje
        if (unmountedRef.current) return
        if (queuedRef.current) {
          queuedRef.current = false
          flush()
        } else if (ok) {
          setStatus(norm(draftRef.current) === savedRef.current ? 'saved' : 'pending')
        }
      })
  }

  const onChange = (markdown) => {
    draftRef.current = markdown
    clearTimeout(timerRef.current)
    if (conflictRef.current) {
      if (comparing != null) setComparing(norm(markdown))
      return
    }
    if (norm(markdown) === savedRef.current) {
      setStatus('saved')
      return
    }
    setStatus('pending')
    timerRef.current = setTimeout(flush, AUTOSAVE_MS)
  }

  /** Terminar: guarda lo que falte y cierra solo si se guardó (con un conflicto o un error, el editor sigue abierto). */
  const finish = async () => {
    if (conflictRef.current) {
      toast.warning('Elige qué versión mantener', { description: 'Alguien más cambió la descripción mientras editabas.' })
      return
    }
    flush()
    while (inFlightRef.current) await inFlightRef.current
    if (unmountedRef.current || conflictRef.current) return
    if (norm(draftRef.current) !== savedRef.current) return
    onFinish()
  }

  // Al cerrar la tarea (o salir) lo que falta se guarda igual, sobre la última versión guardada
  useEffect(
    () => () => {
      unmountedRef.current = true
      clearTimeout(timerRef.current)
      const saveOnLeave = () => {
        const body = norm(draftRef.current)
        if (body === savedRef.current) return
        if (conflictRef.current) {
          warnUnsaved(body, 'Alguien más cambió la descripción mientras editabas.')
          return
        }
        save.mutateAsync({ description: body, base: baseRef.current }).catch((error) => {
          warnUnsaved(body, descriptionConflict(error) ? 'Alguien más cambió la descripción mientras editabas.' : 'No se pudo guardar.')
        })
      }
      if (inFlightRef.current) inFlightRef.current.then(saveOnLeave)
      else saveOnLeave()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al desmontar
    [],
  )

  // Aviso temprano: mientras se edita, la tarea se vuelve a pedir cada 20 s y al volver a la ventana
  useEffect(() => {
    const check = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issue(issue.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(issue.id) })
    }
    const id = setInterval(check, REMOTE_CHECK_MS)
    const onVisible = () => document.visibilityState === 'visible' && check()
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [queryClient, issue.id])

  // Si la tarea que llegó trae una versión más nueva de otra persona, se avisa antes de guardar encima
  const remoteVersion = issue.descriptionVersion ?? 0
  const remoteText = norm(issue.description)
  useEffect(() => {
    if (conflictRef.current || inFlightRef.current || remoteVersion <= baseRef.current) return
    if (remoteText === savedRef.current) {
      // El mismo texto que ya tengo: nada que decidir
      baseRef.current = remoteVersion
      return
    }
    showConflict({ description: remoteText, version: remoteVersion, by: issue.descriptionUpdatedBy, at: issue.descriptionUpdatedAt })
  }, [remoteVersion, remoteText, status, issue.descriptionUpdatedBy, issue.descriptionUpdatedAt])

  /** «Ver su versión»: lo mío se descarta y sigo editando sobre la suya. */
  const keepTheirs = () => {
    const theirs = conflictRef.current
    if (!theirs) return
    apiRef.current?.setMarkdown(theirs.description)
    draftRef.current = theirs.description
    savedRef.current = theirs.description
    baseRef.current = theirs.version
    clearConflict()
    setStatus('saved')
    apiRef.current?.focus()
  }

  /** «Mantener la mía»: se guarda lo mío encima de su versión (si alguien guarda otra vez antes, vuelve a preguntar). */
  const keepMine = () => {
    const theirs = conflictRef.current
    if (!theirs) return
    baseRef.current = theirs.version
    savedRef.current = theirs.description
    clearConflict()
    flush()
    apiRef.current?.focus()
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
    // Si todavía se está editando, el código vuelve a ser el texto en el editor (y se guarda solo). Si ya no está
    // en el texto, no se guarda nada por debajo del editor: sería un conflicto con uno mismo
    if (apiRef.current) {
      if (!apiRef.current.replaceText(created.code, text)) {
        toast(`${created.code} ya no está en el texto`, { description: 'La subtarea se eliminó; el texto quedó como estaba.' })
      }
      return
    }
    const cached = queryClient.getQueryData(queryKeys.issue(issue.id))
    const current = norm(cached?.description)
    const pattern = new RegExp(`(?<![\\w-])${created.code}(?![\\w-])`)
    if (!pattern.test(current)) return
    try {
      await save.mutateAsync({ description: current.replace(pattern, escapeText(text)), base: cached?.descriptionVersion ?? 0 })
    } catch (error) {
      const theirs = descriptionConflict(error)
      if (theirs) {
        toast.warning('Alguien cambió la descripción', {
          description: `${changedBy(theirs, me)}. ${created.code} sigue en el texto: cámbialo a mano si hace falta.`,
        })
      } else {
        notifyError(error)
      }
    }
  }

  const page = variant === 'page'
  const contentClass = page ? 'min-h-28 px-5.5 pt-4.5 pb-5' : 'min-h-24 px-4 pt-3.5 pb-4'
  const busy = status === 'pending' || status === 'saving'

  return (
    <section aria-label="Descripción" className="flex flex-col gap-1.5">
      <div className="relative rounded-[14px] border border-ring bg-card shadow-[0_0_0_3px_var(--accent-soft)]">
        {conflict && (
          <ConflictBanner
            conflict={conflict}
            me={me}
            mine={comparing}
            onCompare={() => setComparing((value) => (value == null ? norm(draftRef.current) : null))}
            onKeepTheirs={keepTheirs}
            onKeepMine={keepMine}
          />
        )}
        <LazyRichEditor
          value={initial}
          onChange={onChange}
          toolbar={page ? 'full' : 'panel'}
          stickyToolbar={!conflict}
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
          <span
            role="status"
            className={cn('flex items-center gap-1.5', status === 'saved' && 'text-foreground', status === 'error' && 'text-destructive', status === 'conflict' && 'text-soon')}
          >
            {busy && <Spinner className="size-3" />}
            {status === 'saved' && <Check className="size-3.25 text-ok-dot" strokeWidth={2.6} />}
            {SAVE_TEXT[status]}
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

/** «Alguien cambió la descripción»: quién y cuándo, comparar las dos versiones y elegir. */
function ConflictBanner({ conflict, me, mine, onCompare, onKeepTheirs, onKeepMine }) {
  const comparing = mine != null
  const who = conflict.by ? (conflict.by.id === me ? 'Tú, en otra ventana' : firstName(conflict.by)) : null
  return (
    <div role="alert" className="tf-fade rounded-t-[13px] border-b bg-soon-soft text-[13px] text-soon">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2">
        <span className="font-semibold">Alguien cambió la descripción</span>
        {(who || conflict.at) && (
          <span className="text-xs">
            {[who, conflict.at && formatRelative(conflict.at)].filter(Boolean).join(' · ')}
          </span>
        )}
        <span className="text-xs">Tus cambios no se guardan hasta que elijas.</span>
        <span className="ml-auto flex gap-1.5">
          <Button size="sm" variant="ghost" className="h-7 text-soon hover:bg-card/60 hover:text-soon" aria-expanded={comparing} onClick={onCompare}>
            {comparing ? 'Ocultar comparación' : 'Comparar'}
          </Button>
          <Button size="sm" variant="outline" className="h-7 bg-card" onClick={onKeepTheirs}>
            Ver su versión
          </Button>
          <Button size="sm" className="h-7" onClick={onKeepMine}>
            Mantener la mía
          </Button>
        </span>
      </div>
      {comparing && <CompareVersions theirs={conflict.description} mine={mine} theirLabel={who ? `Su versión · ${who}` : 'Su versión'} />}
    </div>
  )
}

/** Las dos versiones en Markdown, lado a lado, con las líneas que cambian marcadas. */
function CompareVersions({ theirs, mine, theirLabel }) {
  const diff = diffLines(theirs, mine)
  const column = (label, lines, tone) => (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-[10px] border bg-card text-foreground">
      <div className="border-b bg-subtle px-3 py-1.5 font-mono text-[11px] text-muted-foreground">{label}</div>
      <pre className="max-h-72 overflow-auto py-1.5 font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-words">
        {lines.map((line, index) => (
          <div key={index} className={cn('min-h-[1.6em] px-3', line.changed && tone)}>
            {line.text || ' '}
          </div>
        ))}
      </pre>
    </div>
  )
  return (
    <div className="border-t border-soon/20 px-3.5 pt-2.5 pb-3">
      {diff.same ? (
        <p className="text-xs">Las dos versiones son iguales.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {column(theirLabel, diff.left, 'bg-late-soft')}
          {column('Tu versión', diff.right, 'bg-accent-soft')}
        </div>
      )}
    </div>
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
