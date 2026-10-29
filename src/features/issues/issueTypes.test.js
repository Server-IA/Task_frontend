import { describe, expect, it } from 'vitest'
import {
  bugGroups,
  effectiveTypes,
  firstTemplateOfType,
  inStoryTab,
  stateOptionsFor,
  isAllTypes,
  storyFlags,
  storyLanes,
  storyProgress,
  storyStateLocked,
  storyTabCounts,
  templateType,
  typeChangeBlock,
  typeParam,
  typesLabel,
  typesToUrl,
} from './issueTypes'

const state = (group) => ({ id: group, name: group, group })

describe('filtro de tipo', () => {
  it('sin valores muestra tareas y bugs; «all» los tres; ignora valores raros', () => {
    expect(effectiveTypes([])).toEqual(['TASK', 'BUG'])
    expect(effectiveTypes(undefined)).toEqual(['TASK', 'BUG'])
    expect(effectiveTypes(['all'])).toEqual(['STORY', 'TASK', 'BUG'])
    expect(effectiveTypes(['BUG', 'EPIC'])).toEqual(['BUG'])
    expect(effectiveTypes(['EPIC'])).toEqual(['TASK', 'BUG'])
  })

  it('a la API va la lista, salvo con los tres', () => {
    expect(typeParam(['TASK', 'BUG'])).toEqual(['TASK', 'BUG'])
    expect(typeParam(['STORY', 'TASK', 'BUG'])).toBeUndefined()
    expect(isAllTypes(['BUG', 'STORY', 'TASK'])).toBe(true)
  })

  it('en la URL: nada para los de siempre, «all» para los tres', () => {
    expect(typesToUrl(['BUG', 'TASK'])).toEqual([])
    expect(typesToUrl(['STORY', 'TASK', 'BUG'])).toEqual(['all'])
    expect(typesToUrl(['BUG', 'STORY'])).toEqual(['STORY', 'BUG'])
    expect(typesToUrl([])).toEqual([])
  })

  it('etiqueta en el orden de los tipos', () => {
    expect(typesLabel(['BUG', 'TASK'])).toBe('Tarea, Bug')
  })
})

describe('progreso y marcas de una historia', () => {
  it('«3 de 5 tareas» con las partes de la barra', () => {
    const progress = storyProgress({ storyTaskCount: 5, storyTaskDoneCount: 3, storyTaskStartedCount: 1 })
    expect(progress).toMatchObject({ total: 5, done: 3, started: 1, donePct: 60, startedPct: 20, label: '3 de 5 tareas' })
    expect(storyProgress({ storyTaskCount: 1, storyTaskDoneCount: 0 }).label).toBe('0 de 1 tarea')
    expect(storyProgress({}).label).toBe('sin tareas')
  })

  it('sin partir, lista para revisar, bugs abiertos y después de cerrar', () => {
    expect(storyFlags({ state: state('BACKLOG'), storyTaskCount: 0 })).toMatchObject({ unsplit: true, ready: false, closed: false })
    expect(storyFlags({ state: state('STARTED'), storyTaskCount: 4, readyForReview: true, openBugCount: 0 })).toMatchObject({
      unsplit: false,
      ready: true,
    })
    const closed = storyFlags({ state: state('COMPLETED'), storyTaskCount: 0, readyForReview: true, bugsAfterCloseCount: 2 })
    expect(closed).toMatchObject({ closed: true, unsplit: false, ready: false, bugsAfterClose: 2 })
    expect(storyFlags({ state: state('STARTED'), bugsAfterCloseCount: 2 }).bugsAfterClose).toBe(0)
  })
})

describe('pestañas de Historias', () => {
  const stories = [
    { id: 1, state: state('STARTED'), storyTaskCount: 5, readyForReview: false },
    { id: 2, state: state('STARTED'), storyTaskCount: 4, readyForReview: true },
    { id: 3, state: state('BACKLOG'), storyTaskCount: 0 },
    { id: 4, state: state('COMPLETED'), storyTaskCount: 3 },
  ]

  it('cada historia en sus pestañas; abiertas incluye sin partir y para revisar', () => {
    expect(storyTabCounts(stories)).toEqual({ open: 3, unsplit: 1, review: 1, closed: 1 })
    expect(inStoryTab(stories[3], 'open')).toBe(false)
  })
})

describe('cambio de tipo', () => {
  const pm = { isManager: true, hasChildren: false }
  const member = { isManager: false, hasChildren: false }

  it('una historia con tareas no deja de serlo', () => {
    expect(typeChangeBlock({ type: 'STORY' }, 'TASK', { isManager: true, hasChildren: true })).toMatch(/mover sus tareas/)
    expect(typeChangeBlock({ type: 'STORY' }, 'TASK', pm)).toBeNull()
  })

  it('solo el project manager convierte en historia o deja de serlo', () => {
    expect(typeChangeBlock({ type: 'TASK' }, 'STORY', member)).toMatch(/project manager/)
    expect(typeChangeBlock({ type: 'STORY' }, 'BUG', member)).toMatch(/project manager/)
    expect(typeChangeBlock({ type: 'TASK' }, 'BUG', member)).toBeNull()
  })

  it('una hija no puede ser historia', () => {
    expect(typeChangeBlock({ type: 'TASK', parent: { id: 'x' } }, 'STORY', pm)).toMatch(/padre/)
  })
})

describe('plantillas y tipos', () => {
  it('usa el tipo de la plantilla o lo deduce de las de siempre', () => {
    expect(templateType({ type: 'BUG', name: 'Otra' })).toBe('BUG')
    expect(templateType({ name: 'Historia de usuario' })).toBe('STORY')
    expect(templateType({ name: 'Reporte de bug' })).toBe('BUG')
    expect(templateType({ name: 'Pagos', titlePrefix: '[Bug] ' })).toBe('BUG')
    expect(templateType({ name: 'Tarea técnica' })).toBe('TASK')
    expect(templateType(null)).toBe('TASK')
    expect(firstTemplateOfType([{ id: 'a', type: 'TASK' }, { id: 'b', type: 'STORY' }], 'STORY')?.id).toBe('b')
    expect(firstTemplateOfType([], 'BUG')).toBeNull()
  })
})

describe('vista Bugs', () => {
  const user = { id: 'u', fullName: 'Luis' }
  const bug = (id, priority, assignees = [user], group = 'UNSTARTED') => ({ id, priority, assignees, state: state(group) })

  it('agrupa por prioridad y deja «Por triar» al final (sin prioridad o sin asignado)', () => {
    const groups = bugGroups([
      bug(1, 'HIGH'),
      bug(2, 'URGENT'),
      bug(3, 'NONE'),
      bug(4, 'MEDIUM', []),
      bug(5, 'HIGH', [user], 'COMPLETED'),
    ])
    expect(groups.map((group) => group.key)).toEqual(['URGENT', 'HIGH', 'triage'])
    expect(groups.at(-1).issues.map((issue) => issue.id)).toEqual([3, 4])
  })
})

describe('carriles por historia', () => {
  const parent = (id, code) => ({ id, code, title: code, type: 'STORY' })
  it('un carril por historia (en curso, luego lista, luego cerrada) y «Sin historia» al final', () => {
    const issues = [
      { id: 'a', parent: parent('s11', 'WEB-11') },
      { id: 'b', parent: parent('s15', 'WEB-15') },
      { id: 'c', parent: null },
      { id: 'd', parent: { id: 't', code: 'WEB-2', type: 'TASK' } },
      { id: 'e', parent: parent('s14', 'WEB-14') },
      { id: 'f', parent: parent('s15', 'WEB-15') },
    ]
    const stories = [
      { story: { id: 's14', sequenceId: 14, state: state('STARTED'), readyForReview: true }, people: [] },
      { story: { id: 's15', sequenceId: 15, state: state('STARTED') }, people: [{ id: 'u' }] },
    ]
    const lanes = storyLanes(issues, stories)
    expect(lanes.map((lane) => lane.key)).toEqual(['s15', 's11', 's14', 'none'])
    expect(lanes[0].issues.map((issue) => issue.id)).toEqual(['b', 'f'])
    expect(lanes[0].people).toHaveLength(1)
    expect(lanes.at(-1).issues.map((issue) => issue.id)).toEqual(['c', 'd'])
  })
})

describe('estados que se ofrecen', () => {
  const states = ['BACKLOG', 'STARTED', 'COMPLETED', 'CANCELLED'].map(state)
  const story = { type: 'STORY', state: state('STARTED') }
  const task = { type: 'TASK', state: state('STARTED') }

  it('a un miembro, una historia no le ofrece completar ni cancelar', () => {
    expect(stateOptionsFor(story, states, false).map((item) => item.group)).toEqual(['BACKLOG', 'STARTED'])
    expect(stateOptionsFor(story, states, true)).toBe(states)
    expect(stateOptionsFor(task, states, false)).toBe(states)
  })

  it('una historia cerrada solo la mueve el project manager', () => {
    const closed = { ...story, state: state('COMPLETED') }
    expect(storyStateLocked(closed, false)).toBe(true)
    expect(storyStateLocked(closed, true)).toBe(false)
    expect(storyStateLocked(story, false)).toBe(false)
    expect(storyStateLocked({ ...task, state: state('COMPLETED') }, false)).toBe(false)
  })
})

