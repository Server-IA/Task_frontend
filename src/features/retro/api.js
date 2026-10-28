import { api } from '@/api/client'

/** @typedef {import('@/api/types').RetroResponse} RetroResponse */
/** @typedef {import('@/api/types').RetroNote} RetroNote */
/** @typedef {import('@/api/types').RetroVoteResponse} RetroVoteResponse */
/** @typedef {import('@/api/types').RetroColumn} RetroColumn */

const data = (response) => response.data
const base = (slug, projectId, cycleId) => `/workspaces/${slug}/projects/${projectId}/cycles/${cycleId}/retro`

/** Retrospectiva de un ciclo: notas en tres columnas, votos (5 por persona) y acciones que pasan a tareas. */
export const retroApi = {
  /** @returns {Promise<RetroResponse>} */
  get: (slug, projectId, cycleId) => api.get(base(slug, projectId, cycleId)).then(data),

  /** Abrirla (project manager). @returns {Promise<RetroResponse>} */
  start: (slug, projectId, cycleId) => api.post(`${base(slug, projectId, cycleId)}/start`).then(data),

  /** Terminarla: notas y votos quedan de solo lectura (project manager). @returns {Promise<RetroResponse>} */
  finish: (slug, projectId, cycleId) => api.post(`${base(slug, projectId, cycleId)}/finish`).then(data),

  /**
   * `ownerId`: responsable de una acción (solo ACTION y miembro del proyecto; si no, 400).
   * @param {{ column: RetroColumn, text: string, ownerId?: string }} body
   * @returns {Promise<RetroNote>}
   */
  createNote: (slug, projectId, cycleId, body) => api.post(`${base(slug, projectId, cycleId)}/notes`, body).then(data),

  /**
   * Edición parcial: solo viaja lo que cambia (`clearOwner: true` quita el responsable).
   * @param {import('@/api/types').UpdateRetroNoteRequest} patch
   * @returns {Promise<RetroNote>}
   */
  updateNote: (slug, projectId, cycleId, noteId, patch) =>
    api.patch(`${base(slug, projectId, cycleId)}/notes/${noteId}`, patch).then(data),

  removeNote: (slug, projectId, cycleId, noteId) => api.delete(`${base(slug, projectId, cycleId)}/notes/${noteId}`),

  /** @returns {Promise<RetroVoteResponse>} */
  vote: (slug, projectId, cycleId, noteId) => api.post(`${base(slug, projectId, cycleId)}/notes/${noteId}/vote`).then(data),

  /** @returns {Promise<RetroVoteResponse>} */
  unvote: (slug, projectId, cycleId, noteId) =>
    api.delete(`${base(slug, projectId, cycleId)}/notes/${noteId}/vote`).then(data),

  /** Acción → tarea asignada a su responsable (project manager). @returns {Promise<import('@/api/types').IssueResponse>} */
  convert: (slug, projectId, cycleId, noteId) =>
    api.post(`${base(slug, projectId, cycleId)}/notes/${noteId}/convert`).then(data),
}
