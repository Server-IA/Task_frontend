import { useMatches } from 'react-router'

/**
 * Parámetros de la ruta más profunda que coincide (slug, projectId, issueId…).
 * A diferencia de useParams, funciona también en layouts padres como la sidebar.
 */
export function useRouteParams() {
  const matches = useMatches()
  return matches[matches.length - 1]?.params ?? {}
}
