import { api } from '@/api/client'

const base = (slug, projectId) => `/workspaces/${slug}/projects/${projectId}/reports`

/** Reportes de un proyecto. */
export const reportsApi = {
  /**
   * Lo que traerá el reporte de tareas con esos filtros: totales y repartos.
   * @returns {Promise<import('@/api/types').IssuesReportPreview>}
   */
  previewIssues: (slug, projectId, params) => api.get(`${base(slug, projectId)}/issues`, { params }).then((response) => response.data),

  /**
   * El reporte de tareas en PDF. Puede tardar más que una consulta normal: armar un PDF de cientos de tareas.
   * @returns {Promise<Blob>}
   */
  issuesPdf: (slug, projectId, params) =>
    api.get(`${base(slug, projectId)}/issues/pdf`, { params, responseType: 'blob', timeout: 90_000 }).then((response) => response.data),
}
