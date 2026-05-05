import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, UserPlus, User, Phone, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage, getFieldErrors } from '@/shared/lib/errorUtils';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    apodo: '',
    email: '',
    password: '',
    confirmPassword: '',
    telefono: '',
  });

  const passwordRequirements = [
    { label: 'Entre 8 y 128 caracteres, sin espacios', test: (p) => p.length >= 8 && p.length <= 128 && !/\s/.test(p) },
    { label: 'Una mayúscula', test: (p) => /[A-Z]/.test(p) },
    { label: 'Una minúscula', test: (p) => /[a-z]/.test(p) },
    { label: 'Un número', test: (p) => /[0-9]/.test(p) },
    { label: 'Un símbolo (no letra ni número; p. ej. . @ #)', test: (p) => /[^A-Za-z0-9]/.test(p) },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === 'telefono' ? value.replace(/\D/g, '') : value;
    setForm({ ...form, [name]: newValue });
    if (fieldErrors[name]) {
      setFieldErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
    }
    if (generalError) setGeneralError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError('');

    const localErrors = {};

    if (!form.nombre.trim()) localErrors.nombre = 'El nombre es obligatorio';
    if (!form.apellido.trim()) localErrors.apellido = 'El apellido es obligatorio';
    if (!form.email.trim()) localErrors.email = 'El correo electrónico es obligatorio';

    if (form.password !== form.confirmPassword) {
      localErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    const allValid = passwordRequirements.every((r) => r.test(form.password));
    if (!allValid) {
      localErrors.password = 'La contraseña no cumple todos los requisitos';
    }

    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ...registroData } = form;
      const data = await register(registroData);
      if (data?.correoEnviado === false) {
        toast.warning(data?.mensaje || 'Cuenta creada, pero no se pudo enviar el correo de verificación.');
      } else {
        toast.success('¡Registro exitoso! Revisa tu correo para verificar tu cuenta.');
      }
      navigate('/login');
    } catch (error) {
      const serverFieldErrors = getFieldErrors(error);
      if (serverFieldErrors) {
        setFieldErrors(serverFieldErrors);
      }
      setGeneralError(getErrorMessage(error, 'Error al registrarse'));
    } finally {
      setLoading(false);
    }
  };

  const FieldError = ({ name }) => {
    const msg = fieldErrors[name];
    if (!msg) return null;
    return (
      <motion.p
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-1 text-xs text-red-400 flex items-center gap-1"
      >
        <AlertTriangle className="w-3 h-3" />
        {msg}
      </motion.p>
    );
  };

  const inputBorder = (name) =>
    fieldErrors[name]
      ? 'border-red-500/50 focus:ring-red-500'
      : 'border-white/10 focus:ring-blue-500';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 mb-4"
          >
            <UserPlus className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white">Crear cuenta</h1>
          <p className="text-slate-400 mt-2">Regístrate para comenzar a gestionar tus proyectos</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <AnimatePresence>
            {generalError && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="rounded-xl border border-red-500/30 bg-red-500/10 p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300 font-medium">{generalError}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    name="nombre"
                    required
                    value={form.nombre}
                    onChange={handleChange}
                    className={`w-full pl-11 pr-4 py-3 bg-white/5 border ${inputBorder('nombre')} rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all`}
                    placeholder="Juan"
                  />
                </div>
                <FieldError name="nombre" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Apellido *</label>
                <input
                  name="apellido"
                  required
                  value={form.apellido}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-white/5 border ${inputBorder('apellido')} rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all`}
                  placeholder="Pérez"
                />
                <FieldError name="apellido" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Apodo</label>
                <input
                  name="apodo"
                  value={form.apodo}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-white/5 border ${inputBorder('apodo')} rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all`}
                  placeholder="juanp"
                />
                <FieldError name="apodo" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                    inputMode="numeric"
                    className={`w-full pl-11 pr-4 py-3 bg-white/5 border ${inputBorder('telefono')} rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all`}
                    placeholder="3001234567"
                  />
                </div>
                <FieldError name="telefono" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Correo electrónico *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-4 py-3 bg-white/5 border ${inputBorder('email')} rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all`}
                  placeholder="tu@email.com"
                />
              </div>
              <FieldError name="email" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-12 py-3 bg-white/5 border ${inputBorder('password')} rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all`}
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <FieldError name="password" />
              {form.password && (
                <div className="mt-2 space-y-1">
                  {passwordRequirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className={`w-1.5 h-1.5 rounded-full ${req.test(form.password) ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                      <span className={req.test(form.password) ? 'text-emerald-400' : 'text-slate-500'}>{req.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirmar contraseña *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-4 py-3 bg-white/5 border ${inputBorder('confirmPassword')} rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all`}
                  placeholder="********"
                />
              </div>
              <FieldError name="confirmPassword" />
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Crear Cuenta
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
