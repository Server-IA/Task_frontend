import { describe, expect, it } from 'vitest'
import { knownFilterIds, missingFiltersText, withoutUnknownParams, withoutUnknownViewFilters } from './unknownFilters'

const ids = (...values) => values.map((id) => ({ id }))

describe('filtros con ids que ya no existen', () => {
  const known = knownFilterIds({
    states: ids('s1'),
    users: ids('u1'),
    labels: ids('l1'),
    cycles: ids('c1'),
    modules: ids('m1'),
  })

  it('una lista sin cargar no descarta nada', () => {
    const partial = knownFilterIds({ states: ids('s1'), labels: undefined })
    expect(Object.keys(partial)).toEqual(['state'])
    expect(withoutUnknownParams(new URLSearchParams('label=borrada&state=s1'), partial)).toBeNull()
  })

  it('quita de la URL la etiqueta, estado, persona, ciclo o módulo desconocidos y deja lo demás', () => {
    const params = new URLSearchParams('label=borrada&label=l1&state=viejo&assignee=u9&cycle=c9&module=m1&priority=HIGH&issue=i1')
    const next = withoutUnknownParams(params, known)
    expect(next.getAll('label')).toEqual(['l1'])
    expect(next.has('state')).toBe(false)
    expect(next.has('assignee')).toBe(false)
    expect(next.has('cycle')).toBe(false)
    expect(next.get('module')).toBe('m1')
    expect(next.get('priority')).toBe('HIGH')
    expect(next.get('issue')).toBe('i1')
  })

  it('sin nada desconocido no cambia la URL', () => {
    expect(withoutUnknownParams(new URLSearchParams('label=l1&cycle=c1&search=x'), known)).toBeNull()
  })

  it('en una vista guardada, dice qué filtros quedaron vacíos (solo tenían valores borrados)', () => {
    const { filters, emptied } = withoutUnknownViewFilters(
      { label: ['borrada'], state: ['s1', 'viejo'], cycle: 'c9', module: null, priority: ['HIGH'], view: 'list' },
      known,
    )
    expect(filters).toEqual({ label: [], state: ['s1'], cycle: null, module: null, priority: ['HIGH'], view: 'list' })
    expect(emptied).toEqual(['label', 'cycle'])
  })

  it('el aviso es discreto y en español', () => {
    expect(missingFiltersText([])).toBeNull()
    expect(missingFiltersText(['label'])).toBe('Esta vista filtraba por una etiqueta que ya no existe')
    expect(missingFiltersText(['cycle'])).toBe('Esta vista filtraba por un ciclo que ya no existe')
    expect(missingFiltersText(['label', 'cycle'])).toBe('Esta vista filtraba por etiqueta y ciclo que ya no existen')
  })
})
