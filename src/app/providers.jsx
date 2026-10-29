import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/api/queryClient'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useApplyTheme } from '@/hooks/useTheme'

export function AppProviders({ children }) {
  useApplyTheme()

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </TooltipProvider>
      {import.meta.env.VITE_QUERY_DEVTOOLS === 'true' && <ReactQueryDevtools buttonPosition="bottom-left" />}
    </QueryClientProvider>
  )
}
