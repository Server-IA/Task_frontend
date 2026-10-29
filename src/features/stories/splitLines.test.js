import { describe, expect, it } from 'vitest'
import { emptyLine, linesToItems, pickerQuery, removeToken } from './splitLines'

describe('Partir en tareas', () => {
  it('«@» abre las personas y «!» las prioridades, con lo escrito después', () => {
    expect(pickerQuery('Validar correo @lu', 18)).toEqual({ kind: 'person', query: 'lu', start: 15, end: 18 })
    expect(pickerQuery('!al', 3)).toEqual({ kind: 'priority', query: 'al', start: 0, end: 3 })
    expect(pickerQuery('Validar @', 9)).toMatchObject({ kind: 'person', query: '' })
  })

  it('no abre nada en medio de una palabra ni después de un espacio', () => {
    expect(pickerQuery('correo@dominio', 14)).toBeNull()
    expect(pickerQuery('Validar @luis ', 14)).toBeNull()
    expect(pickerQuery('Validar', 7)).toBeNull()
  })

  it('al elegir, el token sale del título', () => {
    expect(removeToken('Validar @lu correo', 8, 11)).toBe('Validar correo')
    expect(removeToken('!alta Revisar', 0, 5)).toBe('Revisar')
  })

  it('manda solo las líneas con título, con su tipo, asignado y prioridad', () => {
    const lines = [
      { ...emptyLine(), title: '  Formulario de perfil ', assignee: { id: 'u1' }, priority: 'HIGH' },
      { ...emptyLine('BUG'), title: 'El nombre no se actualiza' },
      { ...emptyLine(), title: '   ' },
    ]
    expect(linesToItems(lines)).toEqual([
      { title: 'Formulario de perfil', type: 'TASK', assigneeIds: ['u1'], priority: 'HIGH' },
      { title: 'El nombre no se actualiza', type: 'BUG', assigneeIds: [] },
    ])
    expect(emptyLine().id).not.toBe(emptyLine().id)
  })
})
