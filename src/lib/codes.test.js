import { describe, expect, it } from 'vitest'
import { exampleCode, identifierOf } from './codes'

describe('código de ejemplo', () => {
  it('usa el identificador del proyecto y, sin él, uno genérico', () => {
    expect(exampleCode('PORT')).toBe('PORT-12')
    expect(exampleCode('app')).toBe('APP-12')
    expect(exampleCode(null)).toBe('PROY-12')
    expect(exampleCode('  ')).toBe('PROY-12')
  })

  it('saca el identificador de un código de tarea', () => {
    expect(identifierOf('PORT-7')).toBe('PORT')
    expect(identifierOf('sin código')).toBeNull()
  })
})
