import { useState } from 'react';
import { Coffee, Eye, EyeOff, LogIn, Lock, Mail } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<string | null>;
}

export default function Login({ onLogin }: LoginProps) {
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    const err = await onLogin(email.trim(), password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-amber-900 via-amber-800 to-orange-900 flex-col items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 text-center">
          <div className="bg-white/10 backdrop-blur-sm w-28 h-28 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <Coffee className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">Café TecNM</h1>
          <p className="text-2xl text-amber-200 font-light mb-2">León</p>
          <div className="w-16 h-0.5 bg-amber-300/50 mx-auto my-6" />
          <p className="text-amber-100/80 text-lg leading-relaxed max-w-sm">
            Sistema de Punto de Venta Integral para una gestión eficiente y profesional.
          </p>
        </div>
        <div className="absolute bottom-8 text-center">
          <p className="text-amber-200/50 text-sm">Sistema POS v3.0 · {new Date().getFullYear()}</p>
        </div>
      </div>

      {/* Panel derecho - form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-amber-50 p-8">
        <div className="w-full max-w-md">
          {/* Logo móvil */}
          <div className="flex items-center justify-center gap-3 mb-10 lg:hidden">
            <div className="bg-amber-800 p-3 rounded-2xl"><Coffee className="w-8 h-8 text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-amber-900">Café TecNM León</h1>
              <p className="text-amber-600 text-sm">Sistema POS</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Iniciar Turno</h2>
            <p className="text-gray-500">Ingresa tus credenciales para continuar</p>
          </div>

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-gray-400" /> Correo electrónico
              </label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="correo@tecnm.mx" autoFocus
                className="w-full border-2 border-gray-200 focus:border-amber-500 rounded-xl px-4 py-3.5 outline-none transition-colors text-gray-800" />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-gray-400" /> Contraseña
              </label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="••••••••"
                  className="w-full border-2 border-gray-200 focus:border-amber-500 rounded-xl px-4 py-3.5 pr-12 outline-none transition-colors text-gray-800" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>}

            <button onClick={handleSubmit} disabled={!email.trim() || !password || loading}
              className="w-full bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
              <LogIn className="w-5 h-5" />
              {loading ? 'Verificando...' : 'Iniciar Turno'}
            </button>
          </div>

         
        </div>
      </div>
    </div>
  );
}
