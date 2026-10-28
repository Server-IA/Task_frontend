import { describe, expect, it } from 'vitest'
import { startedCounts, stateLabel } from './weekSummary'

describe('«tu semana»', () => {
  it('cuenta cada estado del grupo «en curso» con su propio nombre', () => {
    const byState = [
      { name: 'Backlog', group: 'BACKLOG', count: 5, color: '#A3A3A3' },
      { name: 'En curso', group: 'STARTED', count: 2, color: '#F59E0B' },
      { name: 'En revisión', group: 'STARTED', count: 1, color: '#8B5CF6' },
      { name: 'QA', group: 'STARTED', count: 0, color: '#000' },
    ]
    expect(startedCounts(byState).map(({ count, label }) => `${count} ${label}`)).toEqual(['2 en curso', '1 en revisión'])
    expect(startedCounts(undefined)).toEqual([])
  })

  it('pone el nombre en minúsculas dentro de la frase, salvo las siglas', () => {
    expect(stateLabel('In Progress')).toBe('in progress')
    expect(stateLabel('QA')).toBe('QA')
    expect(stateLabel('')).toBe('sin estado')
  })
})
