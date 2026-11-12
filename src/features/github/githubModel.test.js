import { describe, expect, it } from 'vitest'
import {
  branchFormats,
  branchUrl,
  hasPull,
  newPullUrl,
  checkState,
  devCount,
  devIndicator,
  duration,
  githubEvent,
  githubStateChange,
  pullChecks,
  pullNote,
  pullState,
  repoName,
  runDuration,
  runState,
  runTrigger,
  shortSha,
  validBranchName,
} from './githubModel'

describe('pull requests', () => {
  it('cada estado tiene su palabra, su color y su icono', () => {
    expect(pullState('OPEN')).toEqual({ label: 'abierto', tone: 'ok', icon: 'pr' })
    expect(pullState('DRAFT')).toEqual({ label: 'borrador', tone: 'wait', icon: 'pr' })
    expect(pullState('MERGED')).toEqual({ label: 'fusionado', tone: 'merged', icon: 'merge' })
    expect(pullState('CLOSED')).toEqual({ label: 'cerrado', tone: 'wait', icon: 'closed' })
  })

  it('resume los checks con su cuenta', () => {
    expect(pullChecks({ checksState: 'FAILURE', checksTotal: 3, checksFailed: 1 })).toEqual({
      tone: 'fail',
      mark: '×',
      text: '1 de 3 falló',
    })
    expect(pullChecks({ checksState: 'FAILURE', checksTotal: 4, checksFailed: 2 }).text).toBe(
      '2 de 4 fallaron',
    )
    expect(pullChecks({ checksState: 'SUCCESS', checksTotal: 4, checksFailed: 0 })).toEqual({
      tone: 'ok',
      mark: '✓',
      text: '4 de 4 pasaron',
    })
    expect(pullChecks({ checksState: 'SUCCESS', checksTotal: 1, checksFailed: 0 }).text).toBe('1 de 1 pasó')
    expect(pullChecks({ checksState: 'PENDING', checksTotal: 0, checksFailed: 0 })).toEqual({
      tone: 'run',
      mark: '·',
      text: 'en curso',
    })
    expect(pullChecks({ checksState: null, checksTotal: 0, checksFailed: 0 })).toBeNull()
  })

  it('la nota dice a quién se le pidió revisión o que ya se fusionó', () => {
    expect(pullNote({ state: 'OPEN', reviewers: 'ana, luis' })).toBe('revisión pedida a ana, luis')
    expect(pullNote({ state: 'OPEN', reviewers: null })).toBe('sin revisores')
    expect(pullNote({ state: 'DRAFT', reviewers: null })).toBe('en borrador')
    expect(pullNote({ state: 'MERGED', issueStateGroup: 'COMPLETED' })).toBe('fusionado · tarea completada')
    expect(pullNote({ state: 'MERGED', issueStateGroup: 'STARTED' })).toBe('fusionado')
  })
})

describe('ejecuciones de Actions', () => {
  it('distingue cómo va y qué se puede hacer con ella', () => {
    expect(runState({ status: 'completed', conclusion: 'success', runId: 1 })).toMatchObject({
      label: 'correcto',
      tone: 'ok',
      mark: '✓',
      canRetry: false,
    })
    expect(runState({ status: 'completed', conclusion: 'failure', runId: 1 })).toMatchObject({
      label: 'falló',
      tone: 'fail',
      mark: '×',
      canRetry: true,
    })
    expect(runState({ status: 'completed', conclusion: 'timed_out', runId: 1 })).toMatchObject({
      label: 'falló',
      canRetry: true,
    })
    expect(runState({ status: 'completed', conclusion: 'cancelled', runId: 1 })).toMatchObject({
      label: 'cancelada',
      tone: 'wait',
      canRetry: true,
    })
    expect(runState({ status: 'completed', conclusion: 'skipped', runId: 1 })).toMatchObject({
      label: 'omitida',
      canRetry: false,
    })
    expect(runState({ status: 'in_progress', conclusion: null, runId: 1 })).toMatchObject({
      label: 'en curso',
      tone: 'run',
      canCancel: true,
    })
    expect(runState({ status: 'queued', conclusion: null, runId: 1 })).toMatchObject({
      label: 'en cola',
      outline: true,
      canCancel: true,
    })
  })

  it('la que pidió TaskFlow y GitHub aún no anunció no se puede cancelar ni repetir', () => {
    expect(runState({ status: 'requested', conclusion: null, runId: null })).toMatchObject({
      label: 'pedida',
      outline: true,
      canCancel: false,
      canRetry: false,
    })
  })

  it('dice qué la lanzó', () => {
    const rules = [
      { id: 'r1', firesOn: 'PR_MERGED' },
      { id: 'r2', firesOn: 'ISSUE_COMPLETED' },
    ]
    expect(runTrigger({ ruleId: 'r1' }, rules)).toEqual({
      text: 'regla: al fusionar el PR de una tarea',
      fromTaskflow: true,
    })
    expect(runTrigger({ ruleId: 'r2' }, rules).text).toBe('regla: al completar una tarea')
    // La regla ya se quitó: sigue diciendo que fue una regla
    expect(runTrigger({ ruleId: 'r9' }, rules)).toEqual({ text: 'regla del proyecto', fromTaskflow: true })
    expect(runTrigger({ triggeredByName: 'Ana', event: 'workflow_dispatch' })).toEqual({
      text: 'a mano · Ana, desde TaskFlow',
      fromTaskflow: true,
    })
    expect(runTrigger({ event: 'pull_request', prNumber: 128 })).toEqual({
      text: 'pull request #128',
      fromTaskflow: false,
    })
    expect(runTrigger({ event: 'workflow_dispatch', actorLogin: 'luis' }).text).toBe('a mano · luis')
    expect(runTrigger({ event: 'push' })).toEqual({ text: 'push', fromTaskflow: false })
    expect(runTrigger({ event: 'schedule' }).text).toBe('programada')
  })

  it('la duración solo se da al terminar', () => {
    const run = { status: 'completed', startedAt: '2026-11-10T10:00:00Z', changedAt: '2026-11-10T10:03:12Z' }
    expect(runDuration(run)).toBe('3 min 12 s')
    expect(runDuration({ ...run, changedAt: '2026-11-10T10:00:58Z' })).toBe('58 s')
    expect(runDuration({ ...run, changedAt: '2026-11-10T10:05:02Z' })).toBe('5 min 02 s')
    expect(runDuration({ ...run, status: 'in_progress' })).toBe('—')
    expect(runDuration({ status: 'completed', startedAt: null, changedAt: null })).toBe('—')
    expect(duration(null, '2026-11-10T10:00:00Z')).toBeNull()
  })

  it('cada check dice si pasó, falló o sigue', () => {
    expect(checkState({ status: 'completed', conclusion: 'success' })).toEqual({
      label: 'pasó',
      tone: 'ok',
      mark: '✓',
    })
    expect(checkState({ status: 'completed', conclusion: 'failure' })).toEqual({
      label: 'falló',
      tone: 'fail',
      mark: '×',
    })
    expect(checkState({ status: 'in_progress', conclusion: null })).toEqual({
      label: 'en curso',
      tone: 'run',
      mark: '·',
    })
    expect(checkState({ status: 'completed', conclusion: 'skipped' })).toEqual({
      label: 'omitido',
      tone: 'wait',
      mark: '–',
    })
  })
})

describe('indicador de la tarea', () => {
  const summary = (extra) => ({
    issueId: 'i1',
    branch: 'web-22-token',
    branches: 1,
    prNumber: null,
    prState: null,
    checksState: null,
    prUrl: null,
    running: false,
    ...extra,
  })

  it('sin rama ni pull request no hay indicador', () => {
    expect(devIndicator(undefined)).toBeNull()
    expect(devIndicator(summary({ branch: null, branches: 0 }))).toBeNull()
  })

  it('con rama y sin pull request dice «rama»', () => {
    expect(devIndicator(summary())).toEqual({
      icon: 'branch',
      tone: 'wait',
      text: 'rama',
      title: 'web-22-token · sin pull request',
    })
  })

  it('con pull request abierto manda cómo van los checks', () => {
    expect(devIndicator(summary({ prNumber: 128, prState: 'OPEN', checksState: 'FAILURE' }))).toMatchObject({
      icon: 'pr',
      tone: 'fail',
      text: '#128 · falló',
    })
    expect(devIndicator(summary({ prNumber: 128, prState: 'OPEN', checksState: 'PENDING' }))).toMatchObject({
      tone: 'run',
      text: '#128 · en curso',
    })
    expect(devIndicator(summary({ prNumber: 128, prState: 'OPEN', checksState: 'SUCCESS' }))).toMatchObject({
      tone: 'ok',
      text: '#128 · pasó',
    })
    expect(devIndicator(summary({ prNumber: 128, prState: 'OPEN' }))).toMatchObject({
      tone: 'ok',
      text: '#128',
    })
    expect(devIndicator(summary({ prNumber: 127, prState: 'DRAFT' }))).toMatchObject({
      tone: 'wait',
      text: '#127 · borrador',
    })
    // Un borrador con los checks rotos: importa más que fallaron
    expect(devIndicator(summary({ prNumber: 127, prState: 'DRAFT', checksState: 'FAILURE' }))).toMatchObject({
      tone: 'fail',
      text: '#127 · falló',
    })
  })

  it('fusionado dice si hay un workflow corriendo', () => {
    expect(devIndicator(summary({ prNumber: 126, prState: 'MERGED' }))).toMatchObject({
      icon: 'merge',
      tone: 'merged',
      text: '#126 · fusionado',
    })
    expect(devIndicator(summary({ prNumber: 126, prState: 'MERGED', running: true }))).toMatchObject({
      icon: 'merge',
      tone: 'merged',
      text: '#126 · desplegando',
    })
    expect(devIndicator(summary({ prNumber: 125, prState: 'CLOSED' }))).toMatchObject({
      tone: 'wait',
      text: '#125 · cerrado',
    })
  })

  it('cuenta ramas y pull requests', () => {
    expect(devCount({ branches: [1], pullRequests: [1] })).toBe('1 rama · 1 PR')
    expect(devCount({ branches: [1, 2], pullRequests: [] })).toBe('2 ramas')
    expect(devCount({ branches: [], pullRequests: [1, 2] })).toBe('2 PR')
  })
})

describe('actividad', () => {
  it('cuenta lo que pasó en GitHub con quién lo hizo', () => {
    expect(githubEvent('BRANCH|web-22-token')).toEqual({ who: null, text: 'enlazó la rama web-22-token' })
    expect(githubEvent('PR_OPENED|128|luis|Rota el token')).toEqual({
      who: 'luis',
      text: 'abrió el pull request #128',
    })
    expect(githubEvent('PR_MERGED|128|luis|Rota el token')).toEqual({
      who: 'luis',
      text: 'fusionó el pull request #128',
    })
    expect(githubEvent('PR_CLOSED|128||Sin autor')).toEqual({
      who: null,
      text: 'cerró el pull request #128 sin fusionar',
    })
    expect(githubEvent('CHECKS_FAILED|128|CI / test')).toEqual({
      who: null,
      text: 'el check CI / test falló en el PR #128',
    })
    expect(githubEvent('CHECKS_FAILED|128|')).toEqual({
      who: null,
      text: 'los checks fallaron en el PR #128',
    })
  })

  it('un título con barras no rompe la frase y algo desconocido no rompe nada', () => {
    expect(githubEvent('PR_OPENED|7|ana|a | b | c')).toEqual({ who: 'ana', text: 'abrió el pull request #7' })
    expect(githubEvent('ALGO_NUEVO|x').text).toBe('actualizó la tarea desde GitHub')
    expect(githubEvent(null).text).toBe('actualizó la tarea desde GitHub')
  })

  it('el cambio de estado automático dice de dónde a dónde', () => {
    expect(githubStateChange('Todo', 'In Progress')).toBe(
      'pasó la tarea de «Sin empezar» a «En curso», automático',
    )
  })
})

describe('utilidades', () => {
  it('nombres y enlaces de repositorio', () => {
    expect(repoName('acme/sitio-web')).toBe('sitio-web')
    expect(repoName(null)).toBe('')
    expect(branchUrl('acme/sitio-web', 'feature/web-22 x')).toBe(
      'https://github.com/acme/sitio-web/tree/feature/web-22%20x',
    )
    expect(newPullUrl('acme/sitio-web', 'feature/web-22 x', 'WEB-22 Rotación & token')).toBe(
      'https://github.com/acme/sitio-web/compare/feature/web-22%20x?expand=1&title=WEB-22%20Rotaci%C3%B3n%20%26%20token',
    )
    expect(shortSha('a41c9e2f00112233')).toBe('a41c9e2')
    expect(shortSha(null)).toBe('')
  })

  it('una rama tiene PR si hay uno abierto, en borrador o fusionado de esa rama en ese repositorio', () => {
    const branch = { repository: 'acme/web', name: 'web-22-x' }
    const pull = { repository: 'acme/web', headBranch: 'web-22-x', state: 'OPEN' }
    expect(hasPull([pull], branch)).toBe(true)
    expect(hasPull([{ ...pull, state: 'MERGED' }], branch)).toBe(true)
    expect(hasPull([{ ...pull, state: 'CLOSED' }], branch)).toBe(false)
    expect(hasPull([{ ...pull, repository: 'acme/api' }], branch)).toBe(false)
    expect(hasPull([], branch)).toBe(false)
  })

  it('los formatos de rama dan su ejemplo con el identificador del proyecto', () => {
    expect(branchFormats('PORT').map((format) => format.example)).toEqual([
      'port-22-rotacion-del-token',
      'feature/port-22-rotacion-del-token',
      'port-22',
    ])
    expect(branchFormats()[0].example).toBe('web-22-rotacion-del-token')
  })

  it('valida el nombre de una rama como el servidor', () => {
    for (const good of ['main', 'feature/web-22_x.1', 'web-22-rotacion'])
      expect(validBranchName(good), good).toBe(true)
    for (const bad of ['', 'con espacio', 'a..b', '/a', 'a/', '.a', 'a.', 'a//b', 'a.lock', '-a', 'a~b', 'ñ'])
      expect(validBranchName(bad), bad).toBe(false)
  })
})
