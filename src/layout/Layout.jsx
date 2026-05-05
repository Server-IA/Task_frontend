import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FolderKanban,
  Building2,
  ListChecks,
  Settings,
  ChevronLeft,
  Menu,
  Moon,
  Sun,
  LogOut,
  User,
  Layers,
  X,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/empresas', label: 'Empresas', icon: Building2 },
  { path: '/proyectos', label: 'Proyectos', icon: FolderKanban },
  { path: '/tareas', label: 'Tareas', icon: ListChecks },
  { path: '/estados', label: 'Estados', icon: Layers },
  { path: '/tipo-proyecto', label: 'Tipos de Proyecto', icon: Settings },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { darkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-200 dark:border-slate-700/50">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <FolderKanban className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-bold text-slate-800 dark:text-white text-lg whitespace-nowrap"
          >
            TaskManager
          </motion.span>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                active
                  ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/8 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : ''}`} />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 dark:border-white/5 p-3 space-y-1">
        <Link
          to="/perfil"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            location.pathname === '/perfil'
              ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/8'
          }`}
        >
          <User className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Perfil</span>}
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 transition-colors">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 z-50 w-[280px] h-screen bg-white dark:bg-slate-900/95 dark:backdrop-blur-xl shadow-2xl dark:border-r dark:border-white/5 lg:hidden"
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 left-0 z-30 h-screen bg-white dark:bg-slate-900/80 dark:backdrop-blur-xl border-r border-slate-200 dark:border-white/5 transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-full flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
        >
          <ChevronLeft className={`w-3.5 h-3.5 text-slate-600 dark:text-slate-300 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'}`}>
        {/* Header */}
        <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border-b border-slate-200 dark:border-white/5">
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                {navItems.find((i) => i.path === location.pathname)?.label || 'Task Manager'}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
              >
                {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
              </button>
              <Link
                to="/perfil"
                className="flex items-center gap-2 pl-3 pr-1 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:block">
                  {user?.nombre} {user?.apellido}
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                  {user?.nombre?.[0]}{user?.apellido?.[0]}
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
