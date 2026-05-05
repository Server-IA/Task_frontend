# Task Manager — Frontend

Interfaz web del sistema de gestión de tareas y proyectos. Construida con **React 19 + Vite + Tailwind CSS v4**.

---

## Tecnologías

| Librería | Versión | Uso |
|----------|---------|-----|
| React | 19 | UI y gestión de estado |
| Vite | 7 | Bundler y servidor de desarrollo |
| Tailwind CSS | 4 | Estilos utilitarios + dark mode |
| React Router | 7 | Navegación SPA |
| Framer Motion | 12 | Animaciones y transiciones |
| Axios | 1 | Cliente HTTP con interceptores JWT |
| Lucide React | última | Iconos |
| Sonner | última | Notificaciones toast |

---

## Requisitos previos

- Node.js 18+
- El backend corriendo en `http://localhost:8080` (o la URL que configures en `.env`)

---

## Instalación y ejecución

```bash
# 1. Clonar e instalar dependencias
npm install

# 2. Crear el archivo de entorno
cp .env.example .env
# Editar .env con la URL real del backend

# 3. Iniciar en modo desarrollo
npm run dev
```

La app queda disponible en `http://localhost:5173`.

### Otros comandos

```bash
npm run build    # Build de producción
npm run preview  # Previsualizar el build local
npm run lint     # Ejecutar ESLint
```

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_URL` | URL base del API (con `/api` al final) | `https://tu-servicio.up.railway.app/api` |

> En Vercel u otra plataforma de hosting, define la misma variable en el panel del proyecto.

---

## Estructura del proyecto

```
src/
├── App.jsx                  # Router principal (React Router 7 layout routes)
├── index.css                # Estilos globales + configuración Tailwind
├── main.jsx                 # Punto de entrada
│
├── context/
│   ├── AuthContext.jsx      # Autenticación global (login, logout, perfil)
│   └── ThemeContext.jsx     # Dark / Light mode con persistencia en localStorage
│
├── layout/
│   └── Layout.jsx           # Layout con sidebar colapsable, header y nav
│
├── modules/                 # Módulos de negocio (cada uno con lista + formulario)
│   ├── empresas/
│   ├── estados/
│   ├── proyectos/
│   ├── tareas/
│   └── tipoProyecto/
│
├── pages/
│   ├── auth/                # Login, Register, VerifyEmail, ForgotPassword, ResetPassword
│   ├── Dashboard.jsx        # Vista principal con estadísticas y resumen
│   └── Perfil.jsx           # Edición de perfil del usuario
│
└── shared/
    ├── components/          # Componentes reutilizables
    │   ├── index.js         # Barrel export
    │   ├── ColorPicker.jsx  # Selector de color con presets y input hex
    │   ├── ConfirmDialog.jsx# Diálogo de confirmación (reemplaza window.confirm)
    │   ├── DateInput.jsx    # Input de fecha con ícono y soporte dark mode
    │   ├── FieldError.jsx   # Mensaje de error inline animado
    │   ├── ProtectedRoute.jsx
    │   └── SelectField.jsx  # Dropdown personalizado (reemplaza <select> nativo)
    ├── config/
    │   └── axiosConfig.js   # Instancia Axios + interceptores JWT + refresh token
    ├── lib/
    │   ├── errorUtils.js    # Helpers para extraer mensajes de error de Axios
    │   └── formValidation.js# Helpers de validación (isEmpty, isValidEmail, etc.)
    └── services/            # Un archivo por entidad + barrel index.js
        ├── index.js
        ├── comentariosService.js
        ├── empresasService.js
        ├── estadosService.js
        ├── miembrosEmpresaService.js
        ├── miembrosProyectoService.js
        ├── proyectosService.js
        ├── tareasService.js
        ├── tiposProyectoService.js
        └── usuariosService.js
```

---

## Funcionalidades principales

- **Autenticación completa** — Login, registro, verificación por email, recuperación de contraseña, refresh token automático
- **Dashboard** — Estadísticas en tiempo real: proyectos, empresas, tareas y estados
- **Proyectos** — CRUD con tipo, empresa, fechas, prioridad y progreso. Solo se pueden eliminar proyectos en estado *Completado* (soft delete)
- **Tareas** — CRUD con proyecto, estado, prioridad y fecha límite. Detalle con sistema de comentarios. Solo se eliminan en estado *Completado*
- **Empresas** — CRUD con datos de contacto y ubicación
- **Estados y tipos de proyecto** — Configuración con nombre, descripción y color personalizado
- **Dark / Light mode** — Sincronizado globalmente, persiste entre sesiones
- **Formularios** — Validación inline con `FieldError`, sin validación nativa del navegador

---

## Path alias

El proyecto usa `@/` como alias para `src/`. Configurado en `vite.config.js` y `jsconfig.json` (para IntelliSense en el IDE).

```js
// En vez de esto:
import { SelectField } from '../../shared/components';

// Se usa esto:
import { SelectField } from '@/shared/components';
```

---

## Autenticación y JWT

El archivo `src/shared/config/axiosConfig.js` maneja automáticamente:

1. Adjuntar el token `Bearer` en cada petición
2. Renovar el access token con el refresh token cuando expira (401)
3. Redirigir a `/login` si el refresh falla

---

## Deploy

El proyecto está preparado para desplegarse en **Vercel**:

1. Conectar el repositorio en Vercel
2. Definir la variable de entorno `VITE_API_URL` en el panel del proyecto
3. Vercel detecta automáticamente Vite y ejecuta `npm run build`
