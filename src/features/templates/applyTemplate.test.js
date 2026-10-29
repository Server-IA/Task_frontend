import { describe, expect, it } from 'vitest'
import {
  applyTemplate,
  appliedParts,
  checklistLabel,
  descriptionEditedSinceTemplate,
  fromTemplateFlags,
  stripPrefix,
  templateSummary,
  usesLabel,
} from './applyTemplate'

const bug = {
  name: 'Reporte de bug',
  titlePrefix: '[Bug] ',
  description: '## Pasos para reproducir',
  priority: 'HIGH',
  labels: [{ id: 'l-bug', name: 'bug', color: '#f00' }],
  checklist: [
    { kind: 'CRITERION', text: 'Dado … cuando … entonces …' },
    { kind: 'CHECK', text: 'Reproducir' },
    { kind: 'CHECK', text: 'Corregir' },
  ],
}
const story = { name: 'Historia de usuario', titlePrefix: null, description: 'Como … quiero …', priority: null, labels: [], checklist: [] }
const base = { title: '', description: '', priority: 'NONE', stateId: null, assigneeIds: [], labelIds: [] }
const todo = { id: 's-todo', name: 'Por hacer', group: 'UNSTARTED', color: '#3A3A3A' }
const ana = { id: 'u-ana', fullName: 'Ana Gómez' }
const luis = { id: 'u-luis', fullName: 'Luis Muñoz' }
/** Plantilla que además fija estado y asignados. */
const triage = { ...bug, name: 'Triage', state: todo, assignees: [ana, luis] }

describe('aplicar plantillas', () => {
  it('pone prefijo, descripción, prioridad y etiquetas y conserva el título escrito', () => {
    const values = { ...base, title: 'El botón no responde' }
    expect(applyTemplate(values, bug, { base: values })).toEqual({
      title: '[Bug] El botón no responde',
      description: '## Pasos para reproducir',
      priority: 'HIGH',
      stateId: null,
      assigneeIds: [],
      labelIds: ['l-bug'],
    })
  })

  it('pone el estado y los asignados por defecto y «Deshacer» vuelve a los de antes', () => {
    // La tarea se abrió desde la columna «En curso» y ya tenía a Carla asignada
    const userValues = { ...base, title: 'Login', stateId: 's-doing', assigneeIds: ['u-carla'] }
    const withTriage = applyTemplate(userValues, triage, { base: userValues })
    expect(withTriage.stateId).toBe('s-todo')
    expect(withTriage.assigneeIds).toEqual(['u-ana', 'u-luis'])

    const undone = applyTemplate(withTriage, null, { previous: triage, base: userValues })
    expect(undone).toEqual(userValues)
  })

  it('una plantilla sin estado ni asignados no los cambia (y al cambiar de plantilla vuelven a los de antes)', () => {
    const userValues = { ...base, title: 'x', stateId: 's-doing', assigneeIds: ['u-carla'] }
    expect(applyTemplate(userValues, story, { base: userValues })).toMatchObject({ stateId: 's-doing', assigneeIds: ['u-carla'] })
    const withTriage = applyTemplate(userValues, triage, { base: userValues })
    expect(applyTemplate(withTriage, story, { previous: triage, base: userValues })).toMatchObject({
      stateId: 's-doing',
      assigneeIds: ['u-carla'],
    })
  })

  it('marca lo que sigue igual que en la plantilla', () => {
    const applied = applyTemplate(base, triage, { base })
    expect(fromTemplateFlags(triage, applied)).toEqual({ priority: true, state: true, assignees: true, labels: true })
    expect(fromTemplateFlags(triage, { ...applied, stateId: 's-doing', assigneeIds: ['u-ana'] })).toEqual({
      priority: true,
      state: false,
      assignees: false,
      labels: true,
    })
    expect(fromTemplateFlags(null, applied)).toEqual({ priority: false, state: false, assignees: false, labels: false })
    expect(fromTemplateFlags(story, base)).toEqual({ priority: false, state: false, assignees: false, labels: false })
  })

  it('al cambiar de plantilla quita el prefijo anterior y vuelve a lo de antes en lo que la nueva no fija', () => {
    const userValues = { ...base, title: 'Login', priority: 'LOW', labelIds: ['l-ui'] }
    const withBug = applyTemplate(userValues, bug, { base: userValues })
    expect(applyTemplate(withBug, story, { previous: bug, base: userValues })).toEqual({
      title: 'Login',
      description: 'Como … quiero …',
      priority: 'LOW',
      stateId: null,
      assigneeIds: [],
      labelIds: ['l-ui'],
    })
  })

  it('quitar la plantilla deja el título sin prefijo y los valores de antes', () => {
    const userValues = { ...base, title: 'x' }
    const withBug = applyTemplate(userValues, bug, { base: userValues })
    expect(applyTemplate({ ...withBug, title: '[Bug] x mejorado' }, null, { previous: bug, base: userValues })).toEqual({
      ...userValues,
      title: 'x mejorado',
    })
  })

  it('no repite el prefijo y lo reconoce sin el espacio final', () => {
    expect(applyTemplate({ ...base, title: '[Bug] ya estaba' }, bug, { base }).title).toBe('[Bug] ya estaba')
    expect(stripPrefix('[Bug]sin espacio', '[Bug] ')).toBe('sin espacio')
    expect(stripPrefix('Otro título', '[Bug] ')).toBe('Otro título')
  })

  it('resume la plantilla', () => {
    expect(checklistLabel(bug.checklist)).toBe('2 pasos · 1 criterio')
    expect(templateSummary(bug)).toBe('[Bug] · bug · alta · 2 pasos · 1 criterio')
    expect(templateSummary(story)).toBe('')
    expect(appliedParts(bug)).toBe('prefijo, descripción, etiqueta, prioridad, 2 pasos y 1 criterio')
    expect(appliedParts(story)).toBe('descripción')
    expect(templateSummary(triage)).toBe('[Bug] · bug · alta · Por hacer · @Ana · @Luis · 2 pasos · 1 criterio')
    expect(appliedParts(triage)).toBe('prefijo, descripción, etiqueta, prioridad, estado, asignados, 2 pasos y 1 criterio')
    expect(appliedParts({ ...story, assignees: [ana] })).toBe('descripción y asignado')
  })
})

describe('usos de la plantilla', () => {
  it('cuenta en singular y plural', () => {
    expect(usesLabel(0)).toBe('sin usos')
    expect(usesLabel(undefined)).toBe('sin usos')
    expect(usesLabel(1)).toBe('1 uso')
    expect(usesLabel(12)).toBe('12 usos')
  })
})

describe('descripción editada después de la plantilla', () => {
  it('sin plantilla aplicada no hay nada que perder', () => {
    expect(descriptionEditedSinceTemplate('lo que escribí', null, null)).toBe(false)
  })

  it('igual a la de la plantilla (salvo espacios) no cuenta como editada', () => {
    expect(descriptionEditedSinceTemplate('## Pasos para reproducir\n', bug, base)).toBe(false)
  })

  it('con cambios sobre la de la plantilla, sí', () => {
    expect(descriptionEditedSinceTemplate('## Pasos para reproducir\n1. Abrir', bug, base)).toBe(true)
  })

  it('si la plantilla no fija descripción, se compara con la de antes', () => {
    const noDescription = { ...bug, description: null }
    expect(descriptionEditedSinceTemplate('', noDescription, base)).toBe(false)
    expect(descriptionEditedSinceTemplate('nuevo', noDescription, base)).toBe(true)
  })
})

