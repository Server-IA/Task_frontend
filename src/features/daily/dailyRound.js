import { useCallback, useEffect, useState } from 'react'
import { t } from '@/i18n'
import { formatShortDate } from '@/lib/dates'
import { changeLabel } from './daily'

/**
 * La ronda de la reunión de un día: quién ya habló, qué puntos a tratar ya se vieron y el orden de las personas (si se
 * sorteó). Es de quien lleva la reunión, en este navegador: se recuerda por proyecto y fecha, y si el almacenamiento
 * no está disponible (ventana privada) funciona igual mientras la página siga abierta.
 * @typedef {{ spoke: string[], agendaDone: number[], order: string[] | null }} DailyRound
 */
const EMPTY = { spoke: [], agendaDone: [], order: null }
const storageKey = (projectId, date) => `taskflow:daily-round:${projectId}:${date}`

function load(projectId, date) {
  try {
    const raw = window.localStorage.getItem(storageKey(projectId, date))
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw)
    return {
      spoke: Array.isArray(parsed.spoke) ? parsed.spoke : [],
      agendaDone: Array.isArray(parsed.agendaDone) ? parsed.agendaDone : [],
      order: Array.isArray(parsed.order) ? parsed.order : null,
    }
  } catch {
    return EMPTY
  }
}

function store(projectId, date, round) {
  try {
    const empty = round.spoke.length === 0 && round.agendaDone.length === 0 && !round.order
    if (empty) window.localStorage.removeItem(storageKey(projectId, date))
    else window.localStorage.setItem(storageKey(projectId, date), JSON.stringify(round))
  } catch {
    // Sin almacenamiento: queda solo mientras la página siga abierta
  }
}

const toggled = (list, value) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value]

/**
 * Estado de la ronda de ese día, con sus acciones.
 * @returns {{ round: DailyRound, toggleSpoke: (userId: string) => void, markSpoke: (userId: string) => void,
 *            toggleAgenda: (index: number) => void, shuffle: (userIds: string[]) => void, resetOrder: () => void }}
 */
export function useDailyRound(projectId, date) {
  const [state, setState] = useState(() => ({ key: `${projectId}:${date}`, round: load(projectId, date) }))
  // Otro día u otro proyecto: su propia ronda
  let round = state.round
  if (state.key !== `${projectId}:${date}`) {
    round = load(projectId, date)
    setState({ key: `${projectId}:${date}`, round })
  }

  useEffect(() => {
    if (date) store(projectId, date, state.round)
  }, [projectId, date, state.round])

  const update = useCallback(
    (change) => setState((current) => ({ ...current, round: change(current.round) })),
    [],
  )
  const toggleSpoke = useCallback(
    (userId) => update((current) => ({ ...current, spoke: toggled(current.spoke, userId) })),
    [update],
  )
  const markSpoke = useCallback(
    (userId) =>
      update((current) =>
        current.spoke.includes(userId) ? current : { ...current, spoke: [...current.spoke, userId] },
      ),
    [update],
  )
  const toggleAgenda = useCallback(
    (index) => update((current) => ({ ...current, agendaDone: toggled(current.agendaDone, index) })),
    [update],
  )
  const shuffle = useCallback(
    (userIds) => update((current) => ({ ...current, order: shuffled(userIds, current.order) })),
    [update],
  )
  const resetOrder = useCallback(() => update((current) => ({ ...current, order: null })), [update])

  return { round, toggleSpoke, markSpoke, toggleAgenda, shuffle, resetOrder }
}

/**
 * Las personas en el orden de la ronda: el sorteado (las que entraron después van al final) o el de siempre.
 * @template {{ user?: { id?: string } }} P
 * @param {P[]} people
 * @param {string[] | null} order
 * @returns {P[]}
 */
export function orderPeople(people, order) {
  if (!order?.length) return people
  const position = new Map(order.map((id, index) => [id, index]))
  return [...people].sort(
    (a, b) =>
      (position.get(a.user?.id) ?? Number.MAX_SAFE_INTEGER) -
      (position.get(b.user?.id) ?? Number.MAX_SAFE_INTEGER),
  )
}

/** Un orden al azar distinto del anterior (con dos o más personas). */
export function shuffled(ids, previous = null, random = Math.random) {
  if (ids.length < 2) return [...ids]
  for (let attempt = 0; attempt < 5; attempt++) {
    const next = [...ids]
    for (let index = next.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1))
      ;[next[index], next[other]] = [next[other], next[index]]
    }
    if (!previous || next.join() !== previous.join()) return next
  }
  return [...ids.slice(1), ids[0]]
}

const issueLine = (issue) => `${issue?.code ?? ''} ${issue?.title ?? ''}`.trim()

/**
 * La daily en texto, para pegarla en el chat del equipo: por persona lo de ayer, lo de hoy y sus bloqueos, más los
 * puntos a tratar y la nota del día.
 * @param {{ projectName: string, daily: import('@/api/types').DailyResponse, people: import('@/api/types').DailyPerson[],
 *           agenda?: string[], note?: string | null }} input
 */
export function dailySummaryText({ projectName, daily, people, agenda = [], note }) {
  const lines = [t('Daily · {project} · {date}', { project: projectName, date: formatShortDate(daily.date) })]
  if (agenda.length) {
    lines.push('', t('Puntos a tratar'))
    agenda.forEach((item, index) => lines.push(`${index + 1}. ${item}`))
  }
  for (const person of people) {
    lines.push('', person.user?.fullName ?? t('Sin nombre'))
    const yesterday = person.yesterday ?? []
    const today = person.today ?? []
    const blockers = person.blockers ?? []
    lines.push(`  ${t('Ayer')}:${yesterday.length ? '' : ` ${t('sin cambios')}`}`)
    for (const entry of yesterday) {
      const detail =
        entry.fromState && entry.toState ? `${entry.fromState} → ${entry.toState}` : changeLabel(entry.change)
      lines.push(`  - ${issueLine(entry.issue)} (${detail})`)
    }
    lines.push(`  ${t('Hoy')}:${today.length ? '' : ` ${t('nada asignado')}`}`)
    for (const issue of today) lines.push(`  - ${issueLine(issue)}`)
    if (blockers.length) {
      lines.push(`  ${t('Bloqueos')}:`)
      for (const blocker of blockers) {
        const by = (blocker.blockedBy ?? []).map((issue) => issue.code).join(', ')
        lines.push(
          `  - ${issueLine(blocker.issue)}${by ? ` (${t('bloqueada por {codes}', { codes: by })})` : ''}`,
        )
      }
    }
  }
  if (note?.trim()) lines.push('', t('Notas'), note.trim())
  return lines.join('\n')
}
