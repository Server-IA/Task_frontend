import { describe, expect, it } from 'vitest'
import { buildTimeline, itemRange } from './roadmap'

// Martes 27 de octubre de 2026
const today = new Date(2026, 9, 27, 10)

describe('itemRange', () => {
  it('usa endDate en ciclos y targetDate en módulos; con una sola fecha ocupa ese día', () => {
    expect(itemRange({ startDate: '2026-10-15', endDate: '2026-10-29' }).end.getDate()).toBe(29)
    expect(itemRange({ startDate: '2026-10-08', targetDate: '2026-11-06' }).end.getMonth()).toBe(10)
    const single = itemRange({ startDate: null, targetDate: '2026-11-06' })
    expect(single.start).toEqual(single.end)
    expect(itemRange({ startDate: null, endDate: null })).toBeNull()
  })
})

describe('buildTimeline (semanas)', () => {
  const sprint = { startDate: '2026-10-15', endDate: '2026-10-29' }
  const timeline = buildTimeline([sprint], 'weeks', today)

  it('empieza un lunes, una semana antes de lo planificado, y tiene al menos 10 semanas', () => {
    expect(timeline.start.getDay()).toBe(1)
    expect(timeline.start.getDate()).toBe(5)
    expect(timeline.columns.length).toBeGreaterThanOrEqual(10)
    expect(timeline.columns[0]).toMatchObject({ label: '5', x: 0, width: 98 })
  })

  it('marca la semana de hoy y coloca la línea a mitad del día', () => {
    const current = timeline.columns.find((column) => column.current)
    expect(current.label).toBe('26')
    // 22 días desde el lunes 5 de octubre, 14 px por día
    expect(timeline.todayX).toBe(22 * 14 + 7)
  })

  it('la barra va del inicio al final del último día', () => {
    expect(timeline.bar(sprint)).toEqual({ left: 10 * 14, width: 15 * 14 })
    expect(timeline.bar({ startDate: null, endDate: null })).toBeNull()
  })

  it('el encabezado agrupa por mes', () => {
    expect(timeline.groups[0]).toMatchObject({ label: 'Octubre', x: 0 })
    expect(timeline.groups[1].label).toBe('Noviembre')
  })
})

describe('buildTimeline (meses y trimestres)', () => {
  it('los meses empiezan el día 1 y se rotulan por mes', () => {
    const timeline = buildTimeline([], 'months', today)
    expect(timeline.start.getDate()).toBe(1)
    expect(timeline.columns.map((column) => column.label).slice(0, 3)).toEqual(['Sep', 'Oct', 'Nov'])
  })

  it('los trimestres se rotulan T1…T4', () => {
    const timeline = buildTimeline([], 'quarters', today)
    expect(timeline.columns[0].label).toBe('T4')
    expect(timeline.columns.find((column) => column.current).label).toBe('T4')
  })
})

describe('buildTimeline (ancho mínimo)', () => {
  it('agrega columnas hasta llenar el ancho disponible', () => {
    const narrow = buildTimeline([], 'months', today)
    const wide = buildTimeline([], 'months', today, 1200)
    expect(wide.width).toBeGreaterThanOrEqual(1200)
    expect(wide.columns.length).toBeGreaterThan(narrow.columns.length)
    expect(wide.start).toEqual(narrow.start)
  })
})
