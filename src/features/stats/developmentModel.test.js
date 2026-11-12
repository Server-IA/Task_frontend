import { describe, expect, it } from 'vitest'
import { developmentFigures, formatDuration, mergeTime } from './developmentModel'

const base = {
  repositories: 1,
  weeks: 8,
  openPullRequests: 3,
  draftPullRequests: 1,
  mergedPullRequests: 6,
  averageHoursToMerge: 30.5,
  runsFinished: 8,
  runsSucceeded: 6,
  completedIssues: 10,
  completedWithMergedPullRequest: 4,
}

describe('estadísticas de desarrollo', () => {
  it('el tiempo a fusión va en horas hasta dos días y después en días', () => {
    expect(mergeTime(null)).toEqual({ value: '—' })
    expect(mergeTime(0.2)).toEqual({ value: '12', unit: 'min' })
    expect(mergeTime(5.25)).toEqual({ value: '5,3', unit: 'h' })
    expect(mergeTime(72)).toEqual({ value: '3', unit: 'días' })
    expect(mergeTime(24.5 * 2)).toEqual({ value: '2', unit: 'días' })
  })

  it('la duración de un workflow se lee fácil', () => {
    expect(formatDuration(null)).toBe('—')
    expect(formatDuration(45)).toBe('45 s')
    expect(formatDuration(120)).toBe('2 min')
    expect(formatDuration(200)).toBe('3 min 20 s')
    expect(formatDuration(3900)).toBe('1 h 05 min')
  })

  it('las cinco cifras llevan su número y lo que lo explica', () => {
    const figures = Object.fromEntries(developmentFigures(base).map((figure) => [figure.key, figure]))
    expect(figures.open).toMatchObject({ value: 3, detail: '1 en borrador' })
    expect(figures.merged).toMatchObject({ value: 6, detail: 'en las últimas 8 semanas' })
    expect(figures.time).toMatchObject({ value: '30,5', unit: 'h' })
    expect(figures.runs).toMatchObject({ value: 75, unit: '%', detail: '6 de 8 ejecuciones terminadas' })
    expect(figures.issues).toMatchObject({
      value: 40,
      unit: '%',
      detail: '4 de 10 completadas en el periodo',
    })
  })

  it('sin datos en el periodo muestra un guion y lo dice', () => {
    const figures = Object.fromEntries(
      developmentFigures({
        ...base,
        draftPullRequests: 0,
        averageHoursToMerge: null,
        runsFinished: 0,
        runsSucceeded: 0,
        completedIssues: 0,
      }).map((figure) => [figure.key, figure]),
    )
    expect(figures.open.detail).toBe('ninguno en borrador')
    expect(figures.time).toMatchObject({
      value: '—',
      muted: true,
      detail: 'ningún PR fusionado en el periodo',
    })
    expect(figures.runs).toMatchObject({
      value: '—',
      muted: true,
      detail: 'ninguna ejecución terminada en el periodo',
    })
    expect(figures.issues).toMatchObject({
      value: '—',
      muted: true,
      detail: 'ninguna tarea completada en el periodo',
    })
  })
})
