import { describe, expect, it } from 'vitest'
import { applyTemplate, appliedParts, checklistLabel, stripPrefix, templateSummary, usesLabel } from './applyTemplate'

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
const base = { title: '', description: '', priority: 'NONE', labelIds: [] }

describe('aplicar plantillas', () => {
  it('pone prefijo, descripción, prioridad y etiquetas y conserva el título escrito', () => {
    const values = { ...base, title: 'El botón no responde' }
    expect(applyTemplate(values, bug, { base: values })).toEqual({
      title: '[Bug] El botón no responde',
      description: '## Pasos para reproducir',
      priority: 'HIGH',
      labelIds: ['l-bug'],
    })
  })

  it('al cambiar de plantilla quita el prefijo anterior y vuelve a lo de antes en lo que la nueva no fija', () => {
    const userValues = { title: 'Login', description: '', priority: 'LOW', labelIds: ['l-ui'] }
    const withBug = applyTemplate(userValues, bug, { base: userValues })
    expect(applyTemplate(withBug, story, { previous: bug, base: userValues })).toEqual({
      title: 'Login',
      description: 'Como … quiero …',
      priority: 'LOW',
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
