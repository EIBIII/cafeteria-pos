import { useState } from 'react';
import { Search, Receipt, Calendar, User, ChevronDown, ChevronUp } from 'lucide-react';
import { Sale, User as UserType } from '../types';

interface OrdersViewProps {
  sales: Sale[];
  currentUser: UserType;
}

export default function OrdersView({ sales, currentUser }: OrdersViewProps) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'all'>('today');

  const isAdmin = currentUser.role === 'admin';

  const filteredSales = sales.filter(sale => {
    // Role filter
    if (!isAdmin && sale.userId !== currentUser.id) return false;

    // Date filter
    const saleDate = new Date(sale.date);
    const now = new Date();
    if (dateFilter === 'today') {
      if (saleDate.toDateString() !== now.toDateString()) return false;
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      if (saleDate < weekAgo) return false;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        sale.customerName?.toLowerCase().includes(q) ||
        sale.userName.toLowerCase().includes(q) ||
        sale.items.some(i => i.product.name.toLowerCase().includes(q)) ||
        sale.id.toString().includes(q)
      );
    }
    return true;
  });

  const totalFiltered = filteredSales.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Mis Pedidos</h2>
          <p className="text-gray-500 mt-1">
            {isAdmin ? 'Todos los pedidos del sistema' : `Pedidos de ${currentUser.name}`}
          </p>
        </div>
        <div className="text-right bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <p className="text-sm text-amber-700 font-medium">{filteredSales.length} pedidos</p>
          <p className="text-xl font-bold text-amber-800">${totalFiltered.toFixed(2)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, producto, vendedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 focus:border-amber-500 rounded-xl outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(['today', 'week', 'all'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                dateFilter === filter
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-amber-300'
              }`}
            >
              {filter === 'today' ? 'Hoy' : filter === 'week' ? 'Esta semana' : 'Todo'}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      {filteredSales.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Receipt className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No se encontraron pedidos</p>
          <p className="text-gray-400 text-sm mt-1">Ajusta los filtros o realiza una venta</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSales.map(sale => {
            const isExpanded = expandedId === sale.id;
            const saleDate = new Date(sale.date);

            return (
              <div key={sale.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                {/* Summary row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="bg-amber-100 text-amber-800 font-mono text-xs font-bold px-2.5 py-1.5 rounded-lg flex-shrink-0">
                      #{sale.id.toString().slice(-4)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">
                        {sale.customerName || <span className="text-gray-400 italic">Sin nombre</span>}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {saleDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} {saleDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isAdmin && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {sale.userName}
                          </span>
                        )}
                        <span>{sale.items.length} producto(s)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-amber-700 text-lg">${sale.total.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">IVA incl.</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Productos</p>
                        <div className="space-y-2">
                          {sale.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                              <div>
                                <p className="text-sm font-medium text-gray-800">
                                  {item.quantity}× {item.product.name}
                                </p>
                                <div className="flex gap-1 flex-wrap mt-0.5">
                                  <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{item.size}</span>
                                  {item.milkType !== 'ninguna' && (
                                    <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{item.milkType}</span>
                                  )}
                                  {item.extras.map(e => (
                                    <span key={e} className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">+{e}</span>
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm font-bold text-gray-700">${(item.subtotal * item.quantity).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Resumen</p>
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Subtotal</span>
                            <span>${sale.subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>IVA (16%)</span>
                            <span>${sale.tax.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-base font-bold text-gray-800 pt-2 border-t border-gray-200">
                            <span>Total</span>
                            <span className="text-amber-700">${sale.total.toFixed(2)}</span>
                          </div>
                          {sale.customerEmail && (
                            <div className="pt-2 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-1">
                              ✉ Ticket enviado a {sale.customerEmail}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
