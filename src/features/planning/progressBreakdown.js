import { isStory } from '@/features/issues/issueTypes'
import { isClosed } from '@/features/issues/useIssueHelpers'

/**
 * El desglose «○ por hacer ◐ en curso» de un ciclo o módulo. Como su avance (el backend), cuenta el trabajo: las
 * historias no (avanzan solas con sus tareas) y las canceladas tampoco; así, con las hechas, suma el total.
 * @param {{ type?: string, state?: { group?: string } }[]} issues
 */
export function progressBreakdown(issues) {
  const work = issues.filter((issue) => !isStory(issue))
  return {
    started: work.filter((issue) => issue.state?.group === 'STARTED').length,
    pending: work.filter((issue) => !isClosed(issue) && issue.state?.group !== 'STARTED').length,
  }
}
