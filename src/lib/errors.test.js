import { describe, expect, it, vi } from 'vitest'
import { applyFieldErrors, asSentence } from './errors'

describe('asSentence', () => {
  it('agrega el punto que le falta al mensaje del backend', () => {
    expect(asSentence('El enlace de verificación no es válido o ya expiró')).toBe(
      'El enlace de verificación no es válido o ya expiró.',
    )
  })

  it('no duplica la puntuación final', () => {
    expect(asSentence('La invitación expiró.')).toBe('La invitación expiró.')
    expect(asSentence('¿Seguro?')).toBe('¿Seguro?')
    expect(asSentence('  Espera…  ')).toBe('Espera…')
  })

  it('sin mensaje, nada', () => {
    expect(asSentence(undefined)).toBe('')
  })
})

describe('applyFieldErrors', () => {
  const apiError = (errors) => ({ response: { status: 400, data: { status: 400, message: 'Datos inválidos', errors } } })

  it('traduce el nombre del campo de la API al del formulario (targetDate de un módulo → endDate)', () => {
    const setError = vi.fn()
    const shown = applyFieldErrors(apiError({ targetDate: 'La fecha debe estar entre 1900 y 2999' }), setError, {
      aliases: { targetDate: 'endDate' },
      fields: ['name', 'endDate'],
    })
    expect(shown).toBe(true)
    expect(setError).toHaveBeenCalledWith('endDate', { type: 'server', message: 'La fecha debe estar entre 1900 y 2999' })
  })

  it('con un error de un campo que el formulario no tiene devuelve false, para avisarlo aparte', () => {
    const setError = vi.fn()
    expect(applyFieldErrors(apiError({ otro: 'mal' }), setError, { fields: ['name'] })).toBe(false)
    expect(setError).not.toHaveBeenCalled()
  })
})
