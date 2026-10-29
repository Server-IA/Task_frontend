import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

/**
 * Lee el `?token=` de la URL una sola vez y lo quita de la barra de direcciones
 * (así no queda en el historial, en capturas de pantalla ni en el Referer).
 * El token se conserva en el estado del componente.
 */
export function useUrlToken() {
  const [searchParams] = useSearchParams()
  const [token] = useState(() => searchParams.get('token'))
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (searchParams.has('token')) navigate(location.pathname, { replace: true })
  }, [searchParams, location.pathname, navigate])

  return token
}
