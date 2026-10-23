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

  cycles: (projectId) => ['cycles', projectId],
  cycle: (cycleId) => ['cycle', cycleId],
  modules: (projectId) => ['modules', projectId],
  module: (moduleId) => ['module', moduleId],

  notifications: (params) => ['notifications', 'list', params],
  notificationsAll: ['notifications'],
  unreadCount: ['notifications', 'unread-count'],
}
