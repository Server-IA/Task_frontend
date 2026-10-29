import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/api/queryKeys'
import { dailyApi } from './api'
import { useSaveDailyNote } from './hooks'

vi.mock('./api', () => ({ dailyApi: { saveNote: vi.fn() } }))

describe('useSaveDailyNote', () => {
  it('los guardados van en fila: una respuesta vieja no llega después de la nueva', async () => {
    const queryClient = new QueryClient()
    const key = queryKeys.daily('p1', '2026-10-29')
    queryClient.setQueryData(key, { note: null })
    const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    let resolveFirst
    dailyApi.saveNote
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce({ text: 'Acuerdos y más' })
    const { result } = renderHook(() => useSaveDailyNote('acme', 'p1', '2026-10-29'), { wrapper })

    act(() => {
      result.current.mutate('Acuerdos')
      result.current.mutate('Acuerdos y más')
    })
    await waitFor(() => expect(dailyApi.saveNote).toHaveBeenCalledTimes(1))

    resolveFirst({ text: 'Acuerdos' })
    await waitFor(() => expect(dailyApi.saveNote).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(queryClient.getQueryData(key).note.text).toBe('Acuerdos y más'))
  })
})
