import { stateName, t } from '@/i18n'

/**
 * Lo que la pantalla de importación sabe de cada origen y de cada paso, sin React: cómo se conecta cada herramienta,
 * los nombres que se le muestran a la persona y cómo se arma lo que se le manda al backend.
 */

/**
 * Los orígenes, en el orden en que se ofrecen. `api`: los campos para conectar (sin él, solo por archivo). `file`: lo
 * que se sube y cómo se le pide a la persona.
 */
export function sources() {
  return [
    {
      key: 'JIRA',
      mark: 'J',
      name: 'Jira',
      tint: 'bg-[#B6D4FF] text-[#12233D]',
      how: t('Cloud por conexión directa. Server o Data Center, con su exportación CSV.'),
      brings: t('proyectos · épicas · sprints · comentarios · adjuntos'),
      api: {
        title: t('Conectar con Jira Cloud'),
        note: t('Trae todo: comentarios, adjuntos, sprints y enlaces entre incidencias.'),
        fields: [
          { name: 'baseUrl', label: t('Dirección de tu Jira'), placeholder: 'https://miempresa.atlassian.net', type: 'url' },
          { name: 'email', label: t('Correo de tu cuenta de Jira'), placeholder: 'persona@correo.com', type: 'email' },
          { name: 'token', label: t('Token de API'), type: 'password', hint: t('en Jira: cuenta → seguridad → tokens de API') },
        ],
      },
      file: {
        accept: '.csv,text/csv',
        title: t('Subir un archivo CSV'),
        note: t('Para Jira Server o Data Center. Trae las incidencias; los adjuntos no vienen en el archivo.'),
      },
    },
    {
      key: 'TRELLO',
      mark: 'T',
      name: 'Trello',
      tint: 'bg-[#7FE0C4] text-[#0B2A22]',
      how: t('Tus tableros por conexión, o el archivo JSON que exporta cada tablero.'),
      brings: t('tableros · listas · tarjetas · checklists · adjuntos'),
      api: {
        title: t('Conectar con Trello'),
        note: t('Trae tus tableros completos, con todos los comentarios y los adjuntos.'),
        fields: [
          { name: 'email', label: t('Clave de API'), type: 'text', hint: t('en trello.com/power-ups/admin, en tu Power-Up: «Clave de API»') },
          { name: 'token', label: t('Token'), type: 'password', hint: t('en esa misma página, el enlace «Token»') },
        ],
      },
      file: {
        accept: '.json,application/json',
        title: t('Subir el JSON de un tablero'),
        note: t('En el tablero: menú → Imprimir, exportar y compartir → Exportar como JSON. Trae hasta los últimos 1000 comentarios; los adjuntos no.'),
      },
    },
    {
      key: 'LINEAR',
      mark: 'L',
      name: 'Linear',
      tint: 'bg-[#B6A6FF] text-[#23201B]',
      how: t('Por conexión con una clave de API, o con su exportación CSV.'),
      brings: t('equipos · proyectos · ciclos · issues · comentarios'),
      api: {
        title: t('Conectar con Linear'),
        note: t('Trae tus equipos con sus issues, ciclos, proyectos y comentarios.'),
        fields: [{ name: 'token', label: t('Clave de API personal'), type: 'password', hint: t('en Linear: ajustes → seguridad y acceso → claves de API personales') }],
      },
      file: { accept: '.csv,text/csv', title: t('Subir un archivo CSV'), note: t('La exportación de Linear (ajustes → importar/exportar). No trae comentarios ni adjuntos.') },
    },
    {
      key: 'ASANA',
      mark: 'A',
      name: 'Asana',
      tint: 'bg-[#FFB8D2] text-[#23201B]',
      how: t('Por conexión con un token personal, o con su exportación CSV.'),
      brings: t('proyectos · secciones · tareas · subtareas · comentarios'),
      api: {
        title: t('Conectar con Asana'),
        note: t('Trae tus proyectos con sus secciones, tareas, subtareas, comentarios y adjuntos.'),
        fields: [{ name: 'token', label: t('Token de acceso personal'), type: 'password', hint: t('en Asana: ajustes → aplicaciones → consola de desarrollador') }],
      },
      file: { accept: '.csv,text/csv', title: t('Subir un archivo CSV'), note: t('En el proyecto: menú → Exportar → CSV. No trae comentarios ni adjuntos.') },
    },
    {
      key: 'CSV',
      mark: 'CSV',
      name: t('Archivo CSV'),
      tint: 'bg-muted text-foreground',
      how: t('ClickUp, Monday, una hoja de cálculo o cualquier otra: tú dices qué columna es qué.'),
      brings: t('tareas con las columnas que elijas'),
      file: { accept: '.csv,text/csv,.txt', title: t('Subir un archivo CSV'), note: t('Una fila de encabezados y una tarea por fila.') },
    },
  ]
}

/** @param {string} key */
export const sourceOf = (key) => sources().find((source) => source.key === key) ?? sources().at(-1)

/** Cómo se nombra un origen en una frase: «Jira», «un archivo CSV». */
export const sourceName = (key) => (key === 'CSV' ? t('un archivo CSV') : sourceOf(key).name)

/** Los campos a los que puede ir una columna de un archivo CSV, en el orden en que se ofrecen. */
export function csvFields() {
  return [
    ['IGNORE', t('No importar')],
    ['TITLE', t('Título')],
    ['DESCRIPTION', t('Descripción')],
    ['STATUS', t('Estado')],
    ['STATUS_CATEGORY', t('Categoría del estado')],
    ['TYPE', t('Tipo')],
    ['PRIORITY', t('Prioridad')],
    ['ASSIGNEE', t('Asignados')],
    ['CREATOR', t('Quién la creó')],
    ['LABELS', t('Etiquetas')],
    ['START_DATE', t('Fecha de inicio')],
    ['DUE_DATE', t('Fecha límite')],
    ['CREATED_AT', t('Fecha de creación')],
    ['COMPLETED_AT', t('Fecha de cierre')],
    ['KEY', t('Código de la tarea')],
    ['PARENT', t('Tarea padre')],
    ['SPRINT', t('Ciclo o sprint')],
    ['MODULE', t('Módulo o épica')],
    ['COMMENT', t('Comentario')],
    ['POINTS', t('Story points (quedan anotados)')],
    ['URL', t('Enlace a la tarea')],
    ['PROJECT_KEY', t('Clave del proyecto')],
    ['PROJECT_NAME', t('Nombre del proyecto')],
  ].map(([value, label]) => ({ value, label }))
}

/** En qué se convierte un tipo del origen. */
export function typeTargets() {
  return [
    ['MODULE', t('Módulo')],
    ['STORY', t('Historia')],
    ['TASK', t('Tarea')],
    ['BUG', t('Bug')],
    ['SKIP', t('No importar')],
  ].map(([value, label]) => ({ value, label }))
}

export function priorityTargets() {
  return [
    ['URGENT', t('Urgente')],
    ['HIGH', t('Alta')],
    ['MEDIUM', t('Media')],
    ['LOW', t('Baja')],
    ['NONE', t('Sin prioridad')],
  ].map(([value, label]) => ({ value, label }))
}

export function stateGroups() {
  return [
    ['BACKLOG', t('pendiente')],
    ['UNSTARTED', t('sin empezar')],
    ['STARTED', t('en curso')],
    ['COMPLETED', t('completado')],
    ['CANCELLED', t('cancelado')],
  ].map(([value, label]) => ({ value, label }))
}

/** La categoría que el origen le da a un estado. */
export const categoryLabel = (category) =>
  ({ BACKLOG: t('pendiente'), TODO: t('por hacer'), IN_PROGRESS: t('en curso'), DONE: t('listo'), CANCELLED: t('cancelado') })[category] ?? ''

/** El nombre de un estado como se ve en la app (los de fábrica se muestran traducidos). */
export const shownStateName = (name) => stateName({ name })

/** Clave de un estado elegido en un selector: nombre y grupo. */
export const stateKey = (state) => `${state.group}|${state.name}`

export function statusLabel(status) {
  return (
    {
      DRAFT: t('sin terminar'),
      FETCHING: t('leyendo el origen'),
      READY: t('sin terminar'),
      RUNNING: t('importando'),
      COMPLETED: t('completada'),
      FAILED: t('no terminó'),
      STOPPED: t('detenida'),
      UNDOING: t('deshaciendo'),
      UNDONE: t('deshecha'),
    }[status] ?? status
  )
}

export function stageLabel(key) {
  return (
    {
      FETCH: t('Leyendo el origen'),
      PROJECTS: t('Proyectos, estados y etiquetas'),
      ISSUES: t('Historias, tareas y bugs'),
      COMMENTS: t('Comentarios'),
      ATTACHMENTS: t('Adjuntos'),
      RELATIONS: t('Dependencias entre tareas'),
    }[key] ?? key
  )
}

/** Por qué algo no entró: título y explicación. */
export function skipReason(reason) {
  return (
    {
      ATTACHMENT_TOO_BIG: [t('Adjuntos que pasan del límite por archivo'), t('El límite es de 10 MB por archivo (5 MB por imagen). Siguen en el origen.')],
      ATTACHMENT_TYPE: [t('Adjuntos de un tipo que TaskFlow no acepta'), t('Siguen en el origen; el informe trae la tarea de cada uno.')],
      ATTACHMENT_QUOTA: [t('Adjuntos que no cupieron'), t('Se acabó el espacio del workspace para archivos.')],
      ATTACHMENT_FAILED: [t('Adjuntos que no se pudieron traer'), t('El origen no los entregó, o ya no había conexión con él.')],
      LINK_OUTSIDE: [t('Relaciones con tareas que no se importaron'), t('La otra tarea no entró, así que la relación no tiene a dónde apuntar.')],
      INVITATION_FAILED: [t('Invitaciones que no se enviaron'), t('Puedes enviarlas desde Invitaciones.')],
      ISSUE_FAILED: [t('Tareas que no se pudieron crear'), ''],
    }[reason] ?? [reason, '']
  )
}

/** Opciones con las que arranca una importación. */
export const DEFAULT_OPTIONS = { keepNumbers: true, completed: true, comments: true, attachments: true, closedSprints: true, archived: false }

/**
 * Lo elegido al principio: todos los proyectos del origen, cada uno como proyecto nuevo con el identificador propuesto.
 * @returns {Record<string, { include: boolean, target: string, name: string, identifier: string }>} por id del proyecto
 */
export function initialChoices(job) {
  const saved = new Map((job.selection?.projects ?? []).map((choice) => [choice.externalId, choice]))
  return Object.fromEntries(
    (job.discovery?.projects ?? []).map((project) => {
      const choice = saved.get(project.id)
      return [
        project.id,
        {
          include: saved.size === 0 || Boolean(choice),
          target: choice?.targetProjectId ?? 'new',
          name: choice?.name ?? project.name ?? '',
          identifier: choice?.identifier ?? project.suggestedIdentifier ?? '',
        },
      ]
    }),
  )
}

/** Lo elegido en pantalla → lo que se manda al backend. */
export function toSelection(job, choices, options, columns) {
  const projects = (job.discovery?.projects ?? [])
    .filter((project) => choices[project.id]?.include)
    .map((project) => {
      const choice = choices[project.id]
      const existing = choice.target !== 'new'
      return {
        externalId: project.id,
        targetProjectId: existing ? choice.target : null,
        name: existing ? null : choice.name.trim() || null,
        identifier: existing ? null : choice.identifier.trim().toUpperCase() || null,
      }
    })
  return { projects, options, csv: columns ? { columns } : null }
}

/** Las equivalencias como las propone el backend (filas) → como se guardan (por nombre del origen). */
export function toMapping(proposal) {
  const byKey = (rows, key = 'source') => Object.fromEntries((rows ?? []).map((row) => [row[key], row.target]))
  return {
    types: byKey(proposal?.types),
    states: byKey(proposal?.states),
    priorities: byKey(proposal?.priorities),
    people: byKey(proposal?.people, 'id'),
  }
}

/** Lee un archivo como Base64 (así llega tal cual al backend, sea cual sea su codificación). */
export function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error ?? new Error('read'))
    reader.readAsDataURL(file)
  })
}

/** Tamaño máximo del archivo que se sube (el mismo del backend). */
export const MAX_UPLOAD_BYTES = 14 * 1024 * 1024
