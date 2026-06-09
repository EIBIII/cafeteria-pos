import { useState } from 'react';
import { Plus, Minus, Trash2, ShoppingCart, DollarSign, User, Mail, X } from 'lucide-react';
import { OrderItem } from '../types';

interface Props {
  orderItems: OrderItem[];
  onUpdateQuantity: (itemId: number, change: number) => void;
  onRemoveItem:     (itemId: number) => void;
  onClearOrder:     () => void;
  onCompleteOrder:  (customerName?: string, customerEmail?: string) => void;
}

export default function TicketPanel({ orderItems, onUpdateQuantity, onRemoveItem, onClearOrder, onCompleteOrder }: Props) {
  const [showModal,     setShowModal]     = useState(false);
  const [customerName,  setCustomerName]  = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const subtotal = orderItems.reduce((sum, i) => sum + i.subtotal * i.quantity, 0);
  const tax      = subtotal * 0.16;
  const total    = subtotal + tax;

  const handleConfirm = () => {
    onCompleteOrder(customerName.trim() || undefined, customerEmail.trim() || undefined);
    setShowModal(false);
    setCustomerName(''); setCustomerEmail('');
  };

  // Obtener todas las personalizaciones de un item como chips legibles
  const getChips = (item: OrderItem) => {
    const chips: { label: string; color: string }[] = [];
    const c = item as any;

    // Tamaño — usar nombre legible, ignorar si está vacío o es ID interno
    const sizeName = c.sizeName ?? '';
    if (sizeName && sizeName !== 'ninguno' && !sizeName.includes('_') && sizeName.length < 20) {
      chips.push({ label: sizeName, color: 'amber' });
    }

    // Leche — usar nombre legible, ignorar "ninguna"
    const milkName = c.milkName ?? '';
    if (milkName && milkName !== 'ninguna' && milkName !== 'Sin leche' && !milkName.includes('_') && milkName.length < 30) {
      chips.push({ label: milkName, color: 'blue' });
    }

    // Extras — usar nombres legibles
    const extrasNames: string[] = c.extrasNames ?? [];
    extrasNames.filter(Boolean).forEach(e => chips.push({ label: `+${e}`, color: 'green' }));

    // Modificadores dinámicos — clave tiene formato "nombre:COLOR:color"
    if (c.modifiersNames && Object.keys(c.modifiersNames).length > 0) {
      Object.entries(c.modifiersNames as Record<string, string[]>).forEach(([key, vals]) => {
        const parts       = key.split(':COLOR:');
        const groupName   = parts[0];
        const color       = parts[1] ?? 'violet';
        const cleanVals   = (vals ?? []).filter(Boolean);
        if (cleanVals.length > 0) {
          // Si solo hay un valor, mostrar solo el valor (no "Grupo: Valor")
          cleanVals.forEach(v => chips.push({ label: v, color }));
        }
      });
    }

    return chips;
  };

  const chipColors: Record<string, string> = {
    amber:  'bg-amber-100 text-amber-700',
    blue:   'bg-blue-100 text-blue-700',
    green:  'bg-green-100 text-green-700',
    violet: 'bg-violet-100 text-violet-700',
    rose:   'bg-rose-100 text-rose-700',
    cyan:   'bg-cyan-100 text-cyan-700',
    orange: 'bg-orange-100 text-orange-700',
    indigo: 'bg-indigo-100 text-indigo-700',
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-2.5 rounded-xl">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Ticket</h2>
              <p className="text-xs text-gray-500">{orderItems.length} producto(s)</p>
            </div>
          </div>
          {orderItems.length > 0 && (
            <button onClick={onClearOrder} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Items */}
        <div className="space-y-3 max-h-[calc(100vh-460px)] overflow-y-auto mb-5 pr-1">
          {orderItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ShoppingCart className="w-14 h-14 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No hay productos en el ticket</p>
              <p className="text-xs mt-1 text-gray-300">Selecciona del menú</p>
            </div>
          ) : orderItems.map(item => {
            const chips = getChips(item);
            return (
              <div key={item.id} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-sm">{item.product.name}</h3>
                    {chips.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {chips.map((chip, i) => (
                          <span key={i} className={`px-1.5 py-0.5 rounded-full text-xs ${chipColors[chip.color]}`}>
                            {chip.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => onRemoveItem(item.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-lg ml-2">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg">
                    <button onClick={() => onUpdateQuantity(item.id, -1)} className="p-1.5 hover:bg-gray-100 rounded-l-lg">
                      <Minus className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                    <span className="px-2.5 font-semibold text-gray-800 min-w-[1.5rem] text-center text-sm">{item.quantity}</span>
                    <button onClick={() => onUpdateQuantity(item.id, 1)} className="p-1.5 hover:bg-gray-100 rounded-r-lg">
                      <Plus className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">${item.subtotal} × {item.quantity}</p>
                    <p className="font-bold text-amber-600">${(item.subtotal * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        {orderItems.length > 0 && (
          <>
            <div className="border-t border-gray-100 pt-4 space-y-1.5 mb-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span><span className="font-medium text-gray-700">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>IVA (16%)</span><span className="font-medium text-gray-700">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-800 pt-2 border-t border-gray-100">
                <span>Total</span><span className="text-amber-600">${total.toFixed(2)}</span>
              </div>
            </div>
            <button onClick={() => setShowModal(true)}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3.5 rounded-xl font-bold text-base hover:from-green-600 hover:to-emerald-600 shadow-lg flex items-center justify-center gap-2">
              <DollarSign className="w-5 h-5" /> Completar Venta
            </button>
          </>
        )}
      </div>

      {/* Modal cliente */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Datos del Cliente</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                <p className="text-sm text-amber-700 font-medium">Total a cobrar</p>
                <p className="text-3xl font-bold text-amber-800 mt-0.5">${total.toFixed(2)}</p>
                <p className="text-xs text-amber-600 mt-0.5">IVA incluido</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-gray-400" /> Nombre del cliente
                </label>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                  placeholder="Ej. Carlos Pérez" autoFocus
                  className="w-full border-2 border-gray-200 focus:border-amber-500 rounded-xl px-4 py-2.5 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-gray-400" /> Correo
                  <span className="text-gray-400 font-normal text-xs">(opcional — envía ticket)</span>
                </label>
                <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                  placeholder="cliente@email.com"
                  className="w-full border-2 border-gray-200 focus:border-amber-500 rounded-xl px-4 py-2.5 outline-none text-sm" />
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-medium text-sm">Cancelar</button>
              <button onClick={handleConfirm}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold text-sm shadow-md flex items-center justify-center gap-1.5">
                <DollarSign className="w-4 h-4" /> Confirmar Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}