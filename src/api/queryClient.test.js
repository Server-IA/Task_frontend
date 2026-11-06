import { afterEach, describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/errors'
import { queryClient } from './queryClient'

const issueKey = ['issue', 'borrada']

async function failingMutation(status) {
  const mutation = queryClient.getMutationCache().build(queryClient, {
    mutationFn: () => Promise.reject(new ApiError({ status, message: 'Tarea no encontrada' })),
  })
  await mutation.execute().catch(() => {})
}

describe('queryClient: un 404 o 403 al guardar', () => {
  afterEach(() => queryClient.clear())

  it('recarga lo que está en pantalla (otra persona borró la tarea abierta)', async () => {
    queryClient.setQueryData(issueKey, { id: 'borrada', title: 'Concurrencia' })
    await failingMutation(404)
    expect(queryClient.getQueryState(issueKey).isInvalidated).toBe(true)
  })

  it('también con 403 (te quitaron del proyecto mientras lo tenías abierto)', async () => {
    queryClient.setQueryData(issueKey, { id: 'borrada', title: 'Concurrencia' })
    await failingMutation(403)
    expect(queryClient.getQueryState(issueKey).isInvalidated).toBe(true)
  })

  it('otros errores no invalidan nada', async () => {
    queryClient.setQueryData(issueKey, { id: 'borrada', title: 'Concurrencia' })
    await failingMutation(409)
    expect(queryClient.getQueryState(issueKey).isInvalidated).toBe(false)
  })
})
