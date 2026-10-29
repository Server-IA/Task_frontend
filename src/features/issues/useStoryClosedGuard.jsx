import { useCallback, useState } from 'react'
import { isStoryClosedError } from '@/features/stories/hooks'
import { useWorkspace } from '@/features/workspaces/hooks'
import { toApiError } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { isManager as isManagerRole } from '@/lib/permissions'
import { StoryClosedDialog } from './components/StoryClosedDialog'

/**
 * Código de la historia cerrada: la historia de la tarea o, si no se sabe (al cambiar de padre), el del mensaje del
 * backend («WEB-15 está cerrada…»).
 */
export function closedStoryCode(error, issue) {
  if (issue?.parent?.type === 'STORY') return issue.parent.code
  return toApiError(error).message?.match(/^(\S+-\d+) está cerrada/)?.[1] ?? null
}

/** Qué se intentó, para el diálogo: «Mover WEB-17 a «Todo»», «Convertir WEB-17 en tarea»… */
export const closedStoryActions = {
  move: (issue, state) => `Mover ${issue.code} a «${state?.name ?? 'otro estado'}»`,
  type: (issue) => `Convertir ${issue.code} en tarea`,
  parent: (issue) => `Agregar ${issue.code} a la historia`,
}

/**
 * Cambiar el estado o el tipo de una tarea de una historia cerrada (o pasarla a una) responde 409 STORY_CLOSED: se
 * pregunta si se reabre la historia (solo el project manager; se reintenta con `reopenParent: true`).
 *
 * `onStoryClosed(issue, action, retry, fallbackMessage?)` devuelve un `onError`: con STORY_CLOSED abre el diálogo y
 * «Reabrir la historia y continuar» llama a `retry()`; con otro error, muestra el toast de siempre. Es estable entre
 * renders (las filas y tarjetas memorizadas lo reciben como prop).
 * @param {string} slug workspace de la tarea (decide si quien mira es project manager)
 */
export function useStoryClosedGuard(slug) {
  const { data: workspace } = useWorkspace(slug)
  const manager = isManagerRole(workspace?.myRole)
  const [pending, setPending] = useState(null)

  const onStoryClosed = useCallback(
    (issue, action, retry, fallbackMessage) => (error) => {
      if (isStoryClosedError(error)) setPending({ storyCode: closedStoryCode(error, issue), action, retry })
      else notifyError(error, fallbackMessage)
    },
    [],
  )

  const dialog = (
    <StoryClosedDialog
      pending={pending}
      manager={manager}
      onOpenChange={(open) => !open && setPending(null)}
      onReopen={() => {
        const retry = pending?.retry
        setPending(null)
        retry?.()
      }}
    />
  )

  return { onStoryClosed, dialog, manager }
}
