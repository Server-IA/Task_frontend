import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Settings, Search } from 'lucide-react';
import { toast } from 'sonner';
import { tiposProyectoService } from '../../shared/services';
import { getErrorMessage } from '../../shared/lib/errorUtils';
import FormTipoProyecto from './FormTipoProyecto';

export default function TipoProyecto() {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try {
      const t = await tiposProyectoService.getAll();
      setTipos(t);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al cargar los tipos de proyecto'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (tipo) => {
    if (!confirm(`¿Eliminar "${tipo.nombre}"?`)) return;
    try {
      await tiposProyectoService.delete(tipo.id);
      toast.success('Tipo eliminado');
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al eliminar el tipo de proyecto'));
    }
  };

  const handleSave = async (data) => {
    try {
      if (editItem) {
        await tiposProyectoService.update(editItem.id, data);
        toast.success('Tipo actualizado');
      } else {
        await tiposProyectoService.create(data);
        toast.success('Tipo creado');
      }
      setFormOpen(false);
      setEditItem(null);
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al guardar el tipo de proyecto'));
    }
  };

  const filtered = tipos.filter((t) => t.nombre?.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Tipos de Proyecto</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{tipos.length} tipos configurados</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setFormOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Tipo
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar tipo..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((tipo) => (
            <motion.div
              key={tipo.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: (tipo.color || '#8b5cf6') + '20' }}
                  >
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tipo.color || '#8b5cf6' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white">{tipo.nombre}</h3>
                    {tipo.descripcion && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{tipo.descripcion}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditItem(tipo); setFormOpen(true); }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tipo)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Settings className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">No se encontraron tipos</p>
        </div>
      )}

      <AnimatePresence>
        {formOpen && (
          <FormTipoProyecto
            onClose={() => { setFormOpen(false); setEditItem(null); }}
            onSave={handleSave}
            initialData={editItem}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
