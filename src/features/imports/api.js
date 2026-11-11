import { api } from '@/api/client'

/**
 * Importar proyectos y tareas desde otra herramienta (pestaña «Importar» de los ajustes del workspace).
 *
 * @typedef {'JIRA' | 'TRELLO' | 'LINEAR' | 'ASANA' | 'CSV'} ImportSource
 * @typedef {'DRAFT' | 'FETCHING' | 'READY' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'STOPPED' | 'UNDOING' | 'UNDONE'} ImportStatus
 * @typedef {{ externalId: string, targetProjectId: string | null, name: string | null, identifier: string | null }} ProjectChoice
 * @typedef {{ keepNumbers: boolean, completed: boolean, comments: boolean, attachments: boolean, closedSprints: boolean,
 *             archived: boolean }} ImportOptions
 * @typedef {{ projects: ProjectChoice[], options: ImportOptions, csv: { columns: string[] } | null }} ImportSelection
 * @typedef {{ name: string, group: string }} StateTarget
 * @typedef {{ action: 'MEMBER' | 'INVITE' | 'UNASSIGNED', userId: string | null, email: string | null,
 *             roleId: string | null }} PersonTarget
 * @typedef {{ types: Record<string, string>, states: Record<string, StateTarget>, priorities: Record<string, string>,
 *             people: Record<string, PersonTarget> }} ImportMapping
 * @typedef {{ id: string, source: ImportSource, via: 'API' | 'FILE', sourceLabel: string, status: ImportStatus,
 *             error: string | null, createdByName: string | null, createdAt: string, startedAt: string | null,
 *             finishedAt: string | null, connected: boolean, discovery: any, selection: ImportSelection | null,
 *             mapping: any, preview: any, progress: any, report: any }} ImportJob
 */

const base = (slug) => `/workspaces/${slug}/imports`
const data = (response) => response.data

export const importsApi = {
  /** @returns {Promise<ImportJob[]>} */
  list: (slug) => api.get(base(slug)).then(data),

  /** @returns {Promise<ImportJob>} */
  get: (slug, jobId) => api.get(`${base(slug)}/${jobId}`).then(data),

  /**
   * Conectar con la herramienta. Leer la lista de proyectos de una cuenta grande puede tardar.
   * @param {{ source: ImportSource, baseUrl?: string, email?: string, token: string }} body
   * @returns {Promise<ImportJob>}
   */
  connect: (slug, body) => api.post(`${base(slug)}/connect`, body, { timeout: 90_000 }).then(data),

  /**
   * @param {{ source: ImportSource, fileName: string, contentBase64: string }} body
   * @returns {Promise<ImportJob>}
   */
  upload: (slug, body) => api.post(`${base(slug)}/upload`, body, { timeout: 90_000 }).then(data),

  /** @returns {Promise<ImportJob>} */
  select: (slug, jobId, selection) => api.put(`${base(slug)}/${jobId}/selection`, selection).then(data),

  /** @returns {Promise<ImportJob>} */
  saveMapping: (slug, jobId, mapping) => api.put(`${base(slug)}/${jobId}/mapping`, mapping).then(data),

  /** @returns {Promise<ImportJob>} */
  start: (slug, jobId) => api.post(`${base(slug)}/${jobId}/start`).then(data),

  /** @returns {Promise<ImportJob>} */
  stop: (slug, jobId) => api.post(`${base(slug)}/${jobId}/stop`).then(data),

  /** @returns {Promise<ImportJob>} */
  undo: (slug, jobId) => api.post(`${base(slug)}/${jobId}/undo`).then(data),

  discard: (slug, jobId) => api.delete(`${base(slug)}/${jobId}`),

  /** El informe de lo que no entró, en CSV. @returns {Promise<Blob>} */
  report: (slug, jobId) => api.get(`${base(slug)}/${jobId}/report`, { responseType: 'blob' }).then(data),
}
