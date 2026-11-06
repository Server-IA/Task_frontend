import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './errors'
import { notifyError } from './notify'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), warning: vi.fn() } }))

beforeEach(() => vi.clearAllMocks())

describe('notifyError', () => {
  it('un 400 de validación dice qué campo falló, no solo «Datos inválidos»', () => {
    const error = new ApiError({
      status: 400,
      message: 'Datos inválidos',
      errors: { 'items[0].title': 'El título no puede superar 255 caracteres' },
    })
    notifyError(error, 'No se pudieron crear las tareas')
    expect(toast.error).toHaveBeenCalledWith('No se pudieron crear las tareas', {
      description: 'El título no puede superar 255 caracteres',
    })
  })

  it('con varios campos, junta los mensajes distintos (hasta dos)', () => {
    const error = new ApiError({
      status: 400,
      message: 'Datos inválidos',
      errors: { 'items[0].title': 'Muy largo', 'items[1].title': 'Muy largo', name: 'Falta el nombre', other: 'Otro' },
    })
    notifyError(error)
    expect(toast.error).toHaveBeenCalledWith('Muy largo · Falta el nombre')
  })

  it('los demás errores siguen con su mensaje', () => {
    notifyError(new ApiError({ status: 409, message: 'El ciclo está cerrado' }), 'No se pudo')
    expect(toast.error).toHaveBeenCalledWith('No se pudo', { description: 'El ciclo está cerrado' })
  })
})
