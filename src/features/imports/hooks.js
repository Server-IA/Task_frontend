import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { downloadBlob } from '@/lib/download'
import { importsApi } from './api'

/** Mientras la importación lee, escribe o deshace, se consulta cada poco para mostrar el avance. */
const POLL_MS = 1200
const WORKING = ['FETCHING', 'RUNNING', 'UNDOING']

/** Si hay un trabajo corriendo en segundo plano. @param {import('./api').ImportJob | undefined} job */
export const isWorking = (job) => WORKING.includes(job?.status)

/**
 * Lo que una importación cambia fuera de su pestaña: al terminar (o al deshacerse) hay proyectos, miembros,
 * invitaciones y archivos nuevos (o menos), y la barra lateral y los ajustes tienen que enterarse.
 */
function refreshWorkspace(queryClient, slug) {
  for (const queryKey of [
    queryKeys.projects(slug),
    queryKeys.members(slug),
    queryKeys.invitations(slug),
    queryKeys.storageOf(slug),
    queryKeys.workspaceActivityOf(slug),
  ]) {
    queryClient.invalidateQueries({ queryKey })
  }
}

/** Si entre una consulta y la siguiente alguna importación dejó de trabajar. */
const settled = (before, after) =>
  (before ?? []).some((job) => isWorking(job) && !isWorking(after.find((other) => other.id === job.id)))

/** Las importaciones del workspace (historial y las que quedaron sin terminar). */
export function useImports(slug) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: queryKeys.imports(slug),
    queryFn: async () => {
      const jobs = await importsApi.list(slug)
      if (settled(queryClient.getQueryData(queryKeys.imports(slug)), jobs)) refreshWorkspace(queryClient, slug)
      return jobs
    },
    enabled: Boolean(slug),
    // Si alguna está corriendo, la lista se actualiza sola hasta que termine
    refetchInterval: (query) => (query.state.data?.some(isWorking) ? POLL_MS * 2 : false),
  })
}

/** Una importación; se actualiza sola mientras hay un trabajo corriendo. */
export function useImport(slug, jobId) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: queryKeys.importJob(slug, jobId),
    queryFn: async () => {
      const job = await importsApi.get(slug, jobId)
      const before = queryClient.getQueryData(queryKeys.importJob(slug, jobId))
      if (isWorking(before) && !isWorking(job)) refreshWorkspace(queryClient, slug)
      return job
    },
    enabled: Boolean(slug && jobId),
    refetchInterval: (query) => (isWorking(query.state.data) ? POLL_MS : false),
  })
}

/**
 * Una acción sobre una importación cuya respuesta es la importación al día: se guarda en caché (así la pantalla cambia
 * de paso sin esperar otra consulta) y se recarga el historial.
 */
function useJobMutation(slug, mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (job) => {
      if (job?.id) queryClient.setQueryData(queryKeys.importJob(slug, job.id), job)
      queryClient.invalidateQueries({ queryKey: queryKeys.imports(slug) })
    },
  })
}

export const useConnectImport = (slug) => useJobMutation(slug, (body) => importsApi.connect(slug, body))
export const useUploadImport = (slug) => useJobMutation(slug, (body) => importsApi.upload(slug, body))
export const useSelectImport = (slug, jobId) => useJobMutation(slug, (selection) => importsApi.select(slug, jobId, selection))
export const useSaveImportMapping = (slug, jobId) => useJobMutation(slug, (mapping) => importsApi.saveMapping(slug, jobId, mapping))
export const useStartImport = (slug, jobId) => useJobMutation(slug, () => importsApi.start(slug, jobId))
export const useStopImport = (slug, jobId) => useJobMutation(slug, () => importsApi.stop(slug, jobId))
/** `mutate(jobId)`: se puede deshacer desde el historial o desde el informe. */
export const useUndoImport = (slug) => useJobMutation(slug, (jobId) => importsApi.undo(slug, jobId))

/** `mutate(jobId)`: descarta una importación que no llegó a traer nada. */
export function useDiscardImport(slug) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (jobId) => importsApi.discard(slug, jobId),
    onSuccess: (_data, jobId) => {
      queryClient.removeQueries({ queryKey: queryKeys.importJob(slug, jobId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.imports(slug) })
    },
  })
}

/** `mutate(job)`: descarga el informe de lo que no entró. */
export function useDownloadImportReport(slug) {
  return useMutation({
    mutationFn: async (job) => {
      const blob = await importsApi.report(slug, job.id)
      downloadBlob(blob, `importacion-${job.source.toLowerCase()}.csv`)
    },
  })
}
