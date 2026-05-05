import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertTriangle, ShieldAlert, MailWarning, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage, getErrorCode, getErrorStatus } from '@/shared/lib/errorUtils';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorInfo(null);
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('¡Inicio de sesión exitoso!');
      navigate('/dashboard');
    } catch (error) {
      const code = getErrorCode(error);
      const status = getErrorStatus(error);
      const msg = getErrorMessage(error, 'Error al iniciar sesión');

      if (code === 'EMAIL_NOT_VERIFIED') {
        setErrorInfo({
          type: 'email-not-verified',
          message: msg,
          icon: MailWarning,
        });
      } else if (code === 'ACCOUNT_LOCKED') {
        setErrorInfo({
          type: 'account-locked',
          message: msg,
          icon: Clock,
        });
      } else if (code === 'BAD_CREDENTIALS' || status === 401) {
        setErrorInfo({
          type: 'bad-credentials',
          message: msg,
          icon: ShieldAlert,
        });
      } else if (!error.response) {
        setErrorInfo({
          type: 'network',
          message: msg,
          icon: AlertTriangle,
        });
      } else {
        setErrorInfo({
          type: 'generic',
          message: msg,
          icon: AlertTriangle,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const errorColors = {
    'email-not-verified': 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    'account-locked': 'border-red-500/30 bg-red-500/10 text-red-300',
    'bad-credentials': 'border-red-500/30 bg-red-500/10 text-red-300',
    'network': 'border-orange-500/30 bg-orange-500/10 text-orange-300',
    'generic': 'border-red-500/30 bg-red-500/10 text-red-300',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4"
          >
            <LogIn className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white">Task Manager</h1>
          <p className="text-slate-400 mt-2">Inicia sesión en tu cuenta</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <AnimatePresence mode="wait">
            {errorInfo && (
              <motion.div
                key="error"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className={`rounded-xl border p-4 ${errorColors[errorInfo.type]}`}
              >
                <div className="flex items-start gap-3">
                  <errorInfo.icon className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{errorInfo.message}</p>
                    {errorInfo.type === 'email-not-verified' && (
                      <Link
                        to="/verify-email"
                        className="inline-block mt-2 text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                      >
                        Reenviar correo de verificación
                      </Link>
                    )}
                    {errorInfo.type === 'bad-credentials' && (
                      <Link
                        to="/forgot-password"
                        className="inline-block mt-2 text-xs font-semibold text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors"
                      >
                        ¿Olvidaste tu contraseña?
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrorInfo(null); }}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="tucorreo@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrorInfo(null); }}
                  className="w-full pl-11 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
            </div>

            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Iniciar Sesión
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Regístrate
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
