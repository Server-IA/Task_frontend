/**
 * @file mockData.js
 * @description Datos simulados para visualización del frontend sin backend
 * Estos datos serán reemplazados por llamadas al API cuando esté disponible
 */

// ==================== ESTADOS ====================
export const mockEstados = [
  { id: 1, nombre: 'Activo', descripcion: 'Estado activo' },
  { id: 2, nombre: 'Inactivo', descripcion: 'Estado inactivo' },
  { id: 3, nombre: 'En Proceso', descripcion: 'En proceso de desarrollo' },
  { id: 4, nombre: 'Completado', descripcion: 'Proyecto completado' },
  { id: 5, nombre: 'Pausado', descripcion: 'Temporalmente pausado' },
];

// ==================== EMPRESAS ====================
export const mockEmpresas = [
  { 
    id: 1, 
    nombre: 'TechCorp S.A.', 
    descripcion: 'Empresa de tecnología',
    correo: 'contacto@techcorp.com',
    estadoId: 1 
  },
  { 
    id: 2, 
    nombre: 'Innovate Solutions', 
    descripcion: 'Soluciones innovadoras',
    correo: 'info@innovate.com',
    estadoId: 1 
  },
  { 
    id: 3, 
    nombre: 'Digital Dynamics', 
    descripcion: 'Transformación digital',
    correo: 'hello@digitaldynamics.com',
    estadoId: 1 
  },
  { 
    id: 4, 
    nombre: 'CloudSystems Inc', 
    descripcion: 'Sistemas en la nube',
    correo: 'support@cloudsystems.com',
    estadoId: 2 
  },
];

// ==================== TIPOS DE PROYECTO ====================
export const mockTiposProyecto = [
  { id: 1, nombre: 'Software', descripcion: 'Desarrollo de software', estadoId: 1 },
  { id: 2, nombre: 'Hardware', descripcion: 'Desarrollo de hardware', estadoId: 1 },
  { id: 3, nombre: 'Infraestructura', descripcion: 'Proyectos de infraestructura', estadoId: 1 },
  { id: 4, nombre: 'Consultoría', descripcion: 'Servicios de consultoría', estadoId: 1 },
  { id: 5, nombre: 'Investigación', descripcion: 'Proyectos de I+D', estadoId: 2 },
];

// ==================== FASES ====================
export const mockFases = [
  { id: 1, nombre: 'Análisis', descripcion: 'Fase de análisis de requisitos', estadoId: 1 },
  { id: 2, nombre: 'Diseño', descripcion: 'Fase de diseño', estadoId: 1 },
  { id: 3, nombre: 'Desarrollo', descripcion: 'Fase de desarrollo', estadoId: 1 },
  { id: 4, nombre: 'Pruebas', descripcion: 'Fase de testing', estadoId: 1 },
  { id: 5, nombre: 'Despliegue', descripcion: 'Fase de implementación', estadoId: 1 },
  { id: 6, nombre: 'Mantenimiento', descripcion: 'Fase de soporte', estadoId: 1 },
];

// ==================== SISTEMAS ====================
export const mockSistemas = [
  { id: 1, nombre: 'Sistema Core', descripcion: 'Sistema principal', estadoId: 1 },
  { id: 2, nombre: 'Sistema Gestión', descripcion: 'Sistema de gestión empresarial', estadoId: 1 },
  { id: 3, nombre: 'Sistema Reportes', descripcion: 'Generación de reportes', estadoId: 1 },
  { id: 4, nombre: 'Sistema Analytics', descripcion: 'Análisis de datos', estadoId: 1 },
];

// ==================== SUBSISTEMAS ====================
export const mockSubsistemas = [
  { id: 1, nombre: 'Módulo Usuarios', descripcion: 'Gestión de usuarios', sistemaId: 1, estadoId: 1 },
  { id: 2, nombre: 'Módulo Seguridad', descripcion: 'Control de acceso', sistemaId: 1, estadoId: 1 },
  { id: 3, nombre: 'Módulo Inventario', descripcion: 'Control de inventario', sistemaId: 2, estadoId: 1 },
  { id: 4, nombre: 'Módulo Ventas', descripcion: 'Gestión de ventas', sistemaId: 2, estadoId: 1 },
  { id: 5, nombre: 'Módulo Dashboard', descripcion: 'Tableros de control', sistemaId: 3, estadoId: 1 },
];

// ==================== RAMAS ====================
export const mockRamas = [
  { id: 1, nombre: 'main', descripcion: 'Rama principal' },
  { id: 2, nombre: 'development', descripcion: 'Rama de desarrollo' },
  { id: 3, nombre: 'staging', descripcion: 'Rama de staging' },
  { id: 4, nombre: 'feature/auth', descripcion: 'Rama de autenticación' },
  { id: 5, nombre: 'feature/dashboard', descripcion: 'Rama del dashboard' },
  { id: 6, nombre: 'hotfix/bug-123', descripcion: 'Corrección urgente' },
];

// ==================== PROYECTOS ====================
export const mockProyectos = [
  { 
    id: 1, 
    nombre: 'Sistema ERP', 
    descripcion: 'Sistema de planificación de recursos empresariales',
    tipoProyectoId: 1,
    empresaId: 1,
    estadoId: 3 
  },
  { 
    id: 2, 
    nombre: 'App Móvil', 
    descripcion: 'Aplicación móvil multiplataforma',
    tipoProyectoId: 1,
    empresaId: 2,
    estadoId: 3 
  },
  { 
    id: 3, 
    nombre: 'Portal Web', 
    descripcion: 'Portal corporativo web',
    tipoProyectoId: 1,
    empresaId: 1,
    estadoId: 1 
  },
  { 
    id: 4, 
    nombre: 'Migración Cloud', 
    descripcion: 'Migración de infraestructura a la nube',
    tipoProyectoId: 3,
    empresaId: 3,
    estadoId: 3 
  },
  { 
    id: 5, 
    nombre: 'IoT Devices', 
    descripcion: 'Desarrollo de dispositivos IoT',
    tipoProyectoId: 2,
    empresaId: 4,
    estadoId: 2 
  },
];

/**
 * Función auxiliar para obtener nombre de una entidad por ID
 * @param {Array} array - Array de objetos
 * @param {number} id - ID a buscar
 * @returns {string} Nombre de la entidad o 'N/A'
 */
export const getNombreById = (array, id) => {
  const item = array.find(item => item.id === id);
  return item ? item.nombre : 'N/A';
};

/**
 * Simula un delay de red para hacer más realista la carga de datos
 * @param {number} ms - Milisegundos de delay
 * @returns {Promise}
 */
export const simulateDelay = (ms = 500) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

