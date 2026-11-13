import { memo, useCallback, useState } from 'react'
import { Link } from 'react-router'
import { Check, Download, Inbox, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/common/Loaders'
import { StateIcon } from '@/components/common/StateIcon'
import { formatSize } from '@/features/files/fileTypes'
import { useMembers } from '@/features/workspaces/hooks'
import { t, tn } from '@/i18n'
import { formatDateTime, formatShortDate } from '@/lib/dates'
import { notifyError } from '@/lib/notify'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useDownloadImportReport, useSaveImportMapping, useStartImport, useStopImport, useUndoImport } from './hooks'
import {
  categoryLabel,
  priorityTargets,
  shownStateName,
  skipReason,
  sourceName,
  stageLabel,
  stateGroups,
  stateKey,
  toMapping,
  typeTargets,
} from './importModel'
import { StatusPill, UndoDialog } from './ImportParts'

const PANEL_HEAD = 'px-4 pt-3.5 pb-2.5'
const ROW = 'flex items-center gap-2.5 border-t px-4 py-2'
const ARROW = <span aria-hidden="true" className="text-muted-foreground">→</span>
/** El grupo de TaskFlow que le toca a un estado del origen cuando se crea con su nombre. */
const GROUP_OF = { BACKLOG: 'BACKLOG', TODO: 'UNSTARTED', IN_PROGRESS: 'STARTED', DONE: 'COMPLETED', CANCELLED: 'CANCELLED' }

const NO_MEMBERS = []
const VALID_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/**
 * Paso «Equivalencias»: cada tipo, estado, prioridad y persona del origen con lo que le corresponde en TaskFlow. Llega
 * propuesto; aquí se cambia lo que no sirva. Al continuar se guardan y se pasa a revisar lo que se crearía con ellas.
 */
export function MappingStep({ workspace, job, onBack, onNext }) {
  const { data: members = NO_MEMBERS } = useMembers(workspace.slug)
  const save = useSaveImportMapping(workspace.slug, job.id)
  const [mapping, setMapping] = useState(() => toMapping(job.mapping))
  const proposal = job.mapping
  const mayInvite = can(workspace, 'MEMBER_INVITE')
  const set = (section, key, value) => setMapping((current) => ({ ...current, [section]: { ...current[section], [key]: value } }))
  // Estable entre renders: así una fila de persona solo se repinta cuando cambia lo suyo
  const setPerson = useCallback(
    (id, value) => setMapping((current) => ({ ...current, people: { ...current.people, [id]: value } })),
    [],
  )

  const outside = proposal.people.filter((person) => mapping.people[person.id]?.action !== 'MEMBER').length
  const missingEmail = proposal.people.some((person) => {
    const target = mapping.people[person.id]
    return target?.action === 'INVITE' && !VALID_EMAIL.test(target.email ?? '')
  })

  const submit = () =>
    save.mutate(mapping, { onSuccess: onNext, onError: (error) => notifyError(error, t('No se pudieron guardar las equivalencias')) })

  return (
    <>
      {proposal.types.length > 0 && (
        <section aria-labelledby="import-types-title" className="tf-panel flex flex-col gap-3 px-5 pt-4 pb-4.5">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <h2 id="import-types-title" className="text-[15px] font-semibold">
              {t('Tipos')}
            </h2>
            <span className="text-[12.5px] text-muted-foreground">
              {t('Cómo queda cada tipo del origen. TaskFlow ya los emparejó; cambia lo que no te sirva.')}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {proposal.types.map((type) => (
              <div key={type.source} className="flex flex-col gap-1.5 rounded-xl border px-3 py-2.5">
                <span className="font-mono text-[11.5px] text-muted-foreground">
                  {type.source} <span className="opacity-70">· {type.count}</span>
                </span>
                <Select value={mapping.types[type.source]} onValueChange={(value) => set('types', type.source, value)}>
                  <SelectTrigger aria-label={t('En qué se convierte {name}', { name: type.source })} className="h-8.5 w-full font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeTargets().map((target) => (
                      <SelectItem key={target.value} value={target.value}>
                        {target.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {mapping.types[type.source] === 'MODULE' && (
                  <span className="text-[11.5px] leading-snug text-muted-foreground">{t('agrupa a las tareas que cuelgan de él')}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <section aria-labelledby="import-states-title" className="overflow-hidden rounded-2xl border bg-card">
          <div className={PANEL_HEAD}>
            <h2 id="import-states-title" className="text-[15px] font-semibold">
              {t('Estados')} <span className="font-mono text-xs font-normal text-muted-foreground">{proposal.states.length}</span>
            </h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">{t('Uno que no exista se crea en el proyecto.')}</p>
          </div>
          <ul>
            {proposal.states.map((state) => (
              <StateRow key={state.source} row={state} choices={proposal.stateChoices} value={mapping.states[state.source]} onChange={(value) => set('states', state.source, value)} />
            ))}
          </ul>
        </section>

        <section aria-labelledby="import-people-title" className="overflow-hidden rounded-2xl border bg-card">
          <div className={PANEL_HEAD}>
            <h2 id="import-people-title" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold">
              {t('Personas')} <span className="font-mono text-xs font-normal text-muted-foreground">{proposal.people.length}</span>
              {outside > 0 && (
                <span className="rounded-full bg-soon-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-soon">
                  {tn(outside, '{count} no está en el workspace', '{count} no están en el workspace')}
                </span>
              )}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              {t('Se emparejan por correo o por nombre. A quien invites, sus tareas se le asignan cuando acepte.')}
            </p>
          </div>
          {proposal.people.length === 0 ? (
            <p className="border-t px-4 py-4 text-[13px] text-muted-foreground">{t('Las tareas de este origen no tienen personas.')}</p>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto">
              {proposal.people.map((person) => (
                <PersonRow key={person.id} row={person} members={members} mayInvite={mayInvite} value={mapping.people[person.id]} onChange={setPerson} />
              ))}
            </ul>
          )}
        </section>
      </div>

      {proposal.priorities.length > 0 && (
        <section aria-labelledby="import-priorities-title" className="tf-panel flex flex-wrap items-center gap-x-3 gap-y-2.5 px-5 py-3.5">
          <h2 id="import-priorities-title" className="mr-1 text-[15px] font-semibold">
            {t('Prioridades')}
          </h2>
          {proposal.priorities.map((priority) => (
            <span key={priority.source} className="inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-0.5 pl-2.5 text-[13px]">
              <span className="font-mono text-[11.5px] text-muted-foreground">{priority.source}</span>
              {ARROW}
              <Select value={mapping.priorities[priority.source]} onValueChange={(value) => set('priorities', priority.source, value)}>
                <SelectTrigger aria-label={t('Prioridad para {name}', { name: priority.source })} className="h-7 gap-1 rounded-full border-0 px-2 font-semibold shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityTargets().map((target) => (
                    <SelectItem key={target.value} value={target.value}>
                      {target.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </span>
          ))}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={onBack}>
          {t('Atrás')}
        </Button>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {t('estas equivalencias se proponen en la próxima importación desde {source}', { source: sourceName(job.source) })}
        </span>
        {missingEmail && (
          <span role="status" className="text-[12.5px] text-late">
            {t('A alguien marcado para invitar le falta un correo válido.')}
          </span>
        )}
        <Button onClick={submit} disabled={save.isPending || missingEmail}>
          {save.isPending && <Spinner />}
          {t('Continuar')}
        </Button>
      </div>
    </>
  )
}

function StateRow({ row, choices, value, onChange }) {
  // Además de los estados que hay, se puede crear uno con el nombre que tiene en el origen
  const own = { name: row.source, group: GROUP_OF[row.category] ?? 'UNSTARTED' }
  const known = choices.some((choice) => choice.name.toLowerCase() === own.name.toLowerCase())
  const options = known ? choices : [...choices, own]
  const current = options.find((option) => stateKey(option) === stateKey(value)) ?? value
  const created = !choices.some((choice) => stateKey(choice) === stateKey(current))
  return (
    <li className={ROW}>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{row.source}</span>
        <span className="block font-mono text-[11px] text-muted-foreground">
          {categoryLabel(row.category)} · {tn(row.count, '{count} tarea', '{count} tareas')}
        </span>
      </span>
      {ARROW}
      <Select value={stateKey(current)} onValueChange={(key) => onChange(options.find((option) => stateKey(option) === key))}>
        <SelectTrigger aria-label={t('Estado para {name}', { name: row.source })} className={cn('h-8.5 min-w-0 flex-1', created && 'border-ring bg-accent-soft text-accent-text')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={stateKey(option)} value={stateKey(option)}>
              <span className="flex min-w-0 items-center gap-2">
                <StateIcon group={option.group} className="size-3.5 shrink-0" />
                <span className="truncate">
                  {choices.includes(option) ? shownStateName(option.name) : t('Crear «{name}»', { name: option.name })}
                </span>
                {!choices.includes(option) && (
                  <span className="font-mono text-[11px] text-muted-foreground">{stateGroups().find((group) => group.value === option.group)?.label}</span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </li>
  )
}

const PersonRow = memo(function PersonRow({ row, members, mayInvite, value, onChange }) {
  const key = value.action === 'MEMBER' ? value.userId : value.action
  const pick = (next) => {
    if (next === 'UNASSIGNED') onChange(row.id, { action: 'UNASSIGNED', userId: null, email: row.email ?? null, roleId: null })
    else if (next === 'INVITE') onChange(row.id, { action: 'INVITE', userId: null, email: value.email ?? row.email ?? '', roleId: null })
    else onChange(row.id, { action: 'MEMBER', userId: next, email: null, roleId: null })
  }
  const emailMissing = value.action === 'INVITE' && !VALID_EMAIL.test(value.email ?? '')
  return (
    <li className={cn(ROW, 'flex-wrap')}>
      <span className="min-w-0 flex-[1_1_150px]">
        <span className="block truncate font-medium">{row.name}</span>
        <span className="block truncate font-mono text-[11px] text-muted-foreground">
          {[row.email !== row.name && row.email, row.count > 0 ? tn(row.count, '{count} tarea', '{count} tareas') : t('sin tareas asignadas')]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
      {ARROW}
      <span className="flex min-w-0 flex-[1.2_1_180px] flex-col gap-1.5">
        <Select value={key} onValueChange={pick}>
          <SelectTrigger
            aria-label={t('Qué pasa con {name}', { name: row.name })}
            className={cn('h-8.5 w-full min-w-0', value.action === 'INVITE' && 'border-ring bg-accent-soft text-accent-text', value.action === 'UNASSIGNED' && 'border-soon/50 bg-soon-soft text-soon')}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UNASSIGNED">{t('Dejar sin asignar')}</SelectItem>
            {/* Sin permiso de invitar la opción solo aparece si ya venía puesta (de una importación anterior): al empezar
                se cambia a «sin asignar» */}
            {(mayInvite || value.action === 'INVITE') && <SelectItem value="INVITE">{t('Invitar como Miembro')}</SelectItem>}
            {members.map((member) => (
              <SelectItem key={member.user.id} value={member.user.id}>
                {member.user.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {value.action === 'INVITE' && !row.email && (
          <Input
            type="email"
            aria-label={t('Correo de {name}', { name: row.name })}
            placeholder={t('persona@correo.com')}
            className="h-8.5"
            aria-invalid={emailMissing}
            value={value.email ?? ''}
            onChange={(event) => onChange(row.id, { ...value, email: event.target.value.trim() })}
          />
        )}
        {emailMissing && <span className="text-[12px] text-late">{t('Falta un correo válido para invitarla.')}</span>}
      </span>
    </li>
  )
})

const TYPE_TONE = { STORY: 'bg-[#ECE6FF] text-[#4B33A8] dark:bg-[#2B2440] dark:text-[#C9BBFF]', BUG: 'bg-late-soft text-late', TASK: 'bg-muted text-muted-foreground' }
const typeLabel = (type) => ({ STORY: t('Historia'), BUG: t('Bug'), TASK: t('Tarea') })[type]

/** Paso «Revisar»: lo que se va a crear, una muestra de cómo queda y lo que conviene saber antes de importar. */
export function ReviewStep({ workspace, job, onBack }) {
  const start = useStartImport(workspace.slug, job.id)
  const { totals, sample, newStates, labels, freeBytes, attachmentsAvailable } = job.preview
  const options = job.selection?.options ?? {}
  const issues = totals.stories + totals.tasks + totals.bugs

  const creates = [
    [t('Proyectos nuevos'), '', totals.projects],
    [t('Módulos'), '', totals.modules],
    [t('Ciclos'), totals.closedCycles > 0 ? tn(totals.closedCycles, '{count} cerrado', '{count} cerrados') : '', totals.cycles],
    [t('Historias'), '', totals.stories],
    [t('Tareas'), totals.subtasks > 0 ? tn(totals.subtasks, '{count} es subtarea', '{count} son subtareas') : '', totals.tasks],
    [t('Bugs'), '', totals.bugs],
    [t('Etiquetas'), '', labels],
    [t('Estados nuevos'), newStates.map((state) => `«${state.name}»`).join(', '), newStates.length],
    [t('Comentarios'), '', totals.comments],
    [t('Adjuntos'), totals.attachments > 0 ? formatSize(totals.attachmentBytes) : '', totals.attachments],
    [t('Invitaciones'), '', totals.invitations],
  ].filter(([, , count]) => count > 0)

  const wantsFiles = options.attachments && totals.attachments + totals.tooBig + totals.notAllowed > 0
  const warnings = [
    wantsFiles && !attachmentsAvailable && [
      totals.attachments + totals.tooBig + totals.notAllowed,
      job.via === 'FILE'
        ? tn(
            totals.attachments + totals.tooBig + totals.notAllowed,
            'adjunto no se trae: un archivo no da con qué descargarlo. Queda listado en el informe.',
            'adjuntos no se traen: un archivo no da con qué descargarlos. Quedan listados en el informe.',
          )
        : tn(
            totals.attachments + totals.tooBig + totals.notAllowed,
            'adjunto no se puede traer ahora (no hay conexión con el origen o el almacenamiento no está configurado). Queda listado en el informe.',
            'adjuntos no se pueden traer ahora (no hay conexión con el origen o el almacenamiento no está configurado). Quedan listados en el informe.',
          ),
    ],
    wantsFiles && attachmentsAvailable && totals.attachmentBytes > freeBytes && [
      formatSize(totals.attachmentBytes),
      t('de adjuntos no caben en los {free} libres del workspace: entran los que quepan y el resto queda en el informe.', { free: formatSize(freeBytes) }),
    ],
    totals.tooBig > 0 && [
      totals.tooBig,
      tn(
        totals.tooBig,
        'adjunto pasa del límite por archivo y no se trae. Queda listado en el informe.',
        'adjuntos pasan del límite por archivo y no se traen. Quedan listados en el informe.',
      ),
    ],
    totals.notAllowed > 0 && [
      totals.notAllowed,
      tn(totals.notAllowed, 'adjunto es de un tipo que TaskFlow no acepta y no se trae.', 'adjuntos son de un tipo que TaskFlow no acepta y no se traen.'),
    ],
    totals.withPoints > 0 && [
      totals.withPoints,
      tn(
        totals.withPoints,
        'tarea tiene story points u horas registradas: quedan como una línea al final de la descripción.',
        'tareas tienen story points u horas registradas: quedan como una línea al final de la descripción.',
      ),
    ],
    totals.unassigned > 0 && [
      totals.unassigned,
      tn(
        totals.unassigned,
        'tarea pierde a alguien asignado que no entra a TaskFlow; su nombre queda anotado en ella.',
        'tareas pierden a alguien asignado que no entra a TaskFlow; su nombre queda anotado en cada una.',
      ),
    ],
    totals.invitations > 0 && [
      totals.invitations,
      tn(
        totals.invitations,
        'persona recibe una invitación al workspace. Sus tareas se le asignan cuando acepte.',
        'personas reciben una invitación al workspace. Sus tareas se les asignan cuando acepten.',
      ),
    ],
  ].filter(Boolean)

  const submit = () => start.mutate(undefined, { onError: (error) => notifyError(error, t('No se pudo empezar la importación')) })

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <section aria-labelledby="import-creates-title" className="tf-panel px-5 pt-4 pb-4.5">
          <h2 id="import-creates-title" className="mb-2.5 text-[15px] font-semibold">
            {t('Se va a crear')}
          </h2>
          {creates.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">{t('Con lo elegido no entra nada. Vuelve atrás y revisa los tipos y las opciones.')}</p>
          ) : (
            <dl>
              {creates.map(([label, note, count], index) => (
                <div key={label} className={cn('flex items-baseline gap-2.5 py-1.75', index > 0 && 'border-t')}>
                  <dt className="min-w-0 flex-1 text-[13.5px]">
                    {label} {note && <span className="text-xs text-muted-foreground">{note}</span>}
                  </dt>
                  <dd className="font-mono text-[13px] font-semibold">{count.toLocaleString()}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section aria-labelledby="import-sample-title" className="overflow-hidden rounded-2xl border bg-card">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 pt-3.5 pb-2.5">
            <h2 id="import-sample-title" className="text-[15px] font-semibold">
              {t('Así quedan')}
            </h2>
            <span className="text-[12.5px] text-muted-foreground">{t('Una muestra del primer proyecto.')}</span>
          </div>
          <ul>
            {sample.map((item, index) => (
              <li key={index} className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t px-4 py-2.5">
                <StateIcon group={item.stateGroup} className="size-3.5 shrink-0" />
                <span className={cn('rounded-md px-1.75 py-px font-mono text-[10.5px] font-semibold', TYPE_TONE[item.type])}>{typeLabel(item.type)}</span>
                {item.code && <span className="font-mono text-xs text-muted-foreground">{item.code}</span>}
                <span className="min-w-0 flex-[1_1_220px] truncate font-medium">{item.title}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {[
                    shownStateName(item.stateName),
                    item.parentCode,
                    item.module,
                    item.cycle,
                    ...item.assignees,
                    ...item.invited.map((name) => t('{name}, al aceptar', { name })),
                    item.completedAt && t('cerrada el {date}', { date: formatShortDate(item.completedAt) }),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {warnings.length > 0 && (
        <section aria-labelledby="import-warnings-title" className="rounded-2xl border border-soon/40 bg-soon-soft px-5 pt-4 pb-4.5">
          <h2 id="import-warnings-title" className="mb-2.5 flex items-center gap-2 text-[15px] font-semibold text-soon">
            <TriangleAlert className="size-4" />
            {t('Antes de importar')}
          </h2>
          <ul className="flex flex-col gap-2 text-[13.5px] leading-snug">
            {warnings.map(([count, text]) => (
              <li key={text} className="flex gap-2.5">
                <span className="min-w-8.5 shrink-0 font-mono text-[12.5px] font-semibold text-soon">{count.toLocaleString()}</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={onBack}>
          {t('Atrás')}
        </Button>
        <span className="ml-auto font-mono text-xs text-muted-foreground">{t('corre en segundo plano · se puede deshacer')}</span>
        <Button onClick={submit} disabled={start.isPending || issues === 0}>
          {start.isPending && <Spinner />}
          {tn(issues, 'Importar {count} tarea', 'Importar {count} tareas')}
        </Button>
      </div>
    </>
  )
}

/** Mientras lee del origen o escribe en TaskFlow: el avance por etapas. Se actualiza solo. */
export function ProgressStep({ workspace, job }) {
  const stop = useStopImport(workspace.slug, job.id)
  const reading = job.status === 'FETCHING'
  const progress = job.progress
  const stages = (progress?.stages ?? []).filter((stage) => stage.total > 0)
  const currentIndex = stages.findIndex((stage) => stage.done < stage.total)

  return (
    <>
      <section aria-labelledby="import-progress-title" className="tf-panel flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 id="import-progress-title" className="font-display text-[40px] leading-none font-extrabold tracking-tight">
            {progress ? `${progress.percent} %` : <Spinner className="size-7" />}
          </h2>
          <span className="flex-[1_1_240px] text-muted-foreground">
            {reading ? t('Leyendo lo elegido desde {source}…', { source: sourceName(job.source) }) : t('Importando desde {source}…', { source: sourceName(job.source) })}
          </span>
          {!reading && (
            <Button
              variant="outline"
              size="sm"
              className="text-late hover:text-late"
              disabled={stop.isPending || stop.isSuccess}
              onClick={() => stop.mutate(undefined, { onError: (error) => notifyError(error) })}
            >
              {stop.isSuccess ? t('Deteniendo…') : t('Detener')}
            </Button>
          )}
        </div>
        {/* Una barra: es el avance hacia un total */}
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress?.percent ?? 0}
          aria-label={t('Avance de la importación')}
          className="h-2.5 overflow-hidden rounded-full bg-muted"
        >
          <span className="block h-full rounded-full bg-accent-text transition-[width] duration-500" style={{ width: `${progress?.percent ?? 0}%` }} />
        </div>
        {stages.length > 0 && (
          <ol className="overflow-hidden rounded-[14px] border">
            {stages.map((stage, index) => {
              const done = stage.done >= stage.total
              const now = index === currentIndex
              return (
                <li key={stage.key} className={cn('flex items-center gap-3 px-3.5 py-2.5', index > 0 && 'border-t', now && 'bg-accent-soft')}>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-5.5 shrink-0 items-center justify-center rounded-full',
                      done ? 'bg-ok-soft text-ok' : now ? 'bg-primary text-primary-foreground' : 'border border-dash',
                    )}
                  >
                    {done ? <Check className="size-3" strokeWidth={3} /> : now ? <span className="size-1.5 rounded-full bg-current" /> : null}
                  </span>
                  <span className={cn('flex-1', now ? 'font-semibold' : done ? 'font-medium' : 'text-muted-foreground')}>{stageLabel(stage.key)}</span>
                  <span className={cn('font-mono text-xs', !done && !now && 'text-muted-foreground')}>
                    {t('{done} de {total}', { done: Math.min(stage.done, stage.total).toLocaleString(), total: stage.total.toLocaleString() })}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
        {progress?.current && <p className="truncate font-mono text-xs text-muted-foreground">{t('ahora: {what}', { what: progress.current })}</p>}
      </section>
      <p className="flex gap-2.5 rounded-2xl border border-dashed border-dash px-4 py-3 text-[13.5px] leading-normal text-muted-foreground">
        <Inbox className="mt-0.5 size-4 shrink-0" />
        <span>
          {reading
            ? t('Puedes cerrar esta página: la lectura sigue sola y, cuando termine, aquí estarán las equivalencias para revisar.')
            : t('Puedes cerrar esta página y seguir trabajando: la importación sigue sola y te avisamos en la Bandeja cuando termine. Si la detienes, lo importado hasta ese momento se puede deshacer.')}
        </span>
      </p>
    </>
  )
}

const DONE_TEXT = {
  COMPLETED: () => t('Importación terminada'),
  FAILED: () => t('La importación no terminó'),
  STOPPED: () => t('Importación detenida'),
  UNDOING: () => t('Deshaciendo la importación…'),
  UNDONE: () => t('Importación deshecha'),
}

/** El informe: lo que entró, lo que no y por qué, los proyectos y deshacer. */
export function ReportStep({ workspace, job, onHome }) {
  const undo = useUndoImport(workspace.slug)
  const download = useDownloadImportReport(workspace.slug)
  const [confirming, setConfirming] = useState(false)
  const report = job.report
  const finished = ['COMPLETED', 'FAILED', 'STOPPED'].includes(job.status)
  const ok = job.status === 'COMPLETED'
  const issues = report ? report.stories + report.tasks + report.bugs : 0

  const handleUndo = () =>
    undo.mutate(job.id, {
      onSuccess: () => setConfirming(false),
      onError: (error) => notifyError(error, t('No se pudo deshacer')),
    })

  const tiles = report && [
    [t('tareas'), issues, [report.stories > 0 && tn(report.stories, '{count} historia', '{count} historias'), report.bugs > 0 && tn(report.bugs, '{count} bug', '{count} bugs')]],
    [t('proyectos'), report.projects.length, [report.modules > 0 && tn(report.modules, '{count} módulo', '{count} módulos'), report.cycles > 0 && tn(report.cycles, '{count} ciclo', '{count} ciclos')]],
    [t('comentarios'), report.comments, []],
    [t('adjuntos'), report.attachments, [report.attachments > 0 && formatSize(report.attachmentBytes)]],
  ]

  return (
    <>
      <section aria-labelledby="import-done-title" className="tf-panel flex flex-wrap items-center gap-3.5 px-5 py-4.5">
        <span aria-hidden="true" className={cn('flex size-11 shrink-0 items-center justify-center rounded-full', ok ? 'bg-ok-soft text-ok' : 'bg-muted text-muted-foreground')}>
          {job.status === 'UNDOING' ? <Spinner /> : ok ? <Check className="size-5.5" strokeWidth={2.6} /> : <TriangleAlert className="size-5" />}
        </span>
        <div className="min-w-0 flex-[1_1_300px]">
          <h2 id="import-done-title" className="flex flex-wrap items-center gap-2.5 text-xl font-semibold">
            {DONE_TEXT[job.status]?.()}
            {!ok && <StatusPill job={job} />}
          </h2>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {[job.sourceLabel, job.createdByName, job.finishedAt && formatDateTime(job.finishedAt)].filter(Boolean).join(' · ')}
          </p>
          {job.error && <p className="mt-1.5 text-sm text-late">{job.error}</p>}
        </div>
        {report?.skippedTotal > 0 && (
          <Button variant="outline" disabled={download.isPending} onClick={() => download.mutate(job, { onError: (error) => notifyError(error, t('No se pudo descargar')) })}>
            {download.isPending ? <Spinner /> : <Download />}
            {t('Descargar informe')}
          </Button>
        )}
      </section>

      {report && job.status !== 'UNDONE' && (
        <>
          <dl aria-label={t('Lo que entró')} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map(([label, value, notes]) => (
              <div key={label} className="tf-panel px-4 py-3.5">
                <dt className="font-mono text-[11px] text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-display text-[28px] leading-none font-extrabold tracking-tight">{value.toLocaleString()}</dd>
                <dd className="mt-1 min-h-4 text-xs text-muted-foreground">{notes.filter(Boolean).join(' · ')}</dd>
              </div>
            ))}
          </dl>

          <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <section aria-labelledby="import-skipped-title" className="overflow-hidden rounded-2xl border bg-card">
              <div className={PANEL_HEAD}>
                <h2 id="import-skipped-title" className="text-[15px] font-semibold">
                  {t('Lo que no entró')}
                </h2>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  {report.skippedTotal > 0 ? t('La lista completa, tarea por tarea, va en el informe que se descarga.') : t('Entró todo lo que se eligió.')}
                </p>
              </div>
              {report.skipped.length > 0 && (
                <ul>
                  {report.skipped.map((group) => {
                    const [title, why] = skipReason(group.reason)
                    return (
                      <li key={group.reason} className="flex items-baseline gap-3 border-t px-4 py-2.5">
                        <span className="min-w-7 shrink-0 font-mono text-[13px] font-semibold">{group.count.toLocaleString()}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{title}</span>
                          {why && <span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">{why}</span>}
                          <span className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">
                            {group.items
                              .slice(0, 3)
                              .map((item) => [item.key, item.detail ?? item.title].filter(Boolean).join(' '))
                              .join(' · ')}
                            {group.count > 3 && ' …'}
                          </span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section aria-labelledby="import-projects-done-title" className="tf-panel flex flex-col gap-2.5 px-4.5 py-4">
              <h2 id="import-projects-done-title" className="text-[15px] font-semibold">
                {t('Proyectos')}
              </h2>
              {report.projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/${workspace.slug}/projects/${project.id}/issues`}
                  className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors duration-150 hover:border-dash hover:bg-subtle"
                >
                  <span className="rounded-[5px] bg-muted px-1.5 py-px font-mono text-[10px] font-semibold">{project.identifier}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{project.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {project.created ? tn(project.issues, '{count} tarea', '{count} tareas') : tn(project.issues, '+{count} tarea', '+{count} tareas')}
                  </span>
                </Link>
              ))}
              <p className="text-[12.5px] leading-snug text-muted-foreground">
                {report.invitations > 0 && <>{tn(report.invitations, '{count} invitación enviada.', '{count} invitaciones enviadas.')} </>}
                {t('Cada tarea importada dice de dónde vino y enlaza a su original.')}
              </p>
            </section>
          </div>
        </>
      )}

      {finished && (
        <section aria-labelledby="import-undo-title" className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-dashed border-dash px-5 py-4">
          <div className="min-w-0 flex-[1_1_320px]">
            <h2 id="import-undo-title" className="text-[15px] font-semibold">
              {ok ? t('¿No quedó como esperabas?') : t('Lo que alcanzó a entrar se puede deshacer')}
            </h2>
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
              {t(
                'Deshacer elimina los proyectos, tareas, comentarios y archivos que creó esta importación, también lo que se haya trabajado en ellos después. Lo que ya tenías en TaskFlow no se toca.',
              )}
            </p>
          </div>
          <Button variant="outline" className="text-late hover:text-late" onClick={() => setConfirming(true)}>
            {t('Deshacer importación')}
          </Button>
        </section>
      )}
      {job.status === 'UNDONE' && (
        <div className="flex justify-end">
          <Button onClick={onHome}>{t('Importar de nuevo')}</Button>
        </div>
      )}
      <UndoDialog job={confirming ? job : null} loading={undo.isPending} onCancel={() => setConfirming(false)} onConfirm={handleUndo} />
    </>
  )
}
