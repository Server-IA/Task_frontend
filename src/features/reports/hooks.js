import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { downloadBlob } from '@/lib/download'
import { reportsApi } from './api'

/** Vista previa del reporte: se actualiza con cada cambio de filtros y mantiene la anterior mientras llega la nueva. */
export function useReportPreview(slug, projectId, params, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.reportPreview(projectId, params),
    queryFn: () => reportsApi.previewIssues(slug, projectId, params),
    enabled: Boolean(slug && projectId) && enabled,
    placeholderData: keepPreviousData,
  })
}

/** `mutate({ params, fileName })`: pide el PDF y lo descarga con ese nombre. */
export function useDownloadReport(slug, projectId) {
  return useMutation({
    mutationFn: async ({ params, fileName }) => {
      const blob = await reportsApi.issuesPdf(slug, projectId, params)
      downloadBlob(blob, fileName)
      return fileName
    },
  })
}
