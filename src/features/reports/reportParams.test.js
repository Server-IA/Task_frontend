import { describe, expect, it } from 'vitest'
import { DEFAULT_REPORT_OPTIONS, isRangeReversed, previewParams, reportFileName, reportOptionsError, reportParams } from './reportParams'

describe('opciones del reporte', () => {
  it('arma la consulta con los filtros puestos y las opciones, sin lo vacío', () => {
    const filters = { state: ['s1'], priority: [], assignee: [], label: [], type: ['TASK', 'BUG'], search: '', cycle: undefined, module: 'm1', blocked: true }
    expect(reportParams(filters, { ...DEFAULT_REPORT_OPTIONS, createdFrom: '2026-11-01', dueTo: '2026-11-30', groupBy: 'ASSIGNEE' })).toEqual({
      state: ['s1'],
      type: ['TASK', 'BUG'],
      module: 'm1',
      blocked: true,
      createdFrom: '2026-11-01',
      dueTo: '2026-11-30',
      groupBy: 'ASSIGNEE',
      sort: 'PRIORITY',
    })
  })

  it('las secciones solo viajan cuando se quitan', () => {
    expect(reportParams({}, DEFAULT_REPORT_OPTIONS)).toEqual({ groupBy: 'STATE', sort: 'PRIORITY' })
    expect(reportParams({}, { ...DEFAULT_REPORT_OPTIONS, summary: false })).toMatchObject({ summary: false })
    expect(reportParams({}, { ...DEFAULT_REPORT_OPTIONS, issues: false })).toMatchObject({ issues: false })
  })

  it('la vista previa no depende de cómo se agrupa, se ordena ni de las secciones', () => {
    const a = previewParams({ state: ['s1'] }, { ...DEFAULT_REPORT_OPTIONS, groupBy: 'TYPE', sort: 'TITLE', summary: false })
    expect(a).toEqual({ state: ['s1'] })
  })

  it('detecta un rango al revés y la falta de secciones', () => {
    expect(isRangeReversed('2026-11-10', '2026-11-01')).toBe(true)
    expect(isRangeReversed('2026-11-01', '2026-11-01')).toBe(false)
    expect(isRangeReversed(null, '2026-11-01')).toBe(false)
    expect(reportOptionsError(DEFAULT_REPORT_OPTIONS)).toBeNull()
    expect(reportOptionsError({ ...DEFAULT_REPORT_OPTIONS, createdFrom: '2026-11-10', createdTo: '2026-11-01' })).toMatch(/Creadas/)
    expect(reportOptionsError({ ...DEFAULT_REPORT_OPTIONS, dueFrom: '2026-11-10', dueTo: '2026-11-01' })).toMatch(/Fecha límite/)
    expect(reportOptionsError({ ...DEFAULT_REPORT_OPTIONS, summary: false, issues: false })).toMatch(/al menos una sección/)
  })

  it('nombra el archivo con el identificador y el día', () => {
    expect(reportFileName('PORT', '2026-11-10')).toBe('reporte-tareas-PORT-2026-11-10.pdf')
  })
})
