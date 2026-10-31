/**
 * Query keys de TanStack Query. Centralizadas para invalidar siempre las mismas.
 */
export const queryKeys = {
  me: ['me'],

  workspaces: ['workspaces'],
  workspace: (slug) => ['workspace', slug],
  members: (slug) => ['members', slug],
  invitations: (slug) => ['invitations', slug],
  invitation: (token) => ['invitation', token],

  projects: (slug) => ['projects', slug],
  project: (slug, projectId) => ['project', slug, projectId],
  states: (projectId) => ['states', projectId],
  labels: (projectId) => ['labels', projectId],
  projectMembers: (projectId) => ['projectMembers', projectId],

  /** Prefijo de todos los listados de issues de un proyecto (con cualquier filtro). */
  issuesOf: (projectId) => ['issues', projectId],
  issues: (projectId, params) => ['issues', projectId, params],
  issue: (issueId) => ['issue', issueId],
  subIssues: (issueId) => ['subIssues', issueId],
  comments: (issueId) => ['comments', issueId],
  activity: (issueId) => ['activity', issueId],
  relations: (issueId) => ['relations', issueId],
  checklist: (issueId) => ['checklist', issueId],
  /** Adjuntos confirmados de una tarea. */
  attachments: (issueId) => ['attachments', issueId],

  /** Historias del proyecto (GET /stories) con su progreso, sus tareas y bugs. */
  stories: (projectId) => ['stories', projectId],

  templates: (projectId) => ['templates', projectId],
  savedViews: (projectId) => ['savedViews', projectId],

  cycles: (projectId) => ['cycles', projectId],
  cycle: (cycleId) => ['cycle', cycleId],
  modules: (projectId) => ['modules', projectId],
  module: (moduleId) => ['module', moduleId],
  closePreview: (cycleId) => ['closePreview', cycleId],
  retro: (cycleId) => ['retro', cycleId],

  /** Prefijo de la daily de un proyecto (cualquier fecha). */
  dailyOf: (projectId) => ['daily', projectId],
  daily: (projectId, date) => ['daily', projectId, date],

  stats: (projectId, weeks) => ['stats', projectId, weeks],

  myWork: (slug, view) => ['myWork', slug, view],
  /** Prefijo del feed y del resumen de actividad del workspace (con cualquier filtro). */
  workspaceActivityOf: (slug) => ['workspaceActivity', slug],
  workspaceActivity: (slug, params) => ['workspaceActivity', slug, 'feed', params],
  activitySummary: (slug, days) => ['workspaceActivity', slug, 'summary', days],
  search: (slug, q) => ['search', slug, q],
  /** Espacio usado del workspace (aviso del 90 %) y la pestaña «Almacenamiento» (PM). */
  storageUsage: (slug) => ['storage', slug, 'usage'],
  storageReport: (slug) => ['storage', slug, 'report'],
  storageOf: (slug) => ['storage', slug],

  notifications: (params) => ['notifications', 'list', params],
  notificationsAll: ['notifications'],
  unreadCount: ['notifications', 'unread-count'],
  /** Sin leer, menciones sin leer y menciones en total (badge de la Bandeja y sus pestañas). */
  notificationCounts: ['notifications', 'counts'],
}
