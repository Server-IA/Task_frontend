import { createContext, useContext } from 'react'

/**
 * Si quien usa la app puede editar tareas en el proyecto abierto (permiso ISSUE_EDIT). Lo pone ProjectLayout y lo
 * leen las tarjetas del tablero y las filas de la lista para apagar sus selectores y el arrastre. Fuera de un
 * proyecto (o en una prueba) vale true: el backend valida igual.
 */
export const CanEditIssuesContext = createContext(true)

export const useCanEditIssues = () => useContext(CanEditIssuesContext)
