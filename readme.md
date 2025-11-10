# Task Manager Frontend

Frontend visual desarrollado en React + Vite + Tailwind CSS.

## Instalación

```bash
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Estructura del Proyecto

```
src/
├── modules/           Módulos por entidad del sistema
│   ├── proyectos/    Gestión de proyectos (Form, Grid, Componente)
│   ├── empresas/     Gestión de empresas
│   ├── estados/      Gestión de estados
│   ├── tipoProyecto/ Gestión de tipos de proyecto
│   ├── fases/        Gestión de fases
│   ├── sistemas/     Gestión de sistemas
│   ├── subsistemas/  Gestión de subsistemas
│   └── ramas/        Gestión de ramas
│
├── shared/           Código compartido entre módulos
│   ├── generic/      Componentes genéricos reutilizables
│   │   ├── GenericGrid.jsx  Tabla con paginación
│   │   └── GenericForm.jsx  Formulario modal
│   └── config/       Configuración y datos
│       ├── axiosConfig.js   Configuración de Axios
│       └── mockData.js      Datos simulados
│
├── layout/           Layout principal
│   └── Layout.jsx    Layout con sidebar y header
│
├── pages/            Páginas de la aplicación
│   └── Dashboard.jsx Dashboard principal con estadísticas
│
├── App.jsx           Componente raíz con rutas
├── main.jsx          Punto de entrada de la aplicación
└── index.css         Estilos globales (Tailwind)
```

## Organización por Módulos

Cada módulo en `modules/` representa una entidad del sistema y contiene tres archivos:

- `[Entidad].jsx` - Componente principal con la lógica y estado
- `Grid[Entidad].jsx` - Tabla de visualización de datos
- `Form[Entidad].jsx` - Formulario de creación/edición

Ejemplo del módulo `proyectos/`:
```
modules/proyectos/
├── Proyectos.jsx       Lógica principal, manejo de estado, CRUD
├── GridProyectos.jsx   Configuración de columnas y tabla
└── FormProyectos.jsx   Configuración de campos del formulario
```

## Componentes Compartidos

### GenericGrid
Tabla reutilizable con paginación automática. Se configura mediante props:
- `data` - Array de datos a mostrar
- `columns` - Definición de columnas
- `onRowSelect` - Callback de selección

### GenericForm
Formulario modal configurable. Se configura mediante props:
- `fields` - Definición de campos
- `initialData` - Datos iniciales para edición
- `onSubmit` - Callback al guardar
- `mode` - 'create' o 'edit'

## Datos Mock

El proyecto usa datos simulados ubicados en `src/shared/utils/mockData.js`. Estos datos se utilizan mientras no hay backend conectado.

## Conexión con Backend

Para conectar con un backend en el futuro:

1. Configurar la URL del API en un archivo `.env`:
```env
VITE_API_URL=http://localhost:8080/api
```

2. Reemplazar las funciones mock por llamadas a Axios en cada módulo.

La configuración de Axios ya está lista en `src/shared/config/axiosConfig.js`.

## Scripts

```bash
npm run dev      # Desarrollo
npm run build    # Build de producción
npm run preview  # Preview del build
npm run lint     # Linting del código
```

## Tecnologías

- React 19
- Vite
- Tailwind CSS
- React Router DOM
- Axios
- PropTypes
