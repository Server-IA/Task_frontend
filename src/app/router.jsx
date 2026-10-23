import { createBrowserRouter } from 'react-router'
import { NotFoundPage } from '@/pages/NotFoundPage'

function Placeholder() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-muted-foreground">TaskFlow — configuración inicial lista</p>
    </div>
  )
}

export const router = createBrowserRouter([
  { path: '/', element: <Placeholder /> },
  { path: '*', element: <NotFoundPage /> },
])
