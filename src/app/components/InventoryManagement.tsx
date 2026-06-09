import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Save, X, Package, TrendingUp, AlertTriangle, Search } from 'lucide-react';
import { InventoryItem } from '../types';

interface Props { inventory: InventoryItem[]; onSave: (inventory: InventoryItem[]) => void; }

export default function InventoryManagement({ inventory, onSave }: Props) {
  const [editingItem,    setEditingItem]    = useState<InventoryItem | null>(null);
  const [isCreating,     setIsCreating]     = useState(false);
  const [restockingItem, setRestockingItem] = useState<InventoryItem | null>(null);
  const [restockAmount,  setRestockAmount]  = useState(0);

  // ── Filtros ──────────────────────────────────────────────────────────────
  const [search,     setSearch]     = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all'|'ok'|'low'|'critical'>('all');

  const [formData, setFormData] = useState<Partial<InventoryItem>>({ name: '', quantity: 0, unit: 'g', minStock: 100 });

  const getStockStatus = (item: InventoryItem) => {
    const min = item.minStock || 100;
    if (item.quantity <= min * 0.3) return { label: 'Crítico', color: 'red'    };
    if (item.quantity <= min)       return { label: 'Bajo',    color: 'yellow' };
    return                                 { label: 'Normal',  color: 'green'  };
  };

  const unitOptions = ['g', 'kg', 'mg', 'ml', 'l', 'pz', 'oz', 'lb', 'taza', 'cda', 'cdta'];
  const availableUnits = useMemo(() => [...new Set(inventory.map(i => i.unit))], [inventory]);

  const filtered = useMemo(() => inventory.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchUnit   = !filterUnit || item.unit === filterUnit;
    const status      = getStockStatus(item).color;
    const matchStatus = filterStatus === 'all' ||
      (filterStatus === 'critical' && status === 'red') ||
      (filterStatus === 'low'      && status === 'yellow') ||
      (filterStatus === 'ok'       && status === 'green');
    return matchSearch && matchUnit && matchStatus;
  }), [inventory, search, filterUnit, filterStatus]);

  const handleEdit   = (item: InventoryItem) => { setEditingItem(item); setFormData(item); setIsCreating(false); };
  const handleCreate = () => { setEditingItem(null); setFormData({ name: '', quantity: 0, unit: 'g', minStock: 100 }); setIsCreating(true); };
  const handleCancel = () => { setEditingItem(null); setIsCreating(false); };

  const handleSave = () => {
    if (!formData.name || formData.quantity === undefined) return;
    if (isCreating) {
      onSave([...inventory, { id: 0, name: formData.name!, quantity: formData.quantity!, unit: formData.unit || 'g', minStock: formData.minStock || 100, lastRestocked: new Date().toISOString() }]);
    } else if (editingItem) {
      onSave(inventory.map(i => i.id === editingItem.id ? { ...i, ...formData } : i));
    }
    setEditingItem(null); setIsCreating(false);
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Eliminar este insumo? Esto podría afectar recetas.'))
      onSave(inventory.filter(i => i.id !== id));
  };

  const confirmRestock = () => {
    if (restockingItem && restockAmount > 0) {
      onSave(inventory.map(i => i.id === restockingItem.id
        ? { ...i, quantity: i.quantity + restockAmount, lastRestocked: new Date().toISOString() } : i));
      setRestockingItem(null); setRestockAmount(0);
    }
  };

  const statsLow      = inventory.filter(i => { const s = getStockStatus(i); return s.color === 'yellow' || s.color === 'red'; }).length;
  const statsCritical = inventory.filter(i => getStockStatus(i).color === 'red').length;

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="bg-white rounded-2xl shadow-xl p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Gestión de Inventario</h2>
            <p className="text-gray-500 text-sm mt-1">Control de insumos y materias primas</p>
          </div>
          {!isCreating && !editingItem && (
            <button onClick={handleCreate}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg">
              <Plus className="w-5 h-5" /> Nuevo Insumo
            </button>
          )}
        </div>

        {/* Stats */}
        {!isCreating && !editingItem && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200 flex items-center gap-3">
              <div className="bg-green-500 p-3 rounded-xl"><Package className="w-5 h-5 text-white" /></div>
              <div><p className="text-xs text-gray-500">Total</p><p className="text-2xl font-bold text-gray-800">{inventory.length}</p></div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 border-2 border-yellow-200 flex items-center gap-3">
              <div className="bg-yellow-500 p-3 rounded-xl"><AlertTriangle className="w-5 h-5 text-white" /></div>
              <div><p className="text-xs text-gray-500">Stock Bajo</p><p className="text-2xl font-bold text-gray-800">{statsLow}</p></div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border-2 border-red-200 flex items-center gap-3">
              <div className="bg-red-500 p-3 rounded-xl"><TrendingUp className="w-5 h-5 text-white" /></div>
              <div><p className="text-xs text-gray-500">Crítico</p><p className="text-2xl font-bold text-gray-800">{statsCritical}</p></div>
            </div>
          </div>
        )}

        {/* ── Filtros ── */}
        {!isCreating && !editingItem && (
          <div className="flex flex-wrap gap-3 mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
            {/* Búsqueda */}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar insumo..."
                className="w-full pl-9 pr-4 py-2 border-2 border-gray-200 focus:border-blue-500 rounded-xl text-sm outline-none transition-colors" />
            </div>

            {/* Filtro unidad */}
            <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 focus:border-blue-500 rounded-xl text-sm outline-none transition-colors bg-white">
              <option value="">Todas las unidades</option>
              {availableUnits.map(u => <option key={u} value={u}>{u}</option>)}
            </select>

            {/* Filtro estado */}
            {(['all','ok','low','critical'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                  filterStatus === s
                    ? s === 'all'      ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : s === 'ok'       ? 'border-green-500 bg-green-50 text-green-700'
                    : s === 'low'      ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                    :                   'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                }`}>
                {s === 'all' ? 'Todos' : s === 'ok' ? 'Normal' : s === 'low' ? 'Bajo' : 'Crítico'}
              </button>
            ))}

            {/* Reset */}
            {(search || filterUnit || filterStatus !== 'all') && (
              <button onClick={() => { setSearch(''); setFilterUnit(''); setFilterStatus('all'); }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-xl transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}

            <p className="w-full text-xs text-gray-400 mt-1">
              Mostrando {filtered.length} de {inventory.length} insumos
            </p>
          </div>
        )}

        {/* Form crear/editar */}
        {(isCreating || editingItem) && (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 mb-6 border-2 border-blue-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{isCreating ? 'Agregar Nuevo Insumo' : 'Editar Insumo'}</h3>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del Insumo *</label>
                <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none" placeholder="Ej: Leche entera" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cantidad *</label>
                <input type="number" value={formData.quantity || ''} onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none" placeholder="0" min="0" step="0.1" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Unidad *</label>
                <select value={formData.unit || 'g'} onChange={e => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none">
                  {availableUnits.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Stock Mínimo (Alerta)</label>
                <input type="number" value={formData.minStock || ''} onChange={e => setFormData({ ...formData, minStock: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none" placeholder="100" min="0" />
                <p className="text-xs text-gray-500 mt-1">Alerta cuando el stock esté por debajo de este valor</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCancel} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors">
                <X className="w-5 h-5" /> Cancelar
              </button>
              <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg">
                <Save className="w-5 h-5" /> Guardar Insumo
              </button>
            </div>
          </div>
        )}

        {/* Restock modal */}
        {restockingItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Reabastecer Inventario</h3>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="font-semibold text-gray-800">{restockingItem.name}</p>
                <p className="text-sm text-gray-600 mt-1">Stock actual: <span className="font-semibold">{restockingItem.quantity} {restockingItem.unit}</span></p>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cantidad a agregar</label>
                <input type="number" value={restockAmount} onChange={e => setRestockAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-green-500 outline-none" placeholder="0" min="0" step="0.1" autoFocus />
                {restockAmount > 0 && (
                  <p className="text-sm text-green-600 mt-2">Nuevo stock: <span className="font-semibold">{restockingItem.quantity + restockAmount} {restockingItem.unit}</span></p>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setRestockingItem(null)} className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors">Cancelar</button>
                <button onClick={confirmRestock} disabled={restockAmount <= 0}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg disabled:opacity-50">
                  Reabastecer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista */}
        {!isCreating && !editingItem && (
          <>
            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No se encontraron insumos</p>
                <p className="text-sm mt-1">Intenta cambiar los filtros</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(item => {
                const status = getStockStatus(item);
                return (
                  <div key={item.id} className={`bg-gradient-to-br from-white to-gray-50 rounded-xl p-4 border-2 hover:shadow-lg transition-all ${
                    status.color === 'red' ? 'border-red-300' : status.color === 'yellow' ? 'border-yellow-300' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{item.name}</h3>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                          status.color === 'red' ? 'bg-red-100 text-red-700' : status.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-800 mb-1">{item.quantity} <span className="text-lg text-gray-500">{item.unit}</span></p>
                    <p className="text-xs text-gray-500 mb-3">Mínimo: {item.minStock || 100} {item.unit}</p>
                    {item.lastRestocked && <p className="text-xs text-gray-400 mb-3">Último reabasto: {new Date(item.lastRestocked).toLocaleDateString('es-MX')}</p>}
                    <button onClick={() => { setRestockingItem(item); setRestockAmount(0); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 transition-all">
                      <TrendingUp className="w-4 h-4" /> Reabastecer
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
