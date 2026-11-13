import { stateName, t, tn } from '@/i18n'

/**
 * Cómo se lee lo que viene de GitHub (funciones puras): el estado de un pull request, de sus checks y de una
 * ejecución de Actions, el indicador de las tarjetas, y las frases de la actividad.
 *
 * Cada estado lleva un tono (color) y además una palabra, una marca o un icono distinto: no se distingue solo por el
 * color.
 */

/** Clases de cada tono: fondo suave y texto. */
export const TONE = {
  ok: 'bg-ok-soft text-ok',
  fail: 'bg-late-soft text-late',
  run: 'bg-soon-soft text-soon',
  wait: 'bg-muted text-muted-foreground',
  merged: 'bg-merged-soft text-merged',
}

/** «acme/sitio-web» → «sitio-web». */
export const repoName = (fullName) => (fullName ?? '').split('/').pop()

const GITHUB = 'https://github.com'
export const repoUrl = (fullName) => `${GITHUB}/${fullName}`
export const branchUrl = (fullName, branch) =>
  `${GITHUB}/${fullName}/tree/${branch.split('/').map(encodeURIComponent).join('/')}`
export const shortSha = (sha) => (sha ?? '').slice(0, 7)

/**
 * La pantalla de GitHub para abrir un pull request desde esa rama (hacia la rama por defecto), con el título ya puesto:
 * el código de la tarea en el título lo enlaza solo.
 */
/** La foto de perfil de GitHub de un usuario (la sirve GitHub sin sesión; si no existe, se ven sus iniciales). */
export const githubAvatarUrl = (login, size = 64) =>
  `https://avatars.githubusercontent.com/${encodeURIComponent(login)}?s=${size}`

export const newPullUrl = (fullName, branch, title) =>
  `${GITHUB}/${fullName}/compare/${branch.split('/').map(encodeURIComponent).join('/')}?expand=1&title=${encodeURIComponent(title)}`

/** Si la rama ya tiene un pull request abierto, en borrador o fusionado (uno cerrado sin fusionar no cuenta). */
export const hasPull = (pulls, branch) =>
  pulls.some(
    (pull) =>
      pull.repository === branch.repository && pull.headBranch === branch.name && pull.state !== 'CLOSED',
  )

/**
 * @param {string} state OPEN, DRAFT, MERGED o CLOSED
 * @returns {{ label: string, tone: keyof typeof TONE, icon: 'pr' | 'merge' | 'closed' }}
 */
export function pullState(state) {
  switch (state) {
    case 'OPEN':
      return { label: t('abierto'), tone: 'ok', icon: 'pr' }
    case 'DRAFT':
      return { label: t('borrador'), tone: 'wait', icon: 'pr' }
    case 'MERGED':
      return { label: t('fusionado'), tone: 'merged', icon: 'merge' }
    default:
      return { label: t('cerrado'), tone: 'wait', icon: 'closed' }
  }
}

/**
 * Cómo van los checks de un pull request: «1 de 3 falló», «en curso» o «4 de 4 pasaron». `null` si no tiene.
 * @param {{ checksState: string | null, checksTotal: number, checksFailed: number }} pull
 * @returns {{ tone: keyof typeof TONE, mark: string, text: string } | null}
 */
export function pullChecks(pull) {
  const total = pull.checksTotal ?? 0
  switch (pull.checksState) {
    case 'FAILURE':
      return {
        tone: 'fail',
        mark: '×',
        text: tn(pull.checksFailed, '{count} de {total} falló', '{count} de {total} fallaron', { total }),
      }
    case 'PENDING':
      return { tone: 'run', mark: '·', text: t('en curso') }
    case 'SUCCESS':
      return {
        tone: 'ok',
        mark: '✓',
        text: tn(total, '{count} de {total} pasó', '{count} de {total} pasaron', { total }),
      }
    default:
      return null
  }
}

/** La nota de un pull request en la lista: a quién se le pidió revisión, o que ya se fusionó. */
export function pullNote(pull) {
  if (pull.state === 'MERGED')
    return pull.issueStateGroup === 'COMPLETED' ? t('fusionado · tarea completada') : t('fusionado')
  if (pull.reviewers) return t('revisión pedida a {names}', { names: pull.reviewers })
  return pull.state === 'DRAFT' ? t('en borrador') : t('sin revisores')
}

const RUN_FAILED = ['failure', 'timed_out', 'startup_failure', 'action_required']

/**
 * Cómo va una ejecución de Actions.
 * @param {{ status: string, conclusion: string | null, runId: number | null }} run
 * @returns {{ label: string, tone: keyof typeof TONE, mark: string, outline: boolean, canRetry: boolean,
 *             canCancel: boolean, result: 'ok' | 'fail' | 'run' | 'wait' }}
 */
export function runState(run) {
  const base = { outline: false, canRetry: false, canCancel: false }
  if (run.status === 'completed') {
    if (run.conclusion === 'success')
      return { ...base, label: t('correcto'), tone: 'ok', mark: '✓', result: 'ok' }
    if (RUN_FAILED.includes(run.conclusion)) {
      return {
        ...base,
        label: t('falló'),
        tone: 'fail',
        mark: '×',
        canRetry: run.runId != null,
        result: 'fail',
      }
    }
    if (run.conclusion === 'cancelled') {
      return {
        ...base,
        label: t('cancelada'),
        tone: 'wait',
        mark: '–',
        canRetry: run.runId != null,
        result: 'fail',
      }
    }
    return { ...base, label: t('omitida'), tone: 'wait', mark: '–', result: 'wait' }
  }
  if (run.status === 'in_progress') {
    return {
      ...base,
      label: t('en curso'),
      tone: 'run',
      mark: '·',
      canCancel: run.runId != null,
      result: 'run',
    }
  }
  // «requested» es la que pidió TaskFlow y GitHub todavía no anunció
  const label = run.status === 'requested' ? t('pedida') : t('en cola')
  return {
    ...base,
    label,
    tone: 'wait',
    mark: '',
    outline: true,
    canCancel: run.status !== 'requested' && run.runId != null,
    result: 'wait',
  }
}

/** A qué se refiere una regla: «al fusionar el PR de una tarea» o «al completar una tarea». */
export const ruleTrigger = (firesOn) =>
  firesOn === 'PR_MERGED' ? t('al fusionar el PR de una tarea') : t('al completar una tarea')
/** Lo mismo como condición, para armar la regla: «se fusiona el PR de una tarea». */
export const ruleWhen = (firesOn) =>
  firesOn === 'PR_MERGED' ? t('se fusiona el PR de una tarea') : t('una tarea pasa a completada')

/**
 * Qué lanzó una ejecución: una regla del proyecto, alguien desde TaskFlow, un push, un pull request…
 * @param {import('./api').Run} run
 * @param {import('./api').Rule[]} [rules]
 * @returns {{ text: string, fromTaskflow: boolean }}
 */
export function runTrigger(run, rules = []) {
  if (run.ruleId) {
    const rule = rules.find((candidate) => candidate.id === run.ruleId)
    return {
      text: rule ? t('regla: {trigger}', { trigger: ruleTrigger(rule.firesOn) }) : t('regla del proyecto'),
      fromTaskflow: true,
    }
  }
  if (run.triggeredByName)
    return { text: t('a mano · {name}, desde TaskFlow', { name: run.triggeredByName }), fromTaskflow: true }
  if (run.event === 'pull_request' || run.event === 'pull_request_target') {
    return {
      text: run.prNumber ? t('pull request #{number}', { number: run.prNumber }) : t('pull request'),
      fromTaskflow: false,
    }
  }
  if (run.event === 'workflow_dispatch')
    return {
      text: run.actorLogin ? t('a mano · {name}', { name: run.actorLogin }) : t('a mano'),
      fromTaskflow: false,
    }
  if (run.event === 'schedule') return { text: t('programada'), fromTaskflow: false }
  return { text: run.event ?? '', fromTaskflow: false }
}

/** «3 min 12 s», «58 s» o «—» si la ejecución no ha terminado. */
export function runDuration(run) {
  if (run.status !== 'completed' || !run.startedAt || !run.changedAt) return '—'
  return duration(run.startedAt, run.changedAt) ?? '—'
}

/** Cuánto pasó entre dos momentos, en minutos y segundos; `null` si falta alguno. */
export function duration(from, to) {
  if (!from || !to) return null
  const seconds = Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 1000))
  if (seconds < 60) return t('{seconds} s', { seconds })
  return t('{minutes} min {seconds} s', {
    minutes: Math.floor(seconds / 60),
    seconds: String(seconds % 60).padStart(2, '0'),
  })
}

/**
 * Cómo va un check de un pull request.
 * @param {import('./api').Check} check
 * @returns {{ label: string, tone: keyof typeof TONE, mark: string }}
 */
export function checkState(check) {
  if (check.status !== 'completed') return { label: t('en curso'), tone: 'run', mark: '·' }
  if (check.conclusion === 'success') return { label: t('pasó'), tone: 'ok', mark: '✓' }
  if (
    ['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure'].includes(check.conclusion)
  ) {
    return { label: t('falló'), tone: 'fail', mark: '×' }
  }
  return { label: t('omitido'), tone: 'wait', mark: '–' }
}

/**
 * El indicador de una tarea en el tablero y la lista: «rama», «#128 · falló», «#126 · fusionado»…
 * @param {import('./api').IssueSummary | undefined} summary
 * @returns {{ icon: 'branch' | 'pr' | 'merge', tone: keyof typeof TONE, text: string, title: string } | null}
 */
export function devIndicator(summary) {
  if (!summary) return null
  if (summary.prNumber == null) {
    if (!summary.branch) return null
    return {
      icon: 'branch',
      tone: 'wait',
      text: t('rama'),
      title: t('{branch} · sin pull request', { branch: summary.branch }),
    }
  }
  const number = `#${summary.prNumber}`
  if (summary.prState === 'MERGED') {
    return summary.running
      ? {
          icon: 'merge',
          tone: 'merged',
          text: t('{pr} · desplegando', { pr: number }),
          title: t('PR {pr} fusionado · hay un workflow en curso', { pr: number }),
        }
      : {
          icon: 'merge',
          tone: 'merged',
          text: t('{pr} · fusionado', { pr: number }),
          title: t('PR {pr} fusionado', { pr: number }),
        }
  }
  if (summary.prState === 'CLOSED') {
    return {
      icon: 'pr',
      tone: 'wait',
      text: t('{pr} · cerrado', { pr: number }),
      title: t('PR {pr} cerrado sin fusionar', { pr: number }),
    }
  }
  const state = summary.prState === 'DRAFT' ? t('en borrador') : t('abierto')
  if (summary.checksState === 'FAILURE') {
    return {
      icon: 'pr',
      tone: 'fail',
      text: t('{pr} · falló', { pr: number }),
      title: t('PR {pr} {state} · los checks fallaron', { pr: number, state }),
    }
  }
  if (summary.checksState === 'PENDING') {
    return {
      icon: 'pr',
      tone: 'run',
      text: t('{pr} · en curso', { pr: number }),
      title: t('PR {pr} {state} · checks en curso', { pr: number, state }),
    }
  }
  if (summary.prState === 'DRAFT') {
    return {
      icon: 'pr',
      tone: 'wait',
      text: t('{pr} · borrador', { pr: number }),
      title: t('PR {pr} en borrador', { pr: number }),
    }
  }
  return summary.checksState === 'SUCCESS'
    ? {
        icon: 'pr',
        tone: 'ok',
        text: t('{pr} · pasó', { pr: number }),
        title: t('PR {pr} abierto · los checks pasaron', { pr: number }),
      }
    : { icon: 'pr', tone: 'ok', text: number, title: t('PR {pr} abierto', { pr: number }) }
}

/** «1 rama · 1 PR», al lado del título «Desarrollo». */
export function devCount(dev) {
  const parts = [
    dev.branches.length > 0 && tn(dev.branches.length, '{count} rama', '{count} ramas'),
    dev.pullRequests.length > 0 && tn(dev.pullRequests.length, '{count} PR', '{count} PR'),
  ]
  return parts.filter(Boolean).join(' · ')
}

/** Las partes de un valor del historial («PR_OPENED|128|luis|Título con | barras»): el título va al final, entero. */
function parts(value, count) {
  const pieces = (value ?? '').split('|')
  return [...pieces.slice(0, count - 1), pieces.slice(count - 1).join('|')]
}

/**
 * Lo que pasó en GitHub con una tarea, como frase del historial (sin sujeto): «abrió el pull request #128».
 * @param {string | null} value lo que guarda el backend: `BRANCH|rama`, `PR_OPENED|número|autor|título`…
 * @returns {{ who: string | null, text: string }} `who`: quién lo hizo en GitHub, si se sabe
 */
export function githubEvent(value) {
  const kind = (value ?? '').split('|')[0]
  switch (kind) {
    case 'BRANCH':
      return { who: null, text: t('enlazó la rama {branch}', { branch: parts(value, 2)[1] }) }
    case 'PR_OPENED': {
      const [, number, author] = parts(value, 4)
      return { who: author || null, text: t('abrió el pull request #{number}', { number }) }
    }
    case 'PR_MERGED': {
      const [, number, author] = parts(value, 4)
      return { who: author || null, text: t('fusionó el pull request #{number}', { number }) }
    }
    case 'PR_CLOSED': {
      const [, number, author] = parts(value, 4)
      return { who: author || null, text: t('cerró el pull request #{number} sin fusionar', { number }) }
    }
    case 'CHECKS_FAILED': {
      const [, number, names] = parts(value, 3)
      return {
        who: null,
        text: names
          ? t('el check {names} falló en el PR #{number}', { names, number })
          : t('los checks fallaron en el PR #{number}', { number }),
      }
    }
    default:
      return { who: null, text: t('actualizó la tarea desde GitHub') }
  }
}

/** «pasó la tarea de «Por hacer» a «En curso», automático»: el cambio de estado que hizo una automatización. */
export const githubStateChange = (from, to) =>
  t('pasó la tarea de «{from}» a «{to}», automático', { from: stateName(from), to: stateName(to) })

/**
 * Los formatos del nombre de las ramas que crea TaskFlow, con un ejemplo hecho con el identificador del proyecto.
 * @param {string} [identifier]
 */
export function branchFormats(identifier = 'WEB') {
  const code = `${String(identifier).toLowerCase()}-22`
  return [
    { value: 'CODE_TITLE', label: t('código-título'), example: `${code}-rotacion-del-token` },
    {
      value: 'TYPE_CODE_TITLE',
      label: t('tipo/código-título'),
      example: `feature/${code}-rotacion-del-token`,
    },
    { value: 'CODE', label: t('solo el código'), example: code },
  ]
}

/** Si un nombre sirve como rama de git (lo mismo que comprueba el servidor). */
export function validBranchName(name) {
  return (
    Boolean(name) &&
    name.length <= 200 &&
    /^[A-Za-z0-9._/-]+$/.test(name) &&
    !name.includes('..') &&
    !name.includes('//') &&
    !name.endsWith('.lock') &&
    !/^[/.-]/.test(name) &&
    !/[/.]$/.test(name)
  )
}
