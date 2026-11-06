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

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`

/**
 * El número junto a «Tareas del ciclo/módulo», en la misma unidad que el avance («4 de 16 completadas»): el trabajo
 * (tareas y bugs) sin las canceladas. Las historias y las canceladas que también están en la lista van aparte:
 * «16 · 3 historias · 1 cancelada».
 * @param {{ type?: string, state?: { group?: string } }[]} issues
 * @returns {{ text: string, title: string }} lo que se ve y el detalle para el `title`
 */
export function planningListCount(issues) {
  const stories = issues.filter(isStory).length
  const cancelled = issues.filter((issue) => !isStory(issue) && issue.state?.group === 'CANCELLED').length
  const work = issues.length - stories - cancelled
  const extras = [
    stories > 0 && plural(stories, 'historia', 'historias'),
    cancelled > 0 && plural(cancelled, 'cancelada', 'canceladas'),
  ].filter(Boolean)
  return {
    text: [String(work).padStart(2, '0'), ...extras].join(' · '),
    title: [`${plural(work, 'tarea', 'tareas')} (tareas y bugs, como el avance)`, ...extras].join(' · '),
  }
}
