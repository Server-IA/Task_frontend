import { describe, expect, it } from 'vitest'
import { filterStories, hasStoryFilters } from './storyFilters'

const row = (code, extra = {}) => ({
  story: { id: code, code, title: `Historia ${code}`, priority: 'MEDIUM', cycle: null, modules: [], assignees: [], ...extra.story },
  people: extra.people ?? [],
})

const rows = [
  row('WEB-15', { story: { title: 'Pantalla de perfil', cycle: { id: 'c2' }, modules: [{ id: 'm1' }] }, people: [{ id: 'luis' }] }),
  row('WEB-31', { story: { title: 'Comparar planes', priority: 'HIGH', modules: [{ id: 'm2' }] } }),
  row('WEB-32', { story: { title: 'Leer el blog', priority: 'LOW' } }),
]
const none = { search: '', cycle: [], module: [], priority: [], assignee: [] }
const codes = (list) => list.map((item) => item.story.code)

describe('filtros de Historias', () => {
  it('sin filtros, todas', () => {
    expect(codes(filterStories(rows, none))).toEqual(['WEB-15', 'WEB-31', 'WEB-32'])
  })

  it('busca por título o código', () => {
    expect(codes(filterStories(rows, { ...none, search: 'perfil' }))).toEqual(['WEB-15'])
    expect(codes(filterStories(rows, { ...none, search: 'web-32' }))).toEqual(['WEB-32'])
  })

  it('ciclo y módulo, con «sin ciclo» y «sin módulo»', () => {
    expect(codes(filterStories(rows, { ...none, cycle: ['none'] }))).toEqual(['WEB-31', 'WEB-32'])
    expect(codes(filterStories(rows, { ...none, cycle: ['c2'] }))).toEqual(['WEB-15'])
    expect(codes(filterStories(rows, { ...none, module: ['m2', 'none'] }))).toEqual(['WEB-31', 'WEB-32'])
  })

  it('prioridad y personas de sus tareas', () => {
    expect(codes(filterStories(rows, { ...none, priority: ['HIGH', 'LOW'] }))).toEqual(['WEB-31', 'WEB-32'])
    expect(codes(filterStories(rows, { ...none, assignee: ['luis'] }))).toEqual(['WEB-15'])
  })
})

describe('hasStoryFilters', () => {
  it('sin filtros (o una búsqueda en blanco) no cuenta: el vacío no habla de «esos filtros»', () => {
    expect(hasStoryFilters(none)).toBe(false)
    expect(hasStoryFilters({ ...none, search: '   ' })).toBe(false)
  })

  it('cualquier filtro o una búsqueda con letras cuenta', () => {
    expect(hasStoryFilters({ ...none, search: 'perfil' })).toBe(true)
    expect(hasStoryFilters({ ...none, priority: ['HIGH'] })).toBe(true)
    expect(hasStoryFilters({ ...none, cycle: ['none'] })).toBe(true)
  })
})
