import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { queryKeys } from '@/api/queryKeys'
import { labelsApi, projectsApi, statesApi } from './api'

export function useProjects(slug) {
  return useQuery({
    queryKey: queryKeys.projects(slug),
    queryFn: () => projectsApi.list(slug),
    enabled: Boolean(slug),
  })
}

export function useProject(slug, projectId) {
  return useQuery({
    queryKey: queryKeys.project(slug, projectId),
    queryFn: () => projectsApi.get(slug, projectId),
    enabled: Boolean(slug && projectId),
  })
}

/** Proyecto de la URL actual. Solo dentro de ProjectLayout, que ya lo cargó. */
export function useCurrentProject() {
  const { slug, projectId } = useParams()
  const { data } = useProject(slug, projectId)
  return data
}

export function useCreateProject(slug) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => projectsApi.create(slug, body),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.project(slug, project.id), project)
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(slug) })
    },
  })
}

export function useUpdateProject(slug, projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => projectsApi.update(slug, projectId, body),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.project(slug, projectId), project)
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(slug) })
      // Si cambió el identificador, cambian todos los códigos de issue (WEB-1 → APP-1)
      queryClient.invalidateQueries({ queryKey: queryKeys.issuesOf(projectId) })
      queryClient.invalidateQueries({ queryKey: ['issue'] })
      // Las tareas de otras listas traen el proyecto (identificador y color) dentro
      for (const key of [['myWork', slug], queryKeys.workspaceActivityOf(slug), ['relations'], queryKeys.notificationsAll]) {
        queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}

export function useDeleteProject(slug, projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => projectsApi.remove(slug, projectId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.project(slug, projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(slug) })
    },
  })
}

export function useProjectMembers(slug, projectId) {
  return useQuery({
    queryKey: queryKeys.projectMembers(projectId),
    queryFn: () => projectsApi.members(slug, projectId),
    enabled: Boolean(slug && projectId),
  })
}

export function useAddProjectMember(slug, projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId) => projectsApi.addMember(slug, projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectMembers(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(slug) })
    },
  })
}

export function useRemoveProjectMember(slug, projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId) => projectsApi.removeMember(slug, projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectMembers(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(slug) })
      // Quien sale del proyecto deja de ser asignado por defecto en sus plantillas
      queryClient.invalidateQueries({ queryKey: queryKeys.templates(projectId) })
    },
  })
}

export function useStates(slug, projectId) {
  return useQuery({
    queryKey: queryKeys.states(projectId),
    queryFn: () => statesApi.list(slug, projectId),
    enabled: Boolean(slug && projectId),
    staleTime: 5 * 60_000,
  })
}

/**
 * Al cambiar un estado, los issues muestran su nombre y color: también se refrescan. Las plantillas también
 * (el estado por defecto de una plantilla se quita si se borra el estado).
 */
function useStateMutation(slug, projectId, mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.states(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.issuesOf(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.templates(projectId) })
    },
  })
}

export const useCreateState = (slug, projectId) =>
  useStateMutation(slug, projectId, (body) => statesApi.create(slug, projectId, body))

export const useUpdateState = (slug, projectId) =>
  useStateMutation(slug, projectId, ({ stateId, ...body }) => statesApi.update(slug, projectId, stateId, body))

export const useDeleteState = (slug, projectId) =>
  useStateMutation(slug, projectId, (stateId) => statesApi.remove(slug, projectId, stateId))

export function useLabels(slug, projectId) {
  return useQuery({
    queryKey: queryKeys.labels(projectId),
    queryFn: () => labelsApi.list(slug, projectId),
    enabled: Boolean(slug && projectId),
    staleTime: 5 * 60_000,
  })
}

function useLabelMutation(slug, projectId, mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.labels(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.issuesOf(projectId) })
    },
  })
}

export const useCreateLabel = (slug, projectId) =>
  useLabelMutation(slug, projectId, (body) => labelsApi.create(slug, projectId, body))

export const useUpdateLabel = (slug, projectId) =>
  useLabelMutation(slug, projectId, ({ labelId, ...body }) => labelsApi.update(slug, projectId, labelId, body))

export const useDeleteLabel = (slug, projectId) =>
  useLabelMutation(slug, projectId, (labelId) => labelsApi.remove(slug, projectId, labelId))
