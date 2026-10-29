import { describe, expect, it } from 'vitest'
import { ApiError, toApiError } from '@/lib/errors'
import { descriptionConflict } from './hooks'

const LUIS = { id: 'luis', fullName: 'Luis Muñoz' }
const body = {
  status: 409,
  code: 'DESCRIPTION_CONFLICT',
  message: 'Alguien más cambió la descripción mientras la editabas',
  description: '  Lo que guardó Luis  ',
  descriptionVersion: 7,
  descriptionUpdatedBy: LUIS,
  descriptionUpdatedAt: '2026-10-29T10:15:00Z',
  issue: { id: 'web-4', descriptionVersion: 7 },
}

describe('descriptionConflict', () => {
  it('lee el 409 de la descripción tal como lo deja el cliente de la API (ApiError)', () => {
    const error = toApiError({ response: { status: 409, data: body, headers: {} } })
    expect(error).toBeInstanceOf(ApiError)
    expect(descriptionConflict(error)).toEqual({
      description: 'Lo que guardó Luis',
      version: 7,
      by: LUIS,
      at: '2026-10-29T10:15:00Z',
      issue: body.issue,
    })
  })

  it('también desde el error de axios sin normalizar', () => {
    expect(descriptionConflict({ response: { status: 409, data: body } })?.version).toBe(7)
  })

  it('otros errores no son un conflicto de descripción', () => {
    expect(descriptionConflict(toApiError({ response: { status: 409, data: { message: 'Duplicado' } } }))).toBeNull()
    expect(descriptionConflict(toApiError({ response: { status: 400, data: { ...body, status: 400 } } }))).toBeNull()
    expect(descriptionConflict(new Error('red'))).toBeNull()
  })
})
