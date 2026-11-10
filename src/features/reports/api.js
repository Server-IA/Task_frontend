import { api } from '@/api/client'
import { ApiError } from '@/lib/errors'

const base = (slug, projectId) => `/workspaces/${slug}/projects/${projectId}/reports`

/**
 * Con `responseType: 'blob'` el cuerpo de un error también llega como Blob y su mensaje se perdía (el aviso decía
 * «error inesperado» para un 400 o un 403). Si es JSON, se lee y se relanza el error con el mensaje del backend.
 */
async function withBlobMessage(error) {
  const blob = error?.data
  if (!(blob instanceof Blob)) throw error
  let body
  try {
    body = JSON.parse(await blob.text())
  } catch {
    throw error
  }
  throw new ApiError({
    status: error.status,
    message: body?.message ?? error.message,
    errors: body?.errors ?? null,
    code: body?.code ?? null,
    retryAfter: error.retryAfter ?? null,
    data: body,
  })
}

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
    api
      .get(`${base(slug, projectId)}/issues/pdf`, { params, responseType: 'blob', timeout: 90_000 })
      .then((response) => response.data, withBlobMessage),
}
