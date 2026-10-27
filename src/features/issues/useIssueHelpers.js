import { useMemo } from 'react'
import { isBefore, parseISO, startOfToday } from 'date-fns'
import { useLabels, useProjectMembers, useStates } from '@/features/projects/hooks'
import { notifyError } from '@/lib/notify'
import { useUpdateIssue } from './hooks'

/** Estados, etiquetas y miembros del proyecto (lo que necesitan los selectores de propiedades). */
export function useProjectMeta(slug, projectId) {
  const states = useStates(slug, projectId)
  const labels = useLabels(slug, projectId)
  const members = useProjectMembers(slug, projectId)
  const users = useMemo(() => (members.data ?? []).map((member) => member.user), [members.data])

  return {
    states: states.data ?? [],
    labels: labels.data ?? [],
    users,
    isLoading: states.isLoading || labels.isLoading || members.isLoading,
  }
}

/** Devuelve `update(cambios)` para una tarea; muestra un toast si el backend lo rechaza. */
export function useIssueUpdater(slug, projectId, issueId) {
  const mutation = useUpdateIssue(slug, projectId)
  const update = (changes, options) =>
    mutation.mutate({ issueId, ...changes }, { onError: (error) => notifyError(error), ...options })
  return { update, isPending: mutation.isPending }
}

/** La tarea está cerrada (completada o cancelada). */
export function isClosed(issue) {
  return issue?.state?.group === 'COMPLETED' || issue?.state?.group === 'CANCELLED'
}

/** Fecha límite vencida (solo si la tarea no está completada ni cancelada). */
export function isOverdue(issue) {
  if (!issue?.dueDate || isClosed(issue)) return false
  return isBefore(parseISO(issue.dueDate), startOfToday())
}
