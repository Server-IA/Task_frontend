import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { templatesApi } from './api'

export function useTemplates(slug, projectId, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.templates(projectId),
    queryFn: () => templatesApi.list(slug, projectId),
    enabled: Boolean(slug && projectId) && enabled,
    staleTime: 60_000,
  })
}

/**
 * La respuesta se pone en la lista en caché antes de recargarla (así la plantilla recién creada
 * o editada se ve enseguida en su lugar).
 */
function useTemplateMutation(projectId, mutationFn, mergeIntoList) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (result, variables) => {
      if (mergeIntoList) {
        queryClient.setQueryData(queryKeys.templates(projectId), (list) => (list ? mergeIntoList(list, result, variables) : list))
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.templates(projectId) })
    },
  })
}

export const useCreateTemplate = (slug, projectId) =>
  useTemplateMutation(
    projectId,
    (body) => templatesApi.create(slug, projectId, body),
    (list, created) => [...list, created],
  )

/** `mutate({ templateId, ...cambios })` */
export const useUpdateTemplate = (slug, projectId) =>
  useTemplateMutation(
    projectId,
    ({ templateId, ...body }) => templatesApi.update(slug, projectId, templateId, body),
    (list, updated, { position }) => {
      const others = list.filter((template) => template.id !== updated.id)
      if (position == null) return list.map((template) => (template.id === updated.id ? updated : template))
      others.splice(position, 0, updated)
      return others
    },
  )

export const useDeleteTemplate = (slug, projectId) =>
  useTemplateMutation(
    projectId,
    (templateId) => templatesApi.remove(slug, projectId, templateId),
    (list, _result, templateId) => list.filter((template) => template.id !== templateId),
  )
