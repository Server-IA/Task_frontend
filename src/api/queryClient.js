import { QueryClient } from '@tanstack/react-query'
import { toApiError } from '@/lib/errors'

export const queryClient = new QueryClient({
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
