import { useCallback, useMemo } from 'react'
import { isBefore, parseISO, startOfToday } from 'date-fns'
import { useLabels, useProjectMembers, useStates } from '@/features/projects/hooks'
import { notifyError } from '@/lib/notify'
import { useUpdateIssue } from './hooks'

const NONE = []

/**
 * Estados, etiquetas y miembros del proyecto (lo que necesitan los selectores de propiedades). El objeto es el mismo
 * mientras no cambien los datos: las tarjetas y filas memorizadas lo reciben como prop.
 */
export function useProjectMeta(slug, projectId) {
  const states = useStates(slug, projectId)
  const labels = useLabels(slug, projectId)
  const members = useProjectMembers(slug, projectId)
  const users = useMemo(() => (members.data ?? NONE).map((member) => member.user), [members.data])
  const isLoading = states.isLoading || labels.isLoading || members.isLoading

  return useMemo(
    () => ({ states: states.data ?? NONE, labels: labels.data ?? NONE, users, isLoading }),
    [states.data, labels.data, users, isLoading],
  )
}

/**
 * Devuelve `update(cambios, { onError?, ...opciones })` para una tarea; si el backend lo rechaza, llama a `onError`
 * o muestra un toast. `onError` viaja con la mutación (ver useUpdateIssue): se llama aunque se haga otro cambio antes
 * de que este termine.
 */
export function useIssueUpdater(slug, projectId, issueId) {
  const mutation = useUpdateIssue(slug, projectId, issueId)
  const { mutate } = mutation
  const update = useCallback(
    (changes, { onError = (error) => notifyError(error), ...options } = {}) => mutate({ issueId, ...changes, onError }, options),
    [mutate, issueId],
  )
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
