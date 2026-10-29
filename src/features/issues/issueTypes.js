/**
 * Tipos de tarea (historia, tarea y bug) y lo que se deriva de ellos: el filtro «tipo» del tablero y la lista, el
 * progreso y las marcas de una historia, las pestañas de «Historias», los grupos de la vista «Bugs» y los carriles del
 * tablero agrupado por historia. Funciones puras (sin React).
 */

/** @typedef {import('@/api/types').IssueResponse} IssueResponse */
/** @typedef {'STORY' | 'TASK' | 'BUG'} IssueType */

/** Los tres tipos, en el orden en que se ofrecen. `hint`: qué es (en el selector de tipo). */
export const ISSUE_TYPES = [
  { value: 'STORY', label: 'Historia', plural: 'historias', hint: 'El qué y el porqué. Sale del tablero y avanza sola con sus tareas.' },
  { value: 'TASK', label: 'Tarea', plural: 'tareas', hint: 'Trabajo concreto. Se mueve en el tablero.' },
  { value: 'BUG', label: 'Bug', plural: 'bugs', hint: 'Algo que no funciona. Agrega las secciones del reporte si la descripción está vacía.' },
]

export const TYPE_LABELS = Object.fromEntries(ISSUE_TYPES.map(({ value, label }) => [value, label]))
const TYPE_VALUES = ISSUE_TYPES.map((type) => type.value)

/** Lo que muestran el tablero y la lista sin elegir tipo: el trabajo (tareas y bugs); las historias van aparte. */
export const DEFAULT_TYPES = ['TASK', 'BUG']

/** Valor de `?type=` que pide todos los tipos (quitar el filtro de la pastilla). */
export const ALL_TYPES = 'all'

/** Tipo de una tarea (las respuestas viejas, sin tipo, son tareas). @returns {IssueType} */
export const typeOf = (issue) => issue?.type ?? 'TASK'

export const isStory = (issue) => typeOf(issue) === 'STORY'
export const isBug = (issue) => typeOf(issue) === 'BUG'

/** Grupo de estado cerrado (completado o cancelado). */
const isClosedGroup = (group) => group === 'COMPLETED' || group === 'CANCELLED'

/**
 * Tipos que se ven según los valores de `?type=` de la URL: sin valores, los de siempre (tarea y bug); `all`, los
 * tres. Valores desconocidos se ignoran.
 * @param {string[] | undefined} values
 * @returns {IssueType[]}
 */
export function effectiveTypes(values) {
  if (!values?.length) return DEFAULT_TYPES
  if (values.includes(ALL_TYPES)) return TYPE_VALUES
  const valid = TYPE_VALUES.filter((type) => values.includes(type))
  return valid.length ? valid : DEFAULT_TYPES
}

/** Si son los tres tipos (no hace falta filtrar). */
export const isAllTypes = (types) => TYPE_VALUES.every((type) => types.includes(type))

/** Si son los de siempre (tarea y bug, sin historia). */
export const isDefaultTypes = (types) => types.length === DEFAULT_TYPES.length && DEFAULT_TYPES.every((type) => types.includes(type))

/**
 * El parámetro `type` para la API: nada si son los tres (todos), o la lista.
 * @param {IssueType[]} types
 */
export const typeParam = (types) => (isAllTypes(types) ? undefined : types)

/**
 * Valores de `?type=` para guardar en la URL los tipos elegidos: nada si son los de siempre, `all` si son los tres.
 * @param {IssueType[]} types
 * @returns {string[]}
 */
export function typesToUrl(types) {
  if (!types.length || isDefaultTypes(types)) return []
  if (isAllTypes(types)) return [ALL_TYPES]
  return TYPE_VALUES.filter((type) => types.includes(type))
}

/** «Tarea, Bug» para la pastilla. */
export const typesLabel = (types) => TYPE_VALUES.filter((type) => types.includes(type)).map((type) => TYPE_LABELS[type]).join(', ')

/**
 * Progreso de una historia: «3 de 5 tareas» (solo las tareas, sin las canceladas; los bugs no cuentan) y las partes
 * de la barra (hecho en verde, en curso en naranja).
 * @param {IssueResponse} story
 * @returns {{ total: number, done: number, started: number, donePct: number, startedPct: number, label: string }}
 */
export function storyProgress(story) {
  const total = story?.storyTaskCount ?? 0
  const done = Math.min(story?.storyTaskDoneCount ?? 0, total)
  const started = Math.min(story?.storyTaskStartedCount ?? 0, total - done)
  const pct = (value) => (total > 0 ? Math.round((value / total) * 100) : 0)
  return {
    total,
    done,
    started,
    donePct: pct(done),
    startedPct: pct(started),
    label: total === 0 ? 'sin tareas' : `${done} de ${total} ${total === 1 ? 'tarea' : 'tareas'}`,
  }
}

/**
 * Marcas de una historia para las insignias: «sin partir» (abierta y sin tareas), «lista para revisar», bugs abiertos
 * y bugs después de cerrarla.
 * @param {IssueResponse} story
 */
export function storyFlags(story) {
  const closed = isClosedGroup(story?.state?.group)
  return {
    closed,
    unsplit: !closed && (story?.storyTaskCount ?? 0) === 0,
    ready: Boolean(story?.readyForReview) && !closed,
    // En una cerrada cuentan los bugs después de cerrar (no la reabren); los abiertos frenan a una abierta
    openBugs: closed ? 0 : (story?.openBugCount ?? 0),
    bugsAfterClose: closed ? (story?.bugsAfterCloseCount ?? 0) : 0,
  }
}

/** «1 bug abierto» / «2 bugs abiertos». */
export const openBugsLabel = (count) => `${count} ${count === 1 ? 'bug abierto' : 'bugs abiertos'}`

/** «1 bug después de cerrar» / «2 bugs después de cerrar». */
export const bugsAfterCloseLabel = (count) => `${count} ${count === 1 ? 'bug' : 'bugs'} después de cerrar`

/** Pestañas de «Historias». */
export const STORY_TABS = [
  { value: 'open', label: 'Abiertas' },
  { value: 'unsplit', label: 'Sin partir' },
  { value: 'review', label: 'Para revisar' },
  { value: 'closed', label: 'Cerradas' },
]

/**
 * Si una fila de «Historias» va en una pestaña. Abiertas = todas las no cerradas (incluye sin partir y para revisar).
 * @param {IssueResponse} story
 * @param {'open' | 'unsplit' | 'review' | 'closed'} tab
 */
export function inStoryTab(story, tab) {
  const flags = storyFlags(story)
  if (tab === 'closed') return flags.closed
  if (flags.closed) return false
  if (tab === 'unsplit') return flags.unsplit
  if (tab === 'review') return flags.ready
  return true
}

/** Cuántas historias hay en cada pestaña. @param {IssueResponse[]} stories */
export function storyTabCounts(stories) {
  return Object.fromEntries(STORY_TABS.map(({ value }) => [value, stories.filter((story) => inStoryTab(story, value)).length]))
}

/**
 * Por qué no se puede pasar la tarea a ese tipo (para el selector), o null si se puede.
 * Convertir en historia o dejar de serlo es del project manager; una historia con tareas no deja de serlo.
 * @param {IssueResponse} issue
 * @param {IssueType} target
 * @param {{ isManager: boolean, hasChildren: boolean }} context `hasChildren`: la historia tiene tareas o bugs
 */
export function typeChangeBlock(issue, target, { isManager, hasChildren }) {
  const current = typeOf(issue)
  if (target === current) return null
  if ((current === 'STORY' || target === 'STORY') && !isManager) return 'Solo el project manager convierte en historia o deja de serlo.'
  if (current === 'STORY' && hasChildren) return 'Una historia con tareas no puede cambiar de tipo hasta mover sus tareas.'
  if (target === 'STORY' && issue?.parent) return 'Una tarea de una historia no puede ser historia: quítale el padre antes.'
  return null
}

/**
 * Tipo que crea una plantilla. Las respuestas viejas no lo traen: se deduce del nombre de las plantillas por defecto.
 * @param {{ type?: IssueType, name?: string, titlePrefix?: string | null } | null} template
 * @returns {IssueType}
 */
export function templateType(template) {
  if (!template) return 'TASK'
  if (template.type) return template.type
  if (template.name === 'Historia de usuario') return 'STORY'
  if (template.name === 'Reporte de bug' || /^\[bug\]/i.test(template.titlePrefix ?? '')) return 'BUG'
  return 'TASK'
}

/** Primera plantilla que crea ese tipo (para «Nueva historia» y «Reportar bug»). */
export const firstTemplateOfType = (templates = [], type) => templates.find((template) => templateType(template) === type) ?? null

/** Prioridades de urgente a baja (el orden de los grupos de la vista «Bugs»). */
const PRIORITY_ORDER = ['URGENT', 'HIGH', 'MEDIUM', 'LOW']

/**
 * Bugs abiertos agrupados para la vista «Bugs»: por prioridad (urgente → baja) y al final «Por triar», los que no
 * tienen prioridad o no tienen a nadie asignado.
 * @param {IssueResponse[]} bugs
 * @returns {{ key: string, priority: string | null, triage: boolean, issues: IssueResponse[] }[]}
 */
export function bugGroups(bugs) {
  const open = bugs.filter((bug) => !isClosedGroup(bug.state?.group))
  const needsTriage = (bug) => !bug.priority || bug.priority === 'NONE' || !bug.assignees?.length
  const groups = PRIORITY_ORDER.map((priority) => ({
    key: priority,
    priority,
    triage: false,
    issues: open.filter((bug) => !needsTriage(bug) && bug.priority === priority),
  })).filter((group) => group.issues.length > 0)
  const triage = open.filter(needsTriage)
  if (triage.length) groups.push({ key: 'triage', priority: null, triage: true, issues: triage })
  return groups
}

/**
 * Carriles del tablero agrupado por historia: uno por historia de las tarjetas (tareas y bugs hijos de una historia)
 * y al final «Sin historia». Primero las historias en curso (de la más nueva a la más vieja), después las listas para
 * revisar y por último las cerradas (sus bugs posteriores). `stories` (de GET /stories) completa los datos del
 * encabezado; si una historia no está ahí, se usa el resumen del padre.
 * @param {IssueResponse[]} issues tarjetas del tablero
 * @param {{ story: IssueResponse, people?: object[] }[]} [stories]
 * @returns {{ key: string, story: IssueResponse | null, people: object[], issues: IssueResponse[] }[]}
 */
export function storyLanes(issues, stories = []) {
  const rows = new Map(stories.map((row) => [row.story.id, row]))
  const lanes = new Map()
  const loose = []
  for (const issue of issues) {
    const parent = issue.parent
    if (!parent || parent.type !== 'STORY') {
      loose.push(issue)
      continue
    }
    if (!lanes.has(parent.id)) {
      const row = rows.get(parent.id)
      lanes.set(parent.id, { key: parent.id, story: row?.story ?? { ...parent, sequenceId: sequenceOf(parent.code) }, people: row?.people ?? [], issues: [] })
    }
    lanes.get(parent.id).issues.push(issue)
  }
  const rank = (lane) => (storyFlags(lane.story).closed ? 2 : storyFlags(lane.story).ready ? 1 : 0)
  const ordered = [...lanes.values()].sort(
    (a, b) => rank(a) - rank(b) || (b.story.sequenceId ?? 0) - (a.story.sequenceId ?? 0),
  )
  return [...ordered, { key: 'none', story: null, people: [], issues: loose }]
}

/** «WEB-15» → 15. */
function sequenceOf(code = '') {
  return Number(code.split('-').pop()) || 0
}

/**
 * Personas de las tareas de una historia (sin repetir, por nombre), para los avatares de su fila o carril cuando
 * no vienen calculadas.
 * @param {IssueResponse[]} children
 */
export function peopleOf(children) {
  const byId = new Map()
  for (const child of children) for (const user of child.assignees ?? []) if (!byId.has(user.id)) byId.set(user.id, user)
  return [...byId.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'))
}
