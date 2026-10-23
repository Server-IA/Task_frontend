import { cn } from '@/lib/utils'
import { AssigneesPicker, DatePicker, LabelsPicker, PriorityPicker, StatePicker } from './PropertyPickers'
import { isOverdue, useIssueUpdater } from '../useIssueHelpers'

/**
 * Propiedades editables de un issue en línea (estado, prioridad, asignados, etiquetas, fecha límite).
 * Se usa en las filas de la lista y en las tarjetas del Kanban.
 */
export function InlineIssueProperties({ slug, projectId, issue, meta, compact = false, show = {} }) {
  const { update } = useIssueUpdater(slug, projectId, issue.id)
  const visible = { state: true, priority: true, assignees: true, labels: true, dueDate: true, ...show }
  // En filas y tarjetas, las propiedades vacías solo aparecen al pasar el mouse (menos ruido visual)
  const whenEmpty = (isEmpty) =>
    cn(
      'border-border',
      compact && isEmpty && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100',
    )

  return (
    <div className="flex flex-wrap items-center gap-1" onClick={(event) => event.stopPropagation()}>
      {visible.state && (
        <StatePicker
          states={meta.states}
          value={issue.state?.id}
          onChange={(stateId) => update({ stateId })}
          showLabel={!compact}
          className="border-border"
        />
      )}
      {visible.priority && (
        <PriorityPicker
          value={issue.priority}
          onChange={(priority) => update({ priority })}
          showLabel={false}
          className="border-border"
        />
      )}
      {visible.labels && (meta.labels.length > 0 || issue.labels?.length > 0) && (
        <LabelsPicker
          labels={meta.labels}
          value={issue.labels?.map((label) => label.id) ?? []}
          onChange={(labelIds) => update({ labelIds })}
          compact
          className={whenEmpty(!issue.labels?.length)}
        />
      )}
      {visible.dueDate && (
        <DatePicker
          value={issue.dueDate}
          placeholder="Fecha límite"
          isOverdue={isOverdue(issue)}
          minDate={issue.startDate}
          onChange={(dueDate) => update(dueDate ? { dueDate } : { clearDueDate: true })}
          className={whenEmpty(!issue.dueDate)}
        />
      )}
      {visible.assignees && (
        <AssigneesPicker
          members={meta.users}
          value={issue.assignees?.map((user) => user.id) ?? []}
          onChange={(assigneeIds) => update({ assigneeIds })}
          showLabel={false}
          className={whenEmpty(!issue.assignees?.length)}
        />
      )}
    </div>
  )
}
