import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toApiError } from '@/lib/errors'

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    // Un 404 o 403 al guardar: lo que está en pantalla ya no vale (otra persona borró la tarea o te quitó del
    // proyecto). Se recarga lo que se ve para que el panel diga «Tarea no encontrada», las listas la quiten o el
    // proyecto diga «No tienes acceso», en vez de seguir editando y recibir el mismo error con cada cambio.
    onError: (error) => {
      const { status } = toApiError(error)
      if (status === 403 || status === 404) queryClient.invalidateQueries()
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Los errores 4xx no se arreglan reintentando (permiso, no encontrado, validación…)
      retry: (failureCount, error) => {
        const { status } = toApiError(error)
        if (status >= 400 && status < 500) return false
        return failureCount < 2
      },
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
})
