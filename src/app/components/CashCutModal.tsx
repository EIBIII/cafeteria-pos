import { useState, useMemo } from 'react';
import { X, DollarSign, AlertTriangle, CheckCircle, TrendingUp, ShoppingCart, Clock } from 'lucide-react';
import { User, Sale, CashCut } from '../types';

interface CashCutModalProps {
  currentUser: User;
  loginTime: Date;
  sales: Sale[];
  onConfirm: (cut: CashCut) => void;
  onCancel: () => void;
}

export default function CashCutModal({ currentUser, loginTime, sales, onConfirm, onCancel }: CashCutModalProps) {
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'form' | 'confirm'>('form');

  // Ventas del turno actual (desde loginTime hasta ahora)
  const shiftSales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = new Date(s.date);
      return s.userId === currentUser.id && saleDate >= loginTime;
    });
  }, [sales, currentUser.id, loginTime]);

  const totalSales = shiftSales.reduce((sum, s) => sum + s.total, 0);
  const expectedCash = totalSales; // En un sistema real se descuenta lo de tarjeta, etc.

  const actual = parseFloat(actualCash) || 0;
  const difference = actual - expectedCash;
  const isShort = difference < 0;
  const isOver = difference > 0;

  const shiftDuration = () => {
    const diff = Math.floor((Date.now() - loginTime.getTime()) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m} minutos`;
  };

  const handleConfirm = () => {
    const cut: CashCut = {
      id: Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      date: new Date().toISOString(),
      loginTime: loginTime.toISOString(),
      salesCount: shiftSales.length,
      totalSales,
      expectedCash,
      actualCash: actual,
      difference,
      notes: notes.trim(),
    };
    onConfirm(cut);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-amber-600 to-amber-800 p-2.5 rounded-xl">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Corte de Caja</h3>
              <p className="text-sm text-gray-500">Registra tu corte antes de cerrar sesión</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {step === 'form' ? (
          <div className="p-6 space-y-5">
            {/* Resumen del turno */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5">
              <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" /> Resumen del Turno
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-700">{shiftSales.length}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Órdenes</p>
                </div>
                <div className="text-center border-x border-amber-200">
                  <p className="text-2xl font-bold text-amber-700">${totalSales.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Total vendido</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-700">{shiftDuration()}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Duración</p>
                </div>
              </div>
            </div>

            {/* Efectivo esperado */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Efectivo esperado en caja</span>
              </div>
              <span className="text-lg font-bold text-gray-800">${expectedCash.toFixed(2)}</span>
            </div>

            {/* Efectivo real */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Efectivo contado en caja *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={actualCash}
                  onChange={e => setActualCash(e.target.value)}
                  placeholder="0.00"
                  className="w-full border-2 border-gray-200 focus:border-amber-500 rounded-xl pl-8 pr-4 py-3 outline-none transition-colors text-lg font-semibold"
                />
              </div>
            </div>

            {/* Diferencia en tiempo real */}
            {actualCash !== '' && (
              <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                isShort ? 'bg-red-50 border-red-200' :
                isOver  ? 'bg-blue-50 border-blue-200' :
                'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex items-center gap-2">
                  {isShort ? <AlertTriangle className="w-4 h-4 text-red-500" /> :
                   isOver  ? <TrendingUp className="w-4 h-4 text-blue-500" /> :
                   <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  <span className={`text-sm font-semibold ${isShort ? 'text-red-700' : isOver ? 'text-blue-700' : 'text-emerald-700'}`}>
                    {isShort ? 'Faltante' : isOver ? 'Sobrante' : 'Cuadrado exacto'}
                  </span>
                </div>
                <span className={`text-lg font-bold ${isShort ? 'text-red-700' : isOver ? 'text-blue-700' : 'text-emerald-700'}`}>
                  {isShort ? '-' : isOver ? '+' : ''}${Math.abs(difference).toFixed(2)}
                </span>
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Observaciones <span className="text-gray-400 font-normal">(opcional)</span></label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Ej. Se rompió una taza, devolucion de $50..."
                className="w-full border-2 border-gray-200 focus:border-amber-500 rounded-xl px-4 py-2.5 outline-none transition-colors resize-none text-sm"
              />
            </div>

            {/* Aviso */}
            <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-xl">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
              <p>Este corte quedará registrado. Después de confirmarlo, la sesión se cerrará automáticamente.</p>
            </div>

            {/* Acciones */}
            <div className="flex gap-3">
              <button onClick={onCancel} className="flex-1 px-5 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={actualCash === '' || isNaN(parseFloat(actualCash))}
                className="flex-1 px-5 py-3 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-md transition-all"
              >
                Revisar Corte →
              </button>
            </div>
          </div>
        ) : (
          /* ── Paso de confirmación ── */
          <div className="p-6 space-y-5">
            <div className="text-center py-2">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                isShort ? 'bg-red-100' : isOver ? 'bg-blue-100' : 'bg-emerald-100'
              }`}>
                {isShort ? <AlertTriangle className="w-8 h-8 text-red-500" /> :
                 isOver  ? <TrendingUp className="w-8 h-8 text-blue-500" /> :
                 <CheckCircle className="w-8 h-8 text-emerald-500" />}
              </div>
              <h4 className="text-xl font-bold text-gray-800">Confirmar Corte</h4>
              <p className="text-gray-500 text-sm mt-1">Revisa los datos antes de cerrar</p>
            </div>

            <div className="bg-gray-50 rounded-2xl border border-gray-200 divide-y divide-gray-200">
              <Row label="Usuario" value={currentUser.name} />
              <Row label="Inicio de turno" value={loginTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} />
              <Row label="Fecha" value={new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} />
              <Row label="Órdenes procesadas" value={`${shiftSales.length} ventas`} />
              <Row label="Total vendido" value={`$${totalSales.toFixed(2)}`} />
              <Row label="Efectivo esperado" value={`$${expectedCash.toFixed(2)}`} />
              <Row
                label="Efectivo contado"
                value={`$${actual.toFixed(2)}`}
                valueClass="font-bold text-gray-800"
              />
              <Row
                label={isShort ? 'Faltante' : isOver ? 'Sobrante' : 'Diferencia'}
                value={`${isShort ? '-' : isOver ? '+' : ''}$${Math.abs(difference).toFixed(2)}`}
                valueClass={isShort ? 'font-bold text-red-600' : isOver ? 'font-bold text-blue-600' : 'font-bold text-emerald-600'}
              />
              {notes && <Row label="Notas" value={notes} />}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('form')} className="flex-1 px-5 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors">
                ← Editar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-5 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl font-semibold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Confirmar y Salir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, valueClass = 'text-gray-700' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm ${valueClass}`}>{value}</span>
    </div>
  );
}
