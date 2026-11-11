import { api } from '@/api/client'

/**
 * Integración con GitHub: la conexión del workspace, los repositorios de cada proyecto, sus pull requests y
 * ejecuciones de Actions, y el desarrollo de cada tarea (ramas, pull requests y checks).
 *
 * @typedef {{ repositoryId: string, projectId: string, identifier: string, name: string, color: string }} LinkedProject
 * @typedef {{ id: string, fullName: string, defaultBranch: string | null, isPrivate: boolean, projects: LinkedProject[],
 *             openPullRequests: number }} Repository
 * @typedef {{ configured: boolean, connected: boolean, accountLogin: string | null, accountType: string | null,
 *             installedByName: string | null, installedAt: string | null, lastEventAt: string | null,
 *             manageUrl: string | null, repositories: Repository[] }} WorkspaceStatus
 * @typedef {{ onBranchStateId: string | null, onPrOpenedStateId: string | null, onPrMergedStateId: string | null,
 *             onPrClosedStateId: string | null, branchFormat: 'CODE_TITLE' | 'TYPE_CODE_TITLE' | 'CODE' }} Settings
 * @typedef {{ id: string, firesOn: 'PR_MERGED' | 'ISSUE_COMPLETED', repositoryId: string, repository: string,
 *             workflowId: number, workflowName: string, ref: string, lastRunAt: string | null,
 *             lastRunStatus: string | null, lastRunConclusion: string | null }} Rule
 * @typedef {{ configured: boolean, connected: boolean, repositories: Repository[], available: Repository[],
 *             settings: Settings, rules: Rule[] }} ProjectStatus
 * @typedef {{ id: string, repositoryId: string, repository: string, issueId: string | null, issueCode: string | null,
 *             issueTitle: string | null, issueState: string | null, issueStateGroup: string | null, number: number,
 *             title: string, state: 'OPEN' | 'DRAFT' | 'MERGED' | 'CLOSED', url: string, authorLogin: string | null,
 *             headBranch: string | null, baseBranch: string | null, headSha: string | null, reviewers: string | null,
 *             checksState: 'SUCCESS' | 'FAILURE' | 'PENDING' | null, checksTotal: number, checksFailed: number,
 *             mergedAt: string | null, openedAt: string | null, changedAt: string | null }} PullRequest
 * @typedef {{ id: string, repositoryId: string, repository: string, runId: number | null, workflowId: number | null,
 *             workflowName: string | null, title: string | null, branch: string | null, headSha: string | null,
 *             event: string | null, status: string, conclusion: string | null, actorLogin: string | null,
 *             url: string | null, prNumber: number | null, issueId: string | null, issueCode: string | null,
 *             ruleId: string | null, triggeredByName: string | null, requestedAt: string | null,
 *             startedAt: string | null, changedAt: string | null }} Run
 * @typedef {{ id: string, repositoryId: string, repository: string, issueId: string, issueCode: string,
 *             issueTitle: string, name: string, createdAt: string }} Branch
 * @typedef {{ issueId: string, branch: string | null, branches: number, prNumber: number | null, prState: string | null,
 *             checksState: string | null, prUrl: string | null, running: boolean }} IssueSummary
 * @typedef {{ available: boolean, repositories: Repository[], branches: Branch[], pullRequests: PullRequest[],
 *             runs: Run[], suggestedBranch: string }} IssueDev
 * @typedef {{ id: number, name: string, path: string, inputs: string[] }} Workflow
 * @typedef {{ name: string, status: string, conclusion: string | null, startedAt: string | null,
 *             completedAt: string | null, url: string | null }} Check
 */

const workspace = (slug) => `/workspaces/${slug}/github`
const project = (slug, projectId) => `/workspaces/${slug}/projects/${projectId}/github`
const data = (response) => response.data
/** Lo que pasa por GitHub (crear una rama, leer workflows) puede tardar más que una consulta nuestra. */
const SLOW = { timeout: 45_000 }

export const githubApi = {
  /** @returns {Promise<WorkspaceStatus>} */
  workspace: (slug) => api.get(workspace(slug)).then(data),
  /** @returns {Promise<{ url: string }>} a dónde ir para instalar la app */
  install: (slug) => api.post(`${workspace(slug)}/install`).then(data),
  /** @returns {Promise<WorkspaceStatus>} */
  sync: (slug) => api.post(`${workspace(slug)}/sync`, null, SLOW).then(data),
  disconnect: (slug) => api.delete(workspace(slug), SLOW),

  /** @returns {Promise<ProjectStatus>} */
  project: (slug, projectId) => api.get(project(slug, projectId)).then(data),
  /** @returns {Promise<ProjectStatus>} */
  setRepositories: (slug, projectId, repositoryIds) =>
    api.put(`${project(slug, projectId)}/repositories`, { repositoryIds }, SLOW).then(data),
  /** @returns {Promise<ProjectStatus>} */
  saveSettings: (slug, projectId, settings) =>
    api.put(`${project(slug, projectId)}/settings`, settings).then(data),
  /** @returns {Promise<ProjectStatus>} */
  addRule: (slug, projectId, rule) => api.post(`${project(slug, projectId)}/rules`, rule).then(data),
  deleteRule: (slug, projectId, ruleId) => api.delete(`${project(slug, projectId)}/rules/${ruleId}`),

  /** @param {'open' | 'merged' | 'all'} state @returns {Promise<PullRequest[]>} */
  pulls: (slug, projectId, state) =>
    api.get(`${project(slug, projectId)}/pulls`, { params: { state } }).then(data),
  /** @returns {Promise<PullRequest>} */
  linkPull: (slug, projectId, pullRequestId, issueId) =>
    api.put(`${project(slug, projectId)}/pulls/${pullRequestId}/issue`, { issueId }).then(data),
  /** @returns {Promise<Run[]>} */
  runs: (slug, projectId) => api.get(`${project(slug, projectId)}/runs`).then(data),
  /** @returns {Promise<Run>} */
  dispatch: (slug, projectId, body) => api.post(`${project(slug, projectId)}/runs`, body, SLOW).then(data),
  rerun: (slug, projectId, runId) => api.post(`${project(slug, projectId)}/runs/${runId}/rerun`, null, SLOW),
  cancel: (slug, projectId, runId) =>
    api.post(`${project(slug, projectId)}/runs/${runId}/cancel`, null, SLOW),
  /** @returns {Promise<Workflow[]>} */
  workflows: (slug, projectId, repositoryId) =>
    api.get(`${project(slug, projectId)}/repositories/${repositoryId}/workflows`, SLOW).then(data),
  /** @returns {Promise<string[]>} */
  repoBranches: (slug, projectId, repositoryId) =>
    api.get(`${project(slug, projectId)}/repositories/${repositoryId}/branches`, SLOW).then(data),
  /** @returns {Promise<Branch[]>} */
  branches: (slug, projectId) => api.get(`${project(slug, projectId)}/branches`).then(data),
  /** @returns {Promise<IssueSummary[]>} */
  summary: (slug, projectId) => api.get(`${project(slug, projectId)}/summary`).then(data),

  /** @returns {Promise<IssueDev>} */
  issue: (slug, projectId, issueId) => api.get(`${project(slug, projectId)}/issues/${issueId}`).then(data),
  /** @returns {Promise<Check[]>} */
  checks: (slug, projectId, issueId, pullRequestId) =>
    api.get(`${project(slug, projectId)}/issues/${issueId}/pulls/${pullRequestId}/checks`, SLOW).then(data),
  /** @param {{ repositoryId: string, base: string, name: string, move: boolean }} body @returns {Promise<IssueDev>} */
  createBranch: (slug, projectId, issueId, body) =>
    api.post(`${project(slug, projectId)}/issues/${issueId}/branches`, body, SLOW).then(data),
  /** @param {{ repositoryId: string, name: string }} body @returns {Promise<IssueDev>} */
  linkBranch: (slug, projectId, issueId, body) =>
    api.post(`${project(slug, projectId)}/issues/${issueId}/branches/link`, body, SLOW).then(data),
}
