import { describe, expect, it } from 'vitest'
import { average, barPath, formatDelta, idealRemaining, linePath, nearestIndex, niceScale, percent } from './chartMath'

describe('niceScale', () => {
  it('redondea el máximo hacia arriba con tres marcas', () => {
    expect(niceScale(9)).toEqual({ max: 10, ticks: [0, 5, 10] })
    expect(niceScale(13)).toEqual({ max: 20, ticks: [0, 10, 20] })
  })

  it('con valores pequeños o en cero el paso nunca baja de 1', () => {
    expect(niceScale(1)).toEqual({ max: 2, ticks: [0, 1, 2] })
    expect(niceScale(0)).toEqual({ max: 2, ticks: [0, 1, 2] })
    expect(niceScale(3)).toEqual({ max: 4, ticks: [0, 2, 4] })
  })
})

describe('barPath', () => {
  it('redondea la punta y deja la base recta', () => {
    expect(barPath(10, 20, 20, 100, 4)).toBe('M10,100 V24 Q10,20 14,20 H26 Q30,20 30,24 V100 Z')
  })

  it('una barra en cero no se dibuja y una muy baja achica el radio', () => {
    expect(barPath(10, 100, 20, 100)).toBe('')
    expect(barPath(0, 98, 20, 100, 4)).toContain('Q0,98 2,98')
  })
})

describe('linePath y nearestIndex', () => {
  it('une los puntos en orden', () => {
    expect(linePath([[0, 10], [5.04, 20]])).toBe('M0,10 L5,20')
  })

  it('elige la posición más cercana', () => {
    expect(nearestIndex([0, 10, 20, 30], 14)).toBe(1)
    expect(nearestIndex([0, 10, 20, 30], 26)).toBe(3)
  })
})

describe('textos y cálculos', () => {
  it('ideal del burndown: baja en línea recta hasta cero', () => {
    expect(idealRemaining(8, 0, 14)).toBe(8)
    expect(idealRemaining(8, 7, 14)).toBe(4)
    expect(idealRemaining(8, 20, 14)).toBe(0)
  })

  it('diferencias con signo y coma decimal', () => {
    expect(formatDelta(3)).toBe('+3')
    expect(formatDelta(-0.6)).toBe('−0,6')
    expect(formatDelta(0)).toBe('±0')
  })

  it('promedio y porcentaje', () => {
    expect(average([5, 7, 9])).toBe(7)
    expect(average([])).toBe(0)
    expect(percent(3, 12)).toBe(25)
    expect(percent(1, 0)).toBe(0)
  })
})
