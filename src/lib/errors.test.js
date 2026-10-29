import { describe, expect, it } from 'vitest'
import { asSentence } from './errors'

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
