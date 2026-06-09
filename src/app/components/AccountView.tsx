import React from 'react';
import { LogOut, User, Clock, ShoppingBag, Mail, Phone, Shield, Coffee } from 'lucide-react';
import { User as UserType, Sale } from '../types';

interface AccountViewProps {
  currentUser: UserType;
  loginTime: Date;
  sales: Sale[];
  onLogout: () => void;
}

const roleGradients: Record<string, string> = {
  admin:   'from-amber-600 to-amber-800',
  cashier: 'from-emerald-600 to-emerald-800',
  waiter:  'from-blue-600 to-blue-800',
};

function formatDuration(start: Date): string {
  const diff = Math.floor((Date.now() - start.getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${h > 0 ? `${h}h ` : ''}${m}m ${s}s`;
}

function ShiftDuration({ loginTime }: { loginTime: Date }) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  return <p className="text-2xl font-bold text-amber-700">{formatDuration(loginTime)}</p>;
}

export default function AccountView({ currentUser, loginTime, sales, onLogout }: AccountViewProps) {
  const initials    = currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const gradient    = roleGradients[currentUser.role] ?? 'from-gray-600 to-gray-800';
  const today       = new Date().toDateString();
  const todaySales  = sales.filter(s => s.userId === currentUser.id && new Date(s.date).toDateString() === today);
  const todayRev    = todaySales.reduce((sum, s) => sum + s.total, 0);
  const allSales    = sales.filter(s => s.userId === currentUser.id);
  const totalRev    = allSales.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="container mx-auto px-6 py-8 max-w-3xl">
      {/* Profile */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className={`h-28 bg-gradient-to-r ${gradient}`} />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className={`bg-gradient-to-br ${gradient} w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl border-4 border-white`}>
              <span className="text-white font-bold text-2xl">{initials}</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r ${gradient} text-white shadow`}>
              {currentUser.role}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">{currentUser.name}</h2>
          <p className="text-gray-500 text-sm mb-4">ID: #{String(currentUser.id).padStart(4, '0')}</p>
          <div className="grid grid-cols-2 gap-3">
            {currentUser.email
              ? <div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="w-4 h-4 text-gray-400" /><span className="truncate">{currentUser.email}</span></div>
              : <div className="flex items-center gap-2 text-sm text-gray-400"><Mail className="w-4 h-4" /><span>Sin email</span></div>}
            {currentUser.phone
              ? <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-4 h-4 text-gray-400" /><span>{currentUser.phone}</span></div>
              : <div className="flex items-center gap-2 text-sm text-gray-400"><Phone className="w-4 h-4" /><span>Sin teléfono</span></div>}
          </div>
        </div>
      </div>

      {/* Turno actual */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-600 p-2.5 rounded-xl"><Clock className="w-5 h-5 text-white" /></div>
            <div>
              <h3 className="font-bold text-gray-800">Turno Actual</h3>
              <p className="text-sm text-amber-700">En curso</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Inicio</p>
            <p className="font-semibold text-gray-700">{loginTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-amber-200">
          <div className="text-center"><p className="text-2xl font-bold text-amber-700">{todaySales.length}</p><p className="text-xs text-gray-500 mt-0.5">Ventas hoy</p></div>
          <div className="text-center border-x border-amber-200"><p className="text-2xl font-bold text-amber-700">${todayRev.toFixed(0)}</p><p className="text-xs text-gray-500 mt-0.5">Ingresos hoy</p></div>
          <div className="text-center"><ShiftDuration loginTime={loginTime} /><p className="text-xs text-gray-500 mt-0.5">Tiempo activo</p></div>
        </div>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
          <ShoppingBag className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <p className="text-3xl font-bold text-gray-800">{allSales.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Ventas totales</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-emerald-700 font-bold text-sm">$</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">${totalRev.toFixed(0)}</p>
          <p className="text-sm text-gray-500 mt-0.5">Ingresos totales</p>
        </div>
      </div>

      {/* Logout */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-gray-800 mb-1">Cerrar Turno</h3>
        <p className="text-sm text-gray-500 mb-4">Al cerrar tu turno, la sesión se cerrará y otro usuario podrá iniciar el suyo.</p>
        <button onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 border-2 border-red-200 text-red-600 hover:text-red-700 py-3.5 rounded-xl font-semibold transition-all">
          <LogOut className="w-5 h-5" /> Cerrar Turno y Salir
        </button>
      </div>
    </div>
  );
}
