import { describe, expect, it } from 'vitest'
import { MAIN_MENU, moveKey, orderItems, PROJECT_SECTIONS, sanitizeMenuOrder } from './menuOrder'

const keys = (items) => items.map((item) => item.key ?? item.path)

describe('orden del menú lateral', () => {
  it('por defecto deja el orden de fábrica', () => {
    expect(keys(orderItems(MAIN_MENU, 'default'))).toEqual(['inbox', 'my-work', 'activity', 'projects', 'settings'])
  })

  it('alfabético ordena por el nombre, sin importar tildes ni mayúsculas', () => {
    expect(orderItems(MAIN_MENU, 'alpha').map((item) => item.label)).toEqual(['Actividad', 'Ajustes', 'Bandeja', 'Mi trabajo', 'Proyectos'])
    expect(orderItems(PROJECT_SECTIONS, 'alpha', [], (section) => section.path).map((section) => section.label)).toEqual([
      'Ajustes',
      'Ciclos',
      'Daily',
      'Estadísticas',
      'Historias',
      'Hoja de ruta',
      'Módulos',
      'Reportes',
      'Tareas',
    ])
  })

  it('personalizado sigue las claves guardadas', () => {
    expect(keys(orderItems(MAIN_MENU, 'custom', ['settings', 'projects', 'inbox', 'activity', 'my-work']))).toEqual([
      'settings',
      'projects',
      'inbox',
      'activity',
      'my-work',
    ])
  })

  it('una entrada que no estaba cuando se ordenó va al final, y una clave que ya no existe se ignora', () => {
    expect(keys(orderItems(MAIN_MENU, 'custom', ['projects', 'vieja', 'inbox']))).toEqual(['projects', 'inbox', 'my-work', 'activity', 'settings'])
  })

  it('mueve una clave a otra posición', () => {
    expect(moveKey(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b'])
    expect(moveKey(['a', 'b', 'c'], 'a', 2)).toEqual(['b', 'c', 'a'])
    const same = ['a', 'b']
    expect(moveKey(same, 'a', -1)).toBe(same)
    expect(moveKey(same, 'x', 1)).toBe(same)
  })

  it('sanea lo guardado en el navegador', () => {
    expect(sanitizeMenuOrder(undefined)).toEqual({ mode: 'default', main: [], sections: [] })
    expect(sanitizeMenuOrder({ mode: 'raro', main: ['inbox', 3], sections: 'x' })).toEqual({ mode: 'default', main: ['inbox'], sections: [] })
    expect(sanitizeMenuOrder({ mode: 'custom', main: ['a'], sections: ['b'] })).toEqual({ mode: 'custom', main: ['a'], sections: ['b'] })
  })
})
