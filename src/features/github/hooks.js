import { useMemo } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { githubApi } from './api'

/**
 * Lo que pasa en GitHub llega a TaskFlow por avisos, no a esta página: las listas se vuelven a pedir cada poco
 * mientras están a la vista (TanStack no consulta con la pestaña en segundo plano).
 */
const LIVE_MS = 15_000
const SUMMARY_MS = 60_000

/** La conexión del workspace con GitHub. */
export function useGithubWorkspace(slug) {
  return useQuery({
    queryKey: queryKeys.githubWorkspace(slug),
    queryFn: () => githubApi.workspace(slug),
    enabled: Boolean(slug),
  })
}

/** GitHub en un proyecto: sus repositorios, los que puede enlazar, las automatizaciones y las reglas. */
export function useGithubProject(slug, projectId, { live = false } = {}) {
  return useQuery({
    queryKey: queryKeys.githubProject(slug, projectId),
    queryFn: () => githubApi.project(slug, projectId),
    enabled: Boolean(slug && projectId),
    refetchInterval: live ? LIVE_MS * 2 : false,
  })
}

/** @param {'open' | 'merged' | 'all'} state */
export function useGithubPulls(slug, projectId, state, { enabled = true, live = true } = {}) {
  return useQuery({
    queryKey: queryKeys.githubPulls(slug, projectId, state),
    queryFn: () => githubApi.pulls(slug, projectId, state),
    enabled: Boolean(slug && projectId) && enabled,
    refetchInterval: live ? LIVE_MS : false,
  })
}

export function useGithubRuns(slug, projectId, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.githubRuns(slug, projectId),
    queryFn: () => githubApi.runs(slug, projectId),
    enabled: Boolean(slug && projectId) && enabled,
    refetchInterval: LIVE_MS,
  })
}

/** Las ramas enlazadas a tareas del proyecto. */
export function useGithubBranches(slug, projectId, { enabled = true, live = true } = {}) {
  return useQuery({
    queryKey: queryKeys.githubBranches(slug, projectId),
    queryFn: () => githubApi.branches(slug, projectId),
    enabled: Boolean(slug && projectId) && enabled,
    refetchInterval: live ? LIVE_MS * 2 : false,
  })
}

/** Cada cuánto se vuelve a preguntar si el workspace está conectado con GitHub. */
const CONNECTED_MS = 5 * 60_000

/**
 * Si el workspace está conectado con GitHub. Lo usan las consultas que se piden desde todas las pantallas de tareas (el
 * resumen del tablero, el desarrollo de una tarea): sin conexión no le piden nada más al servidor.
 */
async function isConnected(queryClient, slug) {
  try {
    const status = await queryClient.fetchQuery({
      queryKey: queryKeys.githubWorkspace(slug),
      queryFn: () => githubApi.workspace(slug),
      staleTime: CONNECTED_MS,
    })
    return Boolean(status?.connected)
  } catch {
    return false
  }
}

/** Lo que cambia en una tarea cuando GitHub la mueve: su rama y el estado de su pull request. */
const summarySignature = (summaries) =>
  summaries
    .map((summary) => `${summary.issueId}:${summary.branches}:${summary.prNumber}:${summary.prState}`)
    .sort()
    .join('|')

/**
 * El resumen del proyecto (qué tareas tienen rama o pull request). Cuando cambia entre un sondeo y otro es que GitHub
 * hizo algo (se abrió o se fusionó un pull request), y eso puede haber movido tareas: se recargan las listas de tareas.
 */
function summaryOptions(queryClient, slug, projectId) {
  const queryKey = queryKeys.githubSummary(slug, projectId)
  return {
    queryKey,
    queryFn: async () => {
      if (!(await isConnected(queryClient, slug))) return []
      const next = await githubApi.summary(slug, projectId)
      const previous = queryClient.getQueryData(queryKey)
      if (previous && summarySignature(previous) !== summarySignature(next)) {
        queryClient.invalidateQueries({ queryKey: queryKeys.issuesOf(projectId) })
      }
      return next
    },
    enabled: Boolean(slug && projectId),
    staleTime: SUMMARY_MS / 2,
    refetchInterval: SUMMARY_MS,
  }
}

/**
 * Qué tareas del proyecto tienen rama o pull request, por id de tarea (para el indicador de las tarjetas y las
 * filas). Si el proyecto no usa GitHub viene vacío.
 * @returns {Map<string, import('./api').IssueSummary>}
 */
export function useGithubSummary(slug, projectId) {
  const queryClient = useQueryClient()
  const { data } = useQuery(summaryOptions(queryClient, slug, projectId))
  return useMemo(() => new Map((data ?? []).map((summary) => [summary.issueId, summary])), [data])
}

/**
 * El resumen de una sola tarea. Todas las tarjetas y filas comparten la misma consulta; cada una se queda con lo suyo y
 * solo se vuelve a pintar si eso cambia.
 * @returns {import('./api').IssueSummary | undefined}
 */
export function useIssueGithubSummary(slug, projectId, issueId) {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    ...summaryOptions(queryClient, slug, projectId),
    select: (summaries) => summaries.find((summary) => summary.issueId === issueId),
  })
  return data
}

/** Los workflows de un repositorio que se pueden ejecutar a mano. */
export function useGithubWorkflows(slug, projectId, repositoryId) {
  return useQuery({
    queryKey: queryKeys.githubWorkflows(slug, projectId, repositoryId),
    queryFn: () => githubApi.workflows(slug, projectId, repositoryId),
    enabled: Boolean(slug && projectId && repositoryId),
    staleTime: 5 * 60_000,
  })
}

/** Las ramas que hay en el repositorio en GitHub. */
export function useGithubRepoBranches(slug, projectId, repositoryId) {
  return useQuery({
    queryKey: queryKeys.githubRepoBranches(slug, projectId, repositoryId),
    queryFn: () => githubApi.repoBranches(slug, projectId, repositoryId),
    enabled: Boolean(slug && projectId && repositoryId),
    staleTime: 60_000,
  })
}

/** Lo que se responde de una tarea cuando el workspace no está conectado con GitHub. */
const NO_DEVELOPMENT = {
  available: false,
  repositories: [],
  branches: [],
  pullRequests: [],
  runs: [],
  suggestedBranch: '',
}

const developmentSignature = (dev) =>
  [
    ...dev.branches.map((branch) => branch.name),
    ...dev.pullRequests.map((pull) => `${pull.id}:${pull.state}`),
  ]
    .sort()
    .join('|')

/** El desarrollo de una tarea: sus ramas, pull requests y ejecuciones. */
export function useGithubIssue(slug, projectId, issueId) {
  const queryClient = useQueryClient()
  const queryKey = queryKeys.githubIssue(slug, projectId, issueId)
  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!(await isConnected(queryClient, slug))) return NO_DEVELOPMENT
      const next = await githubApi.issue(slug, projectId, issueId)
      const previous = queryClient.getQueryData(queryKey)
      // Si cambió su rama o el estado de su pull request, GitHub pudo mover la tarea y dejó una entrada en su actividad
      if (previous && developmentSignature(previous) !== developmentSignature(next)) {
        queryClient.invalidateQueries({ queryKey: queryKeys.issue(issueId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.activity(issueId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.issuesOf(projectId) })
      }
      return next
    },
    enabled: Boolean(slug && projectId && issueId),
    // Solo se sigue consultando si la tarea ya tiene algo en GitHub que pueda cambiar
    refetchInterval: (query) => {
      const dev = query.state.data
      return dev?.branches.length || dev?.pullRequests.length || dev?.runs.length ? LIVE_MS : false
    },
  })
}

/** Los checks de un pull request de la tarea, como están ahora en GitHub. */
export function useGithubChecks(slug, projectId, issueId, pullRequest) {
  return useQuery({
    // El commit entra en la clave: un push nuevo trae checks nuevos
    queryKey: [
      ...queryKeys.githubChecks(slug, projectId, issueId, pullRequest?.id),
      pullRequest?.headSha,
      pullRequest?.checksState,
    ],
    queryFn: () => githubApi.checks(slug, projectId, issueId, pullRequest.id),
    enabled: Boolean(slug && projectId && issueId && pullRequest?.id && pullRequest?.headSha),
    staleTime: LIVE_MS,
    // Mientras alguno sigue corriendo, la lista se refresca; y al cambiar de commit no se queda en blanco
    refetchInterval: pullRequest?.checksState === 'PENDING' ? LIVE_MS : false,
    placeholderData: keepPreviousData,
  })
}

/** Mi cuenta de GitHub: si la tengo enlazada (sin ella puedo ver, no actuar). */
export function useMyGithub() {
  return useQuery({ queryKey: queryKeys.githubMe, queryFn: () => githubApi.me(), staleTime: 60_000 })
}

/** Si tengo mi cuenta enlazada; `undefined` mientras no se sabe. */
export const useGithubLinked = () => useMyGithub().data?.linked

export const useLinkGithub = () => useMutation({ mutationFn: () => githubApi.linkUrl() })

/** Enlazar o desenlazar mi cuenta cambia lo que puedo hacer y cómo aparezco: se recarga todo lo de GitHub. */
function useAccountAction(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (account) => {
      if (account?.configured !== undefined) queryClient.setQueryData(queryKeys.githubMe, account)
      queryClient.invalidateQueries({ queryKey: ['github'] })
    },
  })
}
export const useCompleteGithubLink = () => useAccountAction((body) => githubApi.completeLink(body))
export const useUnlinkGithub = () => useAccountAction(() => githubApi.unlink())

// ----- Acciones

function useWorkspaceAction(slug, mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    // Conectar, desconectar o releer cambia lo que ve cada proyecto
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.github(slug) }),
  })
}

export const useInstallGithub = (slug) => useMutation({ mutationFn: () => githubApi.install(slug) })
export const useSyncGithub = (slug) => useWorkspaceAction(slug, () => githubApi.sync(slug))
export const useDisconnectGithub = (slug) => useWorkspaceAction(slug, () => githubApi.disconnect(slug))

/** Una acción cuya respuesta es el estado del proyecto al día: se guarda en caché y lo demás se recarga. */
function useProjectAction(slug, projectId, mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (status) => {
      if (status?.settings) queryClient.setQueryData(queryKeys.githubProject(slug, projectId), status)
      queryClient.invalidateQueries({ queryKey: queryKeys.github(slug) })
    },
  })
}

/** `mutate({ projectId, repositoryIds })`: se usa también desde los ajustes del workspace, para cualquier proyecto. */
export function useSetRepositories(slug) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, repositoryIds }) => githubApi.setRepositories(slug, projectId, repositoryIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.github(slug) }),
  })
}
export const useSaveGithubSettings = (slug, projectId) =>
  useProjectAction(slug, projectId, (settings) => githubApi.saveSettings(slug, projectId, settings))
export const useAddGithubRule = (slug, projectId) =>
  useProjectAction(slug, projectId, (rule) => githubApi.addRule(slug, projectId, rule))
export const useDeleteGithubRule = (slug, projectId) =>
  useProjectAction(slug, projectId, (ruleId) => githubApi.deleteRule(slug, projectId, ruleId))

function useRunsAction(slug, projectId, mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.githubRuns(slug, projectId) }),
  })
}
export const useDispatchWorkflow = (slug, projectId) =>
  useRunsAction(slug, projectId, (body) => githubApi.dispatch(slug, projectId, body))
export const useRerunWorkflow = (slug, projectId) =>
  useRunsAction(slug, projectId, (runId) => githubApi.rerun(slug, projectId, runId))
export const useCancelWorkflow = (slug, projectId) =>
  useRunsAction(slug, projectId, (runId) => githubApi.cancel(slug, projectId, runId))

/** `mutate({ pullRequestId, issueId })`; `issueId: null` lo deja sin tarea. */
export function useLinkPullRequest(slug, projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ pullRequestId, issueId }) => githubApi.linkPull(slug, projectId, pullRequestId, issueId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.github(slug) }),
  })
}

/** Crear la rama de la tarea o enlazarle una: la respuesta es el desarrollo de la tarea al día. */
function useIssueDevAction(slug, projectId, issueId, mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (dev) => {
      if (dev?.branches) queryClient.setQueryData(queryKeys.githubIssue(slug, projectId, issueId), dev)
      queryClient.invalidateQueries({ queryKey: queryKeys.githubSummary(slug, projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.githubBranches(slug, projectId) })
      // La rama puede haber movido la tarea (automatización del proyecto) y deja una entrada en su actividad
      queryClient.invalidateQueries({ queryKey: queryKeys.issue(issueId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.issuesOf(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(issueId) })
    },
  })
}
export const useCreateBranch = (slug, projectId, issueId) =>
  useIssueDevAction(slug, projectId, issueId, (body) =>
    githubApi.createBranch(slug, projectId, issueId, body),
  )
export const useLinkBranch = (slug, projectId, issueId) =>
  useIssueDevAction(slug, projectId, issueId, (body) => githubApi.linkBranch(slug, projectId, issueId, body))
/** `mutate(branchId)`: quita la rama de la tarea; en GitHub sigue como estaba. */
export const useUnlinkBranch = (slug, projectId, issueId) =>
  useIssueDevAction(slug, projectId, issueId, (branchId) =>
    githubApi.unlinkBranch(slug, projectId, issueId, branchId),
  )
