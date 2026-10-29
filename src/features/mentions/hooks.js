import { useMemo } from 'react'
import { useProjectMembers } from '@/features/projects/hooks'
import { useMembers } from '@/features/workspaces/hooks'

/**
 * Personas que se pueden mencionar en un proyecto (las que reciben el aviso): sus miembros y los project managers
 * del workspace. Cada una con su rol en el workspace, ordenadas por nombre.
 * @returns {(import('@/api/types').UserSummary & { role: 'OWNER' | 'MEMBER' })[]}
 */
export function useMentionPeople(slug, projectId) {
  const { data: projectMembers } = useProjectMembers(slug, projectId)
  const { data: workspaceMembers } = useMembers(slug)

  return useMemo(() => {
    const roles = new Map((workspaceMembers ?? []).map((member) => [member.user.id, member.role]))
    const people = new Map()
    for (const member of workspaceMembers ?? []) {
      if (member.role === 'OWNER') people.set(member.user.id, { ...member.user, role: 'OWNER' })
    }
    for (const member of projectMembers ?? []) {
      if (!people.has(member.user.id)) people.set(member.user.id, { ...member.user, role: roles.get(member.user.id) ?? 'MEMBER' })
    }
    return [...people.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'))
  }, [projectMembers, workspaceMembers])
}
