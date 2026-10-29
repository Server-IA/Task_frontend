import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { toApiError } from '@/lib/errors'
import { issuesApi } from './api'

/** Reemplaza un issue en todas las listas en caché del proyecto (sin esperar a recargarlas). */
function replaceInLists(queryClient, projectId, issue) {
  queryClient.setQueriesData({ queryKey: queryKeys.issuesOf(projectId) }, (page) =>
    page?.content
      ? { ...page, content: page.content.map((item) => (item.id === issue.id ? issue : item)) }
      : page,
  )
}

/**
 * Cachés que muestran cada campo «liviano» de una tarea: los que no cambian conteos, avance ni el lugar de la tarea
 * (estado, tipo, padre…). Un campo que no está aquí recarga todo (`issueChangeFilters` sin campos).
 */
const FIELD_DEPENDENTS = {
  title: ['subIssues', 'stories', 'relations', 'taskRef', 'myWork', 'otherIssues', 'stats', 'daily'],
  priority: ['stories', 'myWork', 'stats'],
  assigneeIds: ['subIssues', 'stories', 'relations', 'myWork', 'stats', 'daily'],
  labelIds: ['stories', 'myWork'],
  dueDate: ['stories', 'myWork', 'project', 'stats', 'daily'],
  clearDueDate: ['stories', 'myWork', 'project', 'stats', 'daily'],
  startDate: ['stories', 'myWork'],
  clearStartDate: ['stories', 'myWork'],
}

const ALL_DEPENDENTS = [
  'subIssues',
  'stories',
  'relations',
  'planning',
  'project',
  'otherIssues',
  'stats',
  'myWork',
  'taskRef',
  'daily',
]

/**
 * Filtros de `invalidateQueries` para lo que cambia cuando cambia una tarea. Siempre: las listas del proyecto (los
 * filtros y el orden pueden sacarla o moverla), los conteos de las vistas guardadas, su historial y la actividad del
 * workspace. Con `fields` (las claves del PATCH) solo se suma lo que muestra esos campos; sin ellos (crear, mover,
 * borrar, historias), todo: avance de ciclos/módulos e historias, conteos del proyecto y de las tareas padre…
 * La tarea editada no se vuelve a pedir si solo cambiaron campos livianos: su caché ya tiene la respuesta.
 * @param {string} projectId
 * @param {string | undefined} issueId
 * @param {string[] | null} [fields]
 */
export function issueChangeFilters(projectId, issueId, fields = null) {
  const dependents = new Set()
  const light = fields?.length > 0 && fields.every((field) => field in FIELD_DEPENDENTS)
  for (const group of light ? fields.flatMap((field) => FIELD_DEPENDENTS[field]) : ALL_DEPENDENTS) dependents.add(group)

  const filters = [
    { queryKey: queryKeys.issuesOf(projectId) },
    { queryKey: queryKeys.savedViews(projectId) },
    { queryKey: ['workspaceActivity'] },
  ]
  if (issueId) filters.push({ queryKey: queryKeys.activity(issueId) })
  const byGroup = {
    subIssues: [{ queryKey: ['subIssues'] }],
    // Progreso, «lista para revisar» y bugs de las historias (cambian con sus tareas)
    stories: [{ queryKey: ['stories'] }],
    relations: [{ queryKey: ['relations'] }],
    planning: [
      { queryKey: queryKeys.cycles(projectId) },
      { queryKey: queryKeys.modules(projectId) },
      { queryKey: ['cycle'] },
      { queryKey: ['module'] },
    ],
    // Los conteos de tareas (abiertas, vencidas) vienen en el proyecto
    project: [{ queryKey: ['project'] }, { queryKey: ['projects'] }],
    // Las tareas padre (conteo de subtareas), la historia y las que la muestran como padre
    otherIssues: [
      light && issueId ? { queryKey: ['issue'], predicate: (query) => query.queryKey[1] !== issueId } : { queryKey: ['issue'] },
    ],
    // Vistas que resumen tareas de varios lados
    stats: [{ queryKey: ['stats', projectId] }],
    myWork: [{ queryKey: ['myWork'] }],
    // Pastillas de tareas dentro de descripciones y comentarios (título y estado)
    taskRef: [{ queryKey: ['taskRef'] }],
    daily: [{ queryKey: queryKeys.dailyOf(projectId) }],
  }
  for (const group of dependents) filters.push(...byGroup[group])
  return filters
}

/** Lo que cambia cuando cambia un issue (ver `issueChangeFilters`). */
function invalidateAfterIssueChange(queryClient, projectId, issueId, fields = null) {
  for (const filter of issueChangeFilters(projectId, issueId, fields)) queryClient.invalidateQueries(filter)
}

export function useIssues(slug, projectId, params, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.issues(projectId, params),
    queryFn: () => issuesApi.list(slug, projectId, params),
    enabled: Boolean(slug && projectId) && enabled,
    placeholderData: keepPreviousData,
  })
}

export function useIssue(slug, projectId, issueId) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: queryKeys.issue(issueId),
    queryFn: () => issuesApi.get(slug, projectId, issueId),
    enabled: Boolean(slug && projectId && issueId),
    // Mientras carga, muestra lo que ya hay en las listas (el panel abre al instante)
    placeholderData: () => {
      for (const [, page] of queryClient.getQueriesData({ queryKey: queryKeys.issuesOf(projectId) })) {
        const found = page?.content?.find((issue) => issue.id === issueId)
        if (found) return found
      }
      return undefined
    },
  })
}

export function useSubIssues(slug, projectId, issueId) {
  return useQuery({
    queryKey: queryKeys.subIssues(issueId),
    queryFn: () => issuesApi.subIssues(slug, projectId, issueId),
    enabled: Boolean(issueId),
  })
}

/** `mutate(cuerpo)`; con `templateId` la plantilla suma un uso. */
export function useCreateIssue(slug, projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => issuesApi.create(slug, projectId, body),
    onSuccess: (issue, body) => {
      queryClient.setQueryData(queryKeys.issue(issue.id), issue)
      invalidateAfterIssueChange(queryClient, projectId)
      if (body?.templateId) queryClient.invalidateQueries({ queryKey: queryKeys.templates(projectId) })
    },
  })
}

/**
 * Edición parcial: `mutate({ issueId, ...cambios })`. Con `issueId` las ediciones de esa tarea van en fila (en
 * cualquier tarjeta, fila o panel): así llegan al backend y vuelven en el orden en que se hicieron (marcar dos
 * etiquetas seguidas no deja la primera respuesta pisando a la segunda).
 */
export function useUpdateIssue(slug, projectId, issueId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ issueId: id, ...body }) => issuesApi.update(slug, projectId, id, body),
    ...(issueId && { scope: { id: `issue:${issueId}` } }),
    onSuccess: (issue, { issueId: _id, ...body }) => {
      queryClient.setQueryData(queryKeys.issue(issue.id), issue)
      replaceInLists(queryClient, projectId, issue)
      invalidateAfterIssueChange(queryClient, projectId, issue.id, Object.keys(body))
    },
  })
}

/**
 * El 409 de una descripción que otra persona cambió después de la versión de la que se partió:
 * `{ description, version, by, at, issue }` (la descripción actual, su versión, quién la guardó, cuándo y la tarea
 * completa). `null` si el error es otro.
 * @returns {{ description: string, version: number, by: import('@/api/types').UserSummary | null, at: string | null, issue: import('@/api/types').IssueResponse } | null}
 */
export function descriptionConflict(error) {
  const { status, code, data } = toApiError(error)
  if (status !== 409 || code !== 'DESCRIPTION_CONFLICT' || !data) return null
  return {
    description: (data.description ?? '').trim(),
    version: data.descriptionVersion ?? 0,
    by: data.descriptionUpdatedBy ?? null,
    at: data.descriptionUpdatedAt ?? null,
    issue: data.issue,
  }
}

/** Guarda en la caché la tarea que llegó, salvo que la caché ya tenga una descripción más nueva. */
function keepNewest(queryClient, projectId, issue) {
  const cached = queryClient.getQueryData(queryKeys.issue(issue.id))
  if ((cached?.descriptionVersion ?? -1) > (issue.descriptionVersion ?? 0)) return
  queryClient.setQueryData(queryKeys.issue(issue.id), issue)
  replaceInLists(queryClient, projectId, issue)
}

/**
 * Guardar la descripción: `mutate({ description, base })`. `base` es la `descriptionVersion` de la que se partió:
 * si otra persona la guardó después, el backend responde 409 sin cambiar nada (ver `descriptionConflict`) y la caché
 * queda con su versión. El editor guarda mientras se escribe, así que no recarga todo lo que recarga una edición
 * cualquiera (listas, ciclos, estadísticas): solo la tarea, sus filas en las listas y el historial. La tarea en caché
 * cambia al instante (las casillas marcadas sin entrar a editar se ven enseguida).
 */
export function useSaveDescription(slug, projectId, issueId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ['saveDescription', issueId],
    mutationFn: ({ description, base }) =>
      issuesApi.update(slug, projectId, issueId, { description, baseDescriptionVersion: base ?? undefined }),
    onMutate: async ({ description }) => {
      // Una recarga en curso traería la versión de antes de este guardado
      await queryClient.cancelQueries({ queryKey: queryKeys.issue(issueId) })
      const previous = queryClient.getQueryData(queryKeys.issue(issueId))
      const optimistic = description || null
      queryClient.setQueryData(queryKeys.issue(issueId), (issue) => (issue ? { ...issue, description: optimistic } : issue))
      return { previousDescription: previous?.description ?? null, optimistic, hadIssue: Boolean(previous) }
    },
    onSuccess: (issue) => {
      keepNewest(queryClient, projectId, issue)
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(issueId) })
      queryClient.invalidateQueries({ queryKey: ['workspaceActivity'] })
    },
    onError: (error, _variables, context) => {
      const conflict = descriptionConflict(error)
      if (conflict?.issue) {
        keepNewest(queryClient, projectId, conflict.issue)
        return
      }
      // No se guardó: la caché vuelve a la descripción de antes (si nada la cambió mientras tanto) y se recarga
      if (context?.hadIssue) {
        queryClient.setQueryData(queryKeys.issue(issueId), (issue) =>
          issue && issue.description === context.optimistic ? { ...issue, description: context.previousDescription } : issue,
        )
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.issue(issueId) })
    },
  })
}

/**
 * Mover en el Kanban con actualización optimista (si falla, cada lista vuelve a como estaba).
 * `mutate({ issueId, stateId, afterIssueId, beforeIssueId, state, sortOrder, reopenParent? })`: `state` y `sortOrder`
 * solo se usan para pintar el cambio al instante (lo que el backend calculará). `reopenParent` reabre la historia
 * cerrada de la tarea (solo el project manager; sin él, 409 STORY_CLOSED).
 */
export function useMoveIssue(slug, projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ issueId, stateId, afterIssueId, beforeIssueId, reopenParent }) =>
      issuesApi.move(slug, projectId, issueId, { stateId, afterIssueId, beforeIssueId, reopenParent: reopenParent || undefined }),
    onMutate: async ({ issueId, state, sortOrder }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.issuesOf(projectId) })
      const snapshots = queryClient.getQueriesData({ queryKey: queryKeys.issuesOf(projectId) })
      queryClient.setQueriesData({ queryKey: queryKeys.issuesOf(projectId) }, (page) =>
        page?.content
          ? {
              ...page,
              content: page.content.map((issue) => (issue.id === issueId ? { ...issue, state, sortOrder } : issue)),
            }
          : page,
      )
      return { snapshots }
    },
    onError: (_error, _variables, context) => {
      context?.snapshots.forEach(([key, value]) => queryClient.setQueryData(key, value))
    },
    onSuccess: (issue) => queryClient.setQueryData(queryKeys.issue(issue.id), issue),
    onSettled: (_data, _error, { issueId }) => invalidateAfterIssueChange(queryClient, projectId, issueId),
  })
}

export function useDeleteIssue(slug, projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (issueId) => issuesApi.remove(slug, projectId, issueId),
    onSuccess: (_data, issueId) => {
      queryClient.removeQueries({ queryKey: queryKeys.issue(issueId) })
      invalidateAfterIssueChange(queryClient, projectId)
    },
  })
}

/** Lo mismo que al cambiar una tarea (para las mutaciones de las historias). */
export function useInvalidateAfterIssueChange(projectId) {
  const queryClient = useQueryClient()
  return (issueId) => invalidateAfterIssueChange(queryClient, projectId, issueId)
}

export function useActivity(slug, projectId, issueId) {
  return useQuery({
    queryKey: queryKeys.activity(issueId),
    queryFn: () => issuesApi.activity(slug, projectId, issueId),
    enabled: Boolean(issueId),
  })
}
