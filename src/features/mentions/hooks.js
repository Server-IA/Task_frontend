import { useMemo, useState } from 'react'
import { useProjectMembers } from '@/features/projects/hooks'
import { useMembers } from '@/features/workspaces/hooks'
import { toEditable, toStored } from './mentions'

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

/**
 * Borrador de un comentario con menciones: `text` es lo que se ve («@Ana Gómez») y `mentions` las personas elegidas
 * de la lista; `toBody()` arma el cuerpo con los tokens para guardar.
 * @param {string} [initialBody] cuerpo guardado (al editar un comentario)
 */
export function useMentionDraft(initialBody = '') {
  const [draft, setDraft] = useState(() => toEditable(initialBody))
  return {
    text: draft.text,
    mentions: draft.mentions,
    setText: (text) => setDraft((current) => ({ ...current, text })),
    /** Texto nuevo tras elegir a alguien de la lista. */
    addMention: (text, mention) => setDraft((current) => ({ text, mentions: [...current.mentions, mention] })),
    reset: (body = '') => setDraft(toEditable(body)),
    toBody: () => toStored(draft.text, draft.mentions),
  }
}
