import { useCallback, useState } from 'react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { stateName, t, tn } from '@/i18n'
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
      title={pending ? t('¿Mover {code} a {state}?', { code: pending.issue.code, state: stateName(pending.state) }) : ''}
      description={
        pending
          ? tn(missing, 'Tiene {count} criterio de aceptación sin marcar (de {total}).', 'Tiene {count} criterios de aceptación sin marcar (de {total}).', {
              total: pending.issue.criteriaTotal,
            })
          : ''
      }
      confirmLabel={t('Mover igual')}
      destructive={false}
      onConfirm={() => {
        pending?.proceed()
        setPending(null)
      }}
    />
  )

  return { guard, dialog }
}
