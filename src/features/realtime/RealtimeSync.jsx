import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CLIENT_ID } from '@/api/clientId'
import { startRealtime } from '@/api/realtime'
import { shouldRefresh, slugOf } from './refreshRules'

/** Los avisos que llegan juntos (un movimiento que toca varias cosas, una ráfaga de GitHub) se atienden de una vez. */
export const GATHER_MS = 250
/** Mientras esta pestaña guarda algo, lo que llega de otros espera: así no se ve un instante el valor de antes. */
const WHILE_SAVING_MS = 400

/**
 * Tiempo real: con la sesión abierta escucha los avisos del servidor y vuelve a pedir lo que se está mostrando y
 * cambió (por otra persona, por otra pestaña, por GitHub o una importación). Lo de antes sigue en pantalla mientras
 * llega lo nuevo, así que la actualización no parpadea. No dibuja nada.
 */
export function RealtimeSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let pending = { changes: [], notifications: false, everything: false }
    let timer = null

    const flush = () => {
      timer = null
      if (queryClient.isMutating() > 0) {
        timer = setTimeout(flush, WHILE_SAVING_MS)
        return
      }
      const batch = { ...pending, currentSlug: slugOf(window.location.pathname) }
      pending = { changes: [], notifications: false, everything: false }
      queryClient.invalidateQueries({ predicate: (query) => shouldRefresh(query.queryKey, batch) })
    }
    const gather = (apply) => {
      apply(pending)
      if (!timer) timer = setTimeout(flush, GATHER_MS)
    }

    const stop = startRealtime({
      onEvent: ({ event, data }) => {
        // Lo que hizo esta misma pestaña ya está en pantalla
        if (data?.origin && data.origin === CLIENT_ID) return
        if (event === 'notifications') gather((batch) => (batch.notifications = true))
        else if (event === 'change') gather((batch) => batch.changes.push(data ?? {}))
      },
      onReconnect: () => gather((batch) => (batch.everything = true)),
    })
    return () => {
      stop()
      clearTimeout(timer)
    }
  }, [queryClient])

  return null
}
