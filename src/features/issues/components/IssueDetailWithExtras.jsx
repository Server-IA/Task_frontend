import { IssueDetail } from './IssueDetail'

/**
 * IssueDetail con las secciones de otras features (comentarios, historial, ciclo y módulos).
 * Se mantiene aparte para que IssueDetail no dependa de esas features.
 */
export function IssueDetailWithExtras(props) {
  return <IssueDetail {...props} />
}
