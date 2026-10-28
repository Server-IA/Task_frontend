import { useCallback, useState } from 'react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { needsCriteriaConfirm, pendingCriteria } from './issueFlags'

/**
 * Confirmación al pasar una tarea a un estado completado con criterios de aceptación sin marcar.
 * `guard(issue, state, proceed, cancel?)` llama a `proceed` enseguida si no hace falta preguntar; si no, abre el
 * diálogo y llama a `proceed` o a `cancel` según la respuesta. `dialog` se pinta donde se use el hook.
 */
export function useCriteriaGuard() {
  const [pending, setPending] = useState(null)

  const guard = useCallback((issue, state, proceed, cancel) => {
    if (needsCriteriaConfirm(issue, state)) setPending({ issue, state, proceed, cancel })
    else proceed()
  }, [])

  const missing = pending ? pendingCriteria(pending.issue) : 0
  const dialog = (
    <ConfirmDialog
      open={Boolean(pending)}
      onOpenChange={(open) => {
        if (open) return
        pending?.cancel?.()
        setPending(null)
      }}
      title={pending ? `¿Mover ${pending.issue.code} a ${pending.state.name}?` : ''}
      description={
        pending
          ? `Tiene ${missing} ${missing === 1 ? 'criterio' : 'criterios'} de aceptación sin marcar (de ${pending.issue.criteriaTotal}).`
          : ''
      }
      confirmLabel="Mover igual"
      destructive={false}
      onConfirm={() => {
        pending?.proceed()
        setPending(null)
      }}
    />
  )

  return { guard, dialog }
}
